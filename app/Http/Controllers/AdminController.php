<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Listing;
use App\Models\Message;
use App\Models\Order;
use App\Models\Report;
use App\Models\ReportEvent;
use App\Models\SuspensionAppeal;
use App\Models\User;
use App\Support\PhoneNumber;
use App\Support\ReportModeration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    /** The admin overview now lives on the main dashboard. */
    public function dashboard(): RedirectResponse
    {
        return redirect()->route('dashboard');
    }

    /*
    |--------------------------------------------------------------------------
    | Users
    |--------------------------------------------------------------------------
    */

    public function users(Request $request): Response
    {
        $search = trim((string) $request->query('q', ''));
        $status = $request->query('status', 'all');

        $users = User::query()
            ->withCount([
                'listings',
                'appeals as pending_appeals_count' => fn ($q) => $q->where('status', 'pending'),
            ])
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.$search.'%';
                // "0917 123 4567" finds the account stored as +639171234567.
                $phone = PhoneNumber::normalize($search);

                $q->where(fn ($q) => $q
                    ->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->when($phone !== null, fn ($q) => $q->orWhere('phone', $phone)));
            })
            ->when($status === 'suspended', fn ($q) => $q->whereNotNull('suspended_at'))
            ->when($status === 'active', fn ($q) => $q->whereNull('suspended_at'))
            ->latest()
            ->paginate(15)
            ->withQueryString()
            // The phone number is hidden on the model; admins are allowed to see it.
            ->through(fn (User $user) => $user->makeVisible('phone'));

        return Inertia::render('Admin/Users', [
            'users' => $users,
            'filters' => ['q' => $search, 'status' => $status],
        ]);
    }

    public function suspendUser(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id || $user->isAdmin()) {
            return back()->with('error', 'You cannot suspend this account.');
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:300'],
        ], [
            'reason.required' => 'Give a reason so the user knows why they were suspended.',
        ]);

        $user->forceFill([
            'suspended_at' => now(),
            'suspension_type' => 'manual',
            'suspension_reason' => $validated['reason'],
        ])->save();

        return back()->with('success', "{$user->name} has been suspended.");
    }

    public function unsuspendUser(User $user): RedirectResponse
    {
        $user->forceFill([
            'suspended_at' => null,
            'suspension_type' => null,
            'suspension_reason' => null,
            // A fresh start: reports filed before now no longer count towards
            // an automatic suspension, so reinstating is not instantly undone.
            'reinstated_at' => now(),
        ])->save();

        return back()->with('success', "{$user->name} has been reinstated.");
    }

    /*
    |--------------------------------------------------------------------------
    | Listings
    |--------------------------------------------------------------------------
    */

    public function listings(Request $request): Response
    {
        $search = trim((string) $request->query('q', ''));
        $visibility = $request->query('visibility', 'all');

        $listings = Listing::query()
            ->with(['seller:id,name,email', 'category:id,name', 'images', 'remover:id,name'])
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.$search.'%';
                $q->where(fn ($q) => $q
                    ->where('title', 'like', $like)
                    ->orWhereHas('seller', fn ($s) => $s->where('name', 'like', $like)));
            })
            ->when($visibility === 'removed', fn ($q) => $q->whereNotNull('hidden_at'))
            ->when($visibility === 'visible', fn ($q) => $q->whereNull('hidden_at'))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Listings', [
            'listings' => $listings,
            'filters' => ['q' => $search, 'visibility' => $visibility],
            'reasons' => Listing::REMOVAL_REASONS,
        ]);
    }

    /**
     * Take a listing down with a stated reason. This does NOT suspend the
     * seller; suspending is a separate, deliberate action.
     */
    public function removeListing(Request $request, Listing $listing): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['required', Rule::in(array_keys(Listing::REMOVAL_REASONS))],
            'note' => [
                'nullable',
                'string',
                'max:500',
                Rule::requiredIf(fn () => $request->input('reason') === 'other'),
            ],
        ], [
            'reason.required' => 'Choose a reason for removing this listing.',
            'note.required' => 'Add a short note explaining the reason.',
        ]);

        $this->applyRemoval($listing, $validated['reason'], $validated['note'] ?? null, $request->user());

        return back()->with('success', 'Listing removed. The seller can see the reason.');
    }

    public function restoreListing(Listing $listing): RedirectResponse
    {
        $listing->update([
            'hidden_at' => null,
            'removed_reason' => null,
            'removed_note' => null,
            'removed_by' => null,
        ]);

        return back()->with('success', 'Listing restored.');
    }

    public function destroyListing(Listing $listing): RedirectResponse
    {
        $listing->load('images');

        foreach ($listing->images as $image) {
            Storage::disk('public')->delete($image->path);
        }

        $listing->delete();

        return back()->with('success', 'Listing deleted permanently.');
    }

    /*
    |--------------------------------------------------------------------------
    | Transactions
    |--------------------------------------------------------------------------
    */

    public function orders(Request $request): Response
    {
        $search = trim((string) $request->query('q', ''));
        $status = $request->query('status', 'all');

        $orders = Order::query()
            ->with(['listing:id,title', 'buyer:id,name', 'seller:id,name'])
            ->withCount('reports')
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.$search.'%';
                $q->where(function ($q) use ($like, $search) {
                    $q->whereHas('listing', fn ($l) => $l->where('title', 'like', $like))
                        ->orWhereHas('buyer', fn ($b) => $b->where('name', 'like', $like))
                        ->orWhereHas('seller', fn ($s) => $s->where('name', 'like', $like));

                    // Allow searching by order number: "ACC-000042" or "42".
                    $digits = ltrim(preg_replace('/\D/', '', $search) ?? '', '0');
                    if ($digits !== '') {
                        $q->orWhere('id', (int) $digits);
                    }
                });
            })
            ->when(
                in_array($status, ['pending', 'confirmed', 'completed', 'cancelled'], true),
                fn ($q) => $q->where('status', $status)
            )
            ->when($status === 'reported', fn ($q) => $q->has('reports'))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Orders', [
            'orders' => $orders,
            'filters' => ['q' => $search, 'status' => $status],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Reports
    |--------------------------------------------------------------------------
    */

    public function reports(Request $request): Response
    {
        $status = $request->query('status', 'pending');

        if (! in_array($status, [...Report::STATUSES, 'all'], true)) {
            $status = 'pending';
        }

        $reports = Report::query()
            ->with([
                'reporter:id,name,created_at',
                'listing:id,title,hidden_at,user_id,removed_reason',
                'reportedUser:id,name,suspended_at,suspension_type',
                'reviewer:id,name',
                'order:id,listing_id,buyer_id,seller_id,price,quantity,status,created_at',
                'order.buyer:id,name',
                'order.seller:id,name',
            ])
            ->withCount('attachments as evidence_count')
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        // How trustworthy is each reporter on this page? One grouped query,
        // not one per report.
        $reporterIds = $reports->getCollection()->pluck('reporter_id')->unique()->values();

        $standing = $reporterIds->isEmpty()
            ? collect()
            : Report::query()
                ->whereIn('reporter_id', $reporterIds)
                ->selectRaw(
                    "reporter_id,
                     COUNT(*) as filed,
                     SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as upheld,
                     SUM(CASE WHEN status = 'dismissed' THEN 1 ELSE 0 END) as dismissed,
                     SUM(CASE WHEN bad_faith = ? THEN 1 ELSE 0 END) as false_reports",
                    [true]
                )
                ->groupBy('reporter_id')
                ->get()
                ->keyBy('reporter_id');

        // And how close is each reported person to an automatic suspension?
        $qualifying = $reports->getCollection()
            ->map(fn (Report $report) => $report->reportedUser)
            ->filter()
            ->unique('id')
            ->mapWithKeys(fn (User $user) => [
                $user->id => ReportModeration::qualifyingReporterCount(
                    User::query()->find($user->id)
                ),
            ]);

        $reports->through(function (Report $report) use ($standing, $qualifying) {
            $row = $standing->get($report->reporter_id);

            $report->setAttribute('reporter_standing', [
                'account_age_days' => $report->reporter
                    ? (int) $report->reporter->created_at->diffInDays(now(), true)
                    : null,
                'filed' => (int) ($row->filed ?? 0),
                'upheld' => (int) ($row->upheld ?? 0),
                'dismissed' => (int) ($row->dismissed ?? 0),
                'false_reports' => (int) ($row->false_reports ?? 0),
            ]);

            $report->setAttribute('qualifying_reports', $qualifying->get($report->reported_user_id));

            return $report;
        });

        $counts = Report::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $appeals = SuspensionAppeal::query()
            ->pending()
            ->with('user:id,name,email,suspended_at,suspension_type,suspension_reason')
            ->oldest()
            ->get();

        return Inertia::render('Admin/Reports', [
            'reports' => $reports,
            'status' => $status,
            'counts' => $counts,
            'reasons' => Report::allReasons(),
            'removalReasons' => Listing::REMOVAL_REASONS,
            'appeals' => $appeals,
            'autoSuspend' => [
                'threshold' => ReportModeration::threshold(),
                'window_days' => ReportModeration::windowDays(),
            ],
        ]);
    }

    /**
     * Everything an admin needs to judge one report fairly, loaded only when
     * the case file is opened: the chat around it (including messages that were
     * deleted, clearly marked), both people's evidence, and the full history.
     */
    public function reportCase(Report $report): JsonResponse
    {
        $report->load(['order:id,listing_id,buyer_id,seller_id']);

        $conversation = $report->order
            ? Conversation::query()
                ->where('listing_id', $report->order->listing_id)
                ->where('buyer_id', $report->order->buyer_id)
                ->where('seller_id', $report->order->seller_id)
                ->first()
            : Conversation::query()
                ->where(function ($q) use ($report) {
                    $q->where(fn ($w) => $w
                        ->where('buyer_id', $report->reporter_id)
                        ->where('seller_id', $report->reported_user_id))
                        ->orWhere(fn ($w) => $w
                            ->where('buyer_id', $report->reported_user_id)
                            ->where('seller_id', $report->reporter_id));
                })
                ->when($report->listing_id, fn ($q) => $q->where('listing_id', $report->listing_id))
                ->latest('id')
                ->first();

        $messages = $conversation
            ? $conversation->messages()
                ->with(['sender:id,name', 'attachments'])
                ->latest('id')
                ->take(40)
                ->get()
                ->reverse()
                ->values()
                ->map(fn (Message $message) => [
                    'id' => $message->id,
                    'sender' => $message->sender?->name,
                    'sender_id' => $message->sender_id,
                    'body' => $message->body,
                    'at' => $message->created_at,
                    // Set when the sender deleted it for everyone. Admins can
                    // still read it; the other person never could after that.
                    'deleted_for_everyone_at' => $message->deleted_for_everyone_at,
                    'attachments' => $message->attachments->map(fn ($a) => [
                        'id' => $a->id,
                        'url' => $a->url,
                        'name' => $a->original_name,
                        'kind' => $a->kind,
                    ])->values(),
                ])
            : collect();

        $evidence = $report->attachments()->get()->map(fn ($a) => [
            'id' => $a->id,
            'url' => $a->url,
            'name' => $a->original_name,
            'kind' => $a->kind,
            'size' => $a->human_size,
            'by' => $a->user_id === $report->reporter_id
                ? 'reporter'
                : ($a->user_id === $report->reported_user_id ? 'reported person' : 'unknown'),
        ])->values();

        $events = ReportEvent::query()
            ->where('report_id', $report->id)
            ->with('user:id,name')
            ->oldest('id')
            ->get()
            ->map(fn (ReportEvent $event) => [
                'id' => $event->id,
                'event' => $event->event,
                'by' => $event->user?->name,
                'note' => $event->note,
                'at' => $event->created_at,
            ])
            ->values();

        $respondent = $report->reported_user_id
            ? User::query()->find($report->reported_user_id)
            : null;

        $history = $respondent ? [
            'reports_total' => Report::query()->where('reported_user_id', $respondent->id)->count(),
            'reports_upheld' => Report::query()
                ->where('reported_user_id', $respondent->id)
                ->where('status', 'resolved')
                ->count(),
            'reports_dismissed' => Report::query()
                ->where('reported_user_id', $respondent->id)
                ->where('status', 'dismissed')
                ->count(),
            'qualifying_reporters' => ReportModeration::qualifyingReporterCount($respondent),
            'completed_orders' => Order::query()
                ->where(fn ($q) => $q->where('buyer_id', $respondent->id)->orWhere('seller_id', $respondent->id))
                ->where('status', 'completed')
                ->count(),
            'phone' => $respondent->phone,
            'member_since' => $respondent->created_at,
        ] : null;

        return response()->json([
            'messages' => $messages,
            'evidence' => $evidence,
            'events' => $events,
            'history' => $history,
        ]);
    }

    public function updateReport(Request $request, Report $report): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(Report::STATUSES)],
            // Private working note, for admins only.
            'admin_note' => ['nullable', 'string', 'max:1000'],
            // What the reporter AND the reported person are told about the outcome.
            'decision_note' => ['nullable', 'string', 'max:1000'],
            // A dismissed report that was false or malicious. It counts against
            // whoever filed it (see ReportModeration::blockedFromReporting).
            'bad_faith' => ['nullable', 'boolean'],

            'escalated_to' => [
                'nullable',
                'string',
                'max:150',
                Rule::requiredIf(fn () => $request->input('status') === 'escalated'),
            ],

            // Each action is explicit and carries its own reason.
            'remove_listing' => ['nullable', 'boolean'],
            'removal_reason' => [
                'nullable',
                Rule::in(array_keys(Listing::REMOVAL_REASONS)),
                Rule::requiredIf(fn () => $request->boolean('remove_listing')),
            ],
            'removal_note' => ['nullable', 'string', 'max:500'],

            'suspend_user' => ['nullable', 'boolean'],
            'suspension_reason' => [
                'nullable',
                'string',
                'max:300',
                Rule::requiredIf(fn () => $request->boolean('suspend_user')),
            ],
        ], [
            'escalated_to.required' => 'Say who the report is being escalated to (office or person).',
            'removal_reason.required' => 'Pick a reason for removing the listing.',
            'suspension_reason.required' => 'Give a reason for suspending the user.',
        ]);

        $admin = $request->user();
        $previousStatus = $report->status;
        $falseReport = $validated['status'] === 'dismissed' && $request->boolean('bad_faith');

        if ($request->boolean('remove_listing') && $report->listing) {
            $this->applyRemoval(
                $report->listing,
                $validated['removal_reason'],
                $validated['removal_note'] ?? null,
                $admin
            );
        }

        if ($request->boolean('suspend_user') && $report->reportedUser) {
            $target = $report->reportedUser;

            if (! $target->isAdmin() && $target->id !== $admin->id) {
                // A deliberate admin decision. Marking it "manual" also confirms
                // an automatic suspension: the algorithm will never lift it.
                $target->forceFill([
                    'suspended_at' => now(),
                    'suspension_type' => 'manual',
                    'suspension_reason' => $validated['suspension_reason'],
                ])->save();
            }
        }

        $update = [
            'status' => $validated['status'],
            'admin_note' => $validated['admin_note'] ?? $report->admin_note,
            'decision_note' => $validated['decision_note'] ?? $report->decision_note,
            'bad_faith' => $falseReport,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ];

        if ($validated['status'] === 'escalated') {
            $update['escalated_to'] = $validated['escalated_to'];
            $update['escalated_at'] = $report->escalated_at ?? now();
        }

        $report->update($update);

        ReportEvent::record(
            $report,
            in_array($previousStatus, ['resolved', 'dismissed'], true)
                && in_array($validated['status'], Report::OPEN_STATUSES, true)
                    ? 'reopened'
                    : $validated['status'],
            $admin->id,
            $falseReport ? 'Marked as a false report.' : null
        );

        // The decision may change the picture: dismissing a report can bring an
        // automatically suspended person back under the threshold, which lifts
        // the suspension; reopening one can push them over it.
        $change = ReportModeration::evaluate($report->reportedUser, $report);

        $message = 'Report updated.';

        if ($change === 'lifted') {
            $message .= ' The automatic suspension was lifted because fewer than '
                .ReportModeration::threshold().' valid reports remain.';
        } elseif ($change === 'suspended') {
            $message .= ' The reported person was suspended automatically because '
                .ReportModeration::threshold().' or more different people reported them.';
        }

        return back()->with('success', $message);
    }

    /**
     * Decide a suspended person's appeal. Accepting reinstates them; refusing
     * needs a reason they will be able to read.
     */
    public function decideAppeal(Request $request, SuspensionAppeal $appeal): RedirectResponse
    {
        if ($appeal->status !== 'pending') {
            return back()->with('error', 'This appeal has already been decided.');
        }

        $validated = $request->validate([
            'decision' => ['required', Rule::in(['accept', 'deny'])],
            'note' => [
                'nullable',
                'string',
                'max:500',
                Rule::requiredIf(fn () => $request->input('decision') === 'deny'),
            ],
        ], [
            'note.required' => 'Tell the person why the suspension stays.',
        ]);

        $accepted = $validated['decision'] === 'accept';

        DB::transaction(function () use ($appeal, $validated, $accepted, $request) {
            if ($accepted && $appeal->user) {
                $appeal->user->forceFill([
                    'suspended_at' => null,
                    'suspension_type' => null,
                    'suspension_reason' => null,
                    'reinstated_at' => now(),
                ])->save();
            }

            $appeal->update([
                'status' => $accepted ? 'accepted' : 'denied',
                'decided_by' => $request->user()->id,
                'decided_at' => now(),
                'decision_note' => $validated['note'] ?? null,
            ]);
        });

        return back()->with(
            'success',
            $accepted ? 'Appeal accepted. The account has been reinstated.' : 'Appeal refused.'
        );
    }

    private function applyRemoval(Listing $listing, string $reason, ?string $note, User $admin): void
    {
        $listing->update([
            'hidden_at' => now(),
            'removed_reason' => $reason,
            'removed_note' => $note,
            'removed_by' => $admin->id,
        ]);
    }
}
