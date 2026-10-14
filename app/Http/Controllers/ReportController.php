<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use App\Models\Order;
use App\Models\Report;
use App\Models\User;
use App\Support\AttachmentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
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
     * Report a specific transaction. Either side of the order may do it;
     * the other party becomes the reported user. Admins can then compile
     * the order, chat, review and evidence into one report.
     */
    public function storeOrder(Request $request, Order $order): RedirectResponse
    {
        $userId = $request->user()->id;

        abort_unless(
            $order->buyer_id === $userId || $order->seller_id === $userId,
            403
        );

        return $this->createReport($request, [
            'listing_id' => $order->listing_id,
            'reported_user_id' => $order->buyer_id === $userId
                ? $order->seller_id
                : $order->buyer_id,
            'order_id' => $order->id,
        ], transaction: true);
    }

    private function createReport(
        Request $request,
        array $target,
        bool $transaction = false
    ): RedirectResponse {
        $reasons = $transaction ? Report::TRANSACTION_REASONS : Report::REASONS;

        $validated = $request->validate(
            [
                'reason' => ['required', Rule::in(array_keys($reasons))],
                'description' => $transaction
                    ? ['required', 'string', 'min:20', 'max:2000']
                    : ['nullable', 'string', 'max:1000'],
                ...($transaction ? AttachmentService::rules('attachments') : []),
            ],
            [
                'description.required' => 'Please describe what happened so it can be reviewed.',
                'description.min' => 'Please give a little more detail (at least 20 characters).',
                'attachments.max' => 'You can attach at most 5 files.',
                'attachments.*.max' => 'Each file must be 20 MB or smaller.',
                'attachments.*.mimes' => 'That file type is not supported. Use images, videos, PDF, Office documents or text.',
            ]
        );

        $alreadyOpen = Report::query()
            ->where('reporter_id', $request->user()->id)
            ->where('listing_id', $target['listing_id'])
            ->where('reported_user_id', $target['reported_user_id'])
            ->where('order_id', $target['order_id'])
            ->whereIn('status', ['pending', 'reviewing'])
            ->exists();

        if ($alreadyOpen) {
            return back()->with(
                'error',
                'You have already reported this. Our team is reviewing it.'
            );
        }

        $report = Report::create([
            ...$target,
            'reporter_id' => $request->user()->id,
            'reason' => $validated['reason'],
            'description' => filled($validated['description'] ?? null)
                ? trim($validated['description'])
                : null,
            'status' => 'pending',
        ]);

        if ($transaction) {
            AttachmentService::store(
                $report,
                $request->file('attachments', []),
                $request->user()->id,
                'reports'
            );
        }

        $message = $transaction
            ? 'Transaction report submitted. An administrator will review the order, your messages and any evidence you attached.'
            : 'Report submitted. Thank you for helping keep ACC Marketplace safe.';

        // If this report pushed the user over the auto-suspension threshold,
        // let the reporter know with a pop-up. Their profile is now hidden
        // from non-admins, so never send the reporter back to it.
        $reported = User::find($target['reported_user_id']);

        if ($reported?->isSuspended() && ! $request->user()->isAdmin()) {
            $onProfile = rtrim(url()->previous(), '/') === rtrim(url("/users/{$reported->id}"), '/');

            return ($onProfile ? redirect()->route('dashboard') : back())
                ->with('success', $message)
                ->with('suspended', ['name' => $reported->name]);
        }

        return back()->with('success', $message);
    }
}
