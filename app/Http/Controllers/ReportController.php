<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use App\Models\Order;
use App\Models\Report;
use App\Models\ReportEvent;
use App\Models\User;
use App\Support\Attachments;
use App\Support\ReportModeration;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Reports are meant to be fair to BOTH people involved:
 *
 *  - the reporter is asked for reasons that fit their role (a seller cannot
 *    say "item not received"), gives details, and may attach evidence;
 *  - the reported person is told a report exists and may answer it once,
 *    with their own evidence, before an admin decides;
 *  - the same machinery is rate limited, deduplicated and tracked, so a false
 *    report costs the person who filed it, not only the person it was about.
 */
class ReportController extends Controller
{
    private const MAX_FILES = 5;

    /*
    |--------------------------------------------------------------------------
    | Filing a report
    |--------------------------------------------------------------------------
    */

    public function storeListing(Request $request, Listing $listing): RedirectResponse
    {
        if ($listing->user_id === $request->user()->id) {
            return back()->with('error', 'You cannot report your own listing.');
        }

        return $this->createReport($request, [
            'listing_id' => $listing->id,
            'reported_user_id' => $listing->user_id,
            'order_id' => null,
        ]);
    }

    public function storeUser(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'You cannot report yourself.');
        }

        return $this->createReport($request, [
            'listing_id' => null,
            'reported_user_id' => $user->id,
            'order_id' => null,
        ]);
    }

    /**
     * Report a specific transaction. Either side of the order may do it; the
     * other party becomes the reported person. Admins then see the order, the
     * chat, both statements and the evidence in one place.
     */
    public function storeOrder(Request $request, Order $order): RedirectResponse
    {
        Gate::authorize('report', $order);

        $user = $request->user();

        if ($user->isAdmin()) {
            return back()->with('error', 'Admins review reports from the Reports page.');
        }

        $role = $order->buyer_id === $user->id ? 'buyer' : 'seller';

        return $this->createReport($request, [
            'listing_id' => $order->listing_id,
            'reported_user_id' => $role === 'buyer' ? $order->seller_id : $order->buyer_id,
            'order_id' => $order->id,
        ], $order, $role);
    }

    /**
     * @param  array{listing_id: int|null, reported_user_id: int|null, order_id: int|null}  $target
     */
    private function createReport(
        Request $request,
        array $target,
        ?Order $order = null,
        ?string $role = null
    ): RedirectResponse {
        $user = $request->user();
        $transaction = $order !== null;

        // Brakes first: a daily cap, and a pause for people whose reports an
        // admin keeps finding to be false.
        if ($blocked = ReportModeration::blockedFromReporting($user)) {
            return back()->with('error', $blocked);
        }

        $reasons = $transaction
            ? Report::transactionReasonsFor((string) $role)
            : Report::REASONS;

        $minLength = (int) config('marketplace.reports.min_details_length', 20);

        $validated = $request->validate(
            [
                'reason' => ['required', Rule::in(array_keys($reasons))],
                'description' => $transaction
                    ? ['required', 'string', 'min:'.$minLength, 'max:2000']
                    : ['nullable', 'string', 'min:'.$minLength, 'max:1000'],
                ...Attachments::rules('attachments', self::MAX_FILES, Attachments::REVIEW_TYPES),
            ],
            [
                'description.required' => 'Please describe what happened so it can be reviewed.',
                'description.min' => "Please give a little more detail (at least {$minLength} characters).",
                ...Attachments::messages('attachments', self::MAX_FILES, Attachments::REVIEW_TYPES),
            ]
        );

        // Only a buyer whose order the seller accepted can say nothing arrived.
        if (
            $transaction
            && $validated['reason'] === 'item_not_received'
            && ! in_array($order->status, ['confirmed', 'completed'], true)
        ) {
            return back()->with(
                'error',
                'You can report an item as not received once the seller has confirmed the order.'
            );
        }

        $alreadyOpen = Report::query()
            ->where('reporter_id', $user->id)
            ->where('listing_id', $target['listing_id'])
            ->where('reported_user_id', $target['reported_user_id'])
            ->where('order_id', $target['order_id'])
            ->whereIn('status', Report::OPEN_STATUSES)
            ->exists();

        if ($alreadyOpen) {
            return back()->with(
                'error',
                'You have already reported this. Our team is reviewing it.'
            );
        }

        if (! $transaction && ReportModeration::recentlyDismissed($user, $target)) {
            $days = (int) config('marketplace.reports.refile_cooldown_days', 7);

            return back()->with(
                'error',
                "An administrator recently reviewed a report from you about this and did not uphold it. You can report it again after {$days} days, or sooner if it concerns something new."
            );
        }

        $report = DB::transaction(function () use ($user, $target, $role, $validated) {
            $report = Report::create([
                ...$target,
                'reporter_id' => $user->id,
                'reporter_role' => $role,
                'reason' => $validated['reason'],
                'description' => filled($validated['description'] ?? null)
                    ? trim($validated['description'])
                    : null,
                'status' => 'pending',
            ]);

            ReportEvent::record($report, 'filed', $user->id);

            return $report;
        });

        // Evidence is private: stored on the local disk and opened only through
        // AttachmentController by whoever uploaded it and by admins.
        Attachments::store(
            $report,
            $request->file('attachments', []),
            'local',
            "report-evidence/{$report->id}",
            $user->id
        );

        // May suspend the reported account if enough different people have
        // now reported it. See ReportModeration for every safeguard.
        ReportModeration::evaluate($report->reportedUser, $report);

        return back()->with(
            'success',
            $transaction
                ? 'Report submitted. The other person has been told and can give their side; an administrator will read both before deciding.'
                : 'Report submitted. Thank you for helping keep ACC Marketplace safe.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Following your reports, and answering ones filed about you
    |--------------------------------------------------------------------------
    */

    public function index(Request $request): Response
    {
        $uid = $request->user()->id;
        $labels = Report::allReasons();

        $filed = Report::query()
            ->where('reporter_id', $uid)
            ->with(['listing:id,title', 'reportedUser:id,name'])
            ->latest()
            ->get()
            ->map(fn (Report $report) => [
                'id' => $report->id,
                'kind' => $this->kindOf($report),
                'reason' => $labels[$report->reason] ?? $report->reason,
                'description' => $report->description,
                'status' => $report->status,
                'outcome' => $report->outcomeLabel(),
                // Only once decided; the internal admin note is never sent.
                'decision_note' => $report->isOpen() ? null : $report->decision_note,
                'target' => $report->listing?->title ?? $report->reportedUser?->name ?? 'Deleted item',
                'order_id' => $report->order_id,
                'other_responded' => $report->respondent_statement !== null,
                'created_at' => $report->created_at,
                'reviewed_at' => $report->reviewed_at,
            ])
            ->values();

        $against = Report::query()
            ->where('reported_user_id', $uid)
            ->with(['listing:id,title', 'reporter:id,name'])
            ->latest()
            ->get()
            ->map(fn (Report $report) => [
                'id' => $report->id,
                'kind' => $this->kindOf($report),
                'reason' => $labels[$report->reason] ?? $report->reason,
                'description' => $report->description,
                'status' => $report->status,
                // The reported person is told "not upheld". Whether the report was
                // also judged false is between the admin and the reporter: saying so
                // here would only invite retaliation against whoever spoke up.
                'outcome' => $report->status === 'dismissed' ? 'Not upheld' : $report->outcomeLabel(),
                'decision_note' => $report->isOpen() ? null : $report->decision_note,
                // In a transaction both people already know each other. For a
                // report about a listing or a profile the reporter stays anonymous,
                // so nobody is exposed to retaliation for speaking up.
                'reporter' => $report->order_id ? $report->reporter?->name : null,
                'target' => $report->listing?->title ?? 'Your profile',
                'order_id' => $report->order_id,
                'my_statement' => $report->respondent_statement,
                'responded_at' => $report->responded_at,
                'can_respond' => $report->isOpen() && $report->respondent_statement === null,
                'created_at' => $report->created_at,
                'reviewed_at' => $report->reviewed_at,
            ])
            ->values();

        return Inertia::render('Reports/Index', [
            'filed' => $filed,
            'against' => $against,
        ]);
    }

    /**
     * The reported person's side of the story. One statement per report, so the
     * record an admin reads is the one that existed when the decision was made.
     */
    public function respond(Request $request, Report $report): RedirectResponse
    {
        $user = $request->user();

        abort_unless($report->reported_user_id === $user->id, 403);

        if (! $report->isOpen()) {
            return back()->with('error', 'This report has already been decided.');
        }

        if ($report->respondent_statement !== null) {
            return back()->with('error', 'You have already responded to this report.');
        }

        $minLength = (int) config('marketplace.reports.min_details_length', 20);

        $validated = $request->validate(
            [
                'statement' => ['required', 'string', 'min:'.$minLength, 'max:2000'],
                ...Attachments::rules('attachments', self::MAX_FILES, Attachments::REVIEW_TYPES),
            ],
            [
                'statement.required' => 'Write your side of what happened.',
                'statement.min' => "Please give a little more detail (at least {$minLength} characters).",
                ...Attachments::messages('attachments', self::MAX_FILES, Attachments::REVIEW_TYPES),
            ]
        );

        $report->update([
            'respondent_statement' => trim($validated['statement']),
            'responded_at' => now(),
        ]);

        ReportEvent::record($report, 'responded', $user->id);

        Attachments::store(
            $report,
            $request->file('attachments', []),
            'local',
            "report-evidence/{$report->id}",
            $user->id
        );

        return back()->with(
            'success',
            'Your response was added. An administrator will read both sides before deciding.'
        );
    }

    private function kindOf(Report $report): string
    {
        return $report->order_id
            ? 'transaction'
            : ($report->listing_id ? 'listing' : 'user');
    }
}
