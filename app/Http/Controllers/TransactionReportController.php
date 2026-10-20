<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Report;
use App\Support\ReportModeration;
use App\Support\TransactionSummary;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class TransactionReportController extends Controller
{
    /**
     * The compiled transaction document (printable) plus the form to report it
     * to the marketplace admins. Filing the report itself is handled by
     * ReportController::storeOrder, shared with listing and user reports.
     */
    public function show(Request $request, Order $order): Response
    {
        Gate::authorize('report', $order);

        $user = $request->user();

        $role = $user->isAdmin()
            ? 'admin'
            : ($order->buyer_id === $user->id ? 'buyer' : 'seller');

        $openReport = Report::query()
            ->where('order_id', $order->id)
            ->where('reporter_id', $user->id)
            ->whereIn('status', Report::OPEN_STATUSES)
            ->latest()
            ->first(['id', 'status', 'reason', 'created_at']);

        // A report the OTHER side filed about this transaction: they are owed an
        // answer, so point them to where they can give it.
        $reportAgainstMe = $user->isAdmin()
            ? null
            : Report::query()
                ->where('order_id', $order->id)
                ->where('reported_user_id', $user->id)
                ->whereIn('status', Report::OPEN_STATUSES)
                ->latest()
                ->first(['id', 'status', 'respondent_statement']);

        $blockedReason = $user->isAdmin() ? null : ReportModeration::blockedFromReporting($user);

        return Inertia::render('Orders/TransactionReport', [
            'summary' => TransactionSummary::for($order, $user),
            // Each side is offered the reasons that make sense for their role.
            'reasons' => $role === 'admin'
                ? Report::TRANSACTION_REASONS
                : Report::transactionReasonsFor($role),
            'viewerRole' => $role,
            'canSubmit' => ! $user->isAdmin() && $openReport === null && $blockedReason === null,
            'blockedReason' => $blockedReason,
            'openReport' => $openReport,
            'reportAgainstMe' => $reportAgainstMe ? [
                'id' => $reportAgainstMe->id,
                'status' => $reportAgainstMe->status,
                'responded' => $reportAgainstMe->respondent_statement !== null,
            ] : null,
        ]);
    }
}
