<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Report;
use App\Support\TransactionSummary;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TransactionReportController extends Controller
{
    /**
     * The compiled transaction document (printable) plus the form to
     * report it to the marketplace admins.
     */
    public function show(Request $request, Order $order): Response
    {
        Gate::authorize('report', $order);

        $user = $request->user();

        $openReport = Report::query()
            ->where('order_id', $order->id)
            ->where('reporter_id', $user->id)
            ->whereIn('status', ['pending', 'reviewing', 'escalated'])
            ->latest()
            ->first(['id', 'status', 'reason', 'created_at']);

        return Inertia::render('Orders/TransactionReport', [
            'summary' => TransactionSummary::for($order, $user),
            'reasons' => Report::TRANSACTION_REASONS,
            'viewerRole' => $user->isAdmin()
                ? 'admin'
                : ($order->buyer_id === $user->id ? 'buyer' : 'seller'),
            'canSubmit' => ! $user->isAdmin() && $openReport === null,
            'openReport' => $openReport,
        ]);
    }

    public function store(Request $request, Order $order): RedirectResponse
    {
        Gate::authorize('report', $order);

        $user = $request->user();

        if ($user->isAdmin()) {
            return back()->with('error', 'Admins review reports from the Reports page.');
        }

        $validated = $request->validate([
            'reason' => ['required', Rule::in(array_keys(Report::TRANSACTION_REASONS))],
            'description' => ['required', 'string', 'min:20', 'max:2000'],
        ], [
            'description.required' => 'Describe what happened so the admins can investigate.',
            'description.min' => 'Please give a little more detail (at least 20 characters).',
        ]);

        $alreadyOpen = Report::query()
            ->where('order_id', $order->id)
            ->where('reporter_id', $user->id)
            ->whereIn('status', ['pending', 'reviewing', 'escalated'])
            ->exists();

        if ($alreadyOpen) {
            return back()->with('error', 'You already have an open report for this transaction.');
        }

        $otherPartyId = $order->buyer_id === $user->id
            ? $order->seller_id
            : $order->buyer_id;

        Report::create([
            'reporter_id' => $user->id,
            'order_id' => $order->id,
            'listing_id' => $order->listing_id,
            'reported_user_id' => $otherPartyId,
            'reason' => $validated['reason'],
            'description' => $validated['description'],
            'status' => 'pending',
        ]);

        return back()->with(
            'success',
            'Transaction report sent to the admins. You can also print or save it as a PDF below.'
        );
    }
}
