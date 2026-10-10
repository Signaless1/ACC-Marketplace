<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Listing;
use App\Models\Order;
use App\Models\Report;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

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
        ], array_keys(Report::REASONS));
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
        ], array_keys(Report::REASONS));
    }

    /**
     * Report a specific transaction. Only the buyer or the seller of the
     * order may do this; the other party becomes the reported user.
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
        ], array_keys(Report::TRANSACTION_REASONS));
    }

    /**
     * The compiled case file: everything an administrator (or the person
     * who filed it) needs to hand the matter to a figure of authority.
     * Printable from the browser as a PDF.
     */
    public function show(Request $request, Report $report): Response
    {
        $viewer = $request->user();
        $isAdmin = $viewer->isAdmin();

        abort_unless($isAdmin || $report->reporter_id === $viewer->id, 403);

        $report->load([
            'reporter:id,name,email,created_at',
            'reportedUser:id,name,email,created_at,suspended_at',
            'listing:id,title,price,quantity,status,type,user_id,hidden_at,removed_reason,created_at',
            'order.buyer:id,name,email',
            'order.seller:id,name,email',
            'reviewer:id,name',
        ]);

        $person = fn (?User $user) => $user ? [
            'id' => $user->id,
            'name' => $user->name,
            // Contact details are for administrators only.
            'email' => $isAdmin ? $user->email : null,
            'member_since' => $user->created_at,
            'suspended' => $user->suspended_at !== null,
        ] : null;

        $order = $report->order;

        return Inertia::render('Reports/Show', [
            'report' => [
                'id' => $report->id,
                'reference' => 'ACC-TR-'.str_pad((string) $report->id, 6, '0', STR_PAD_LEFT),
                'type' => $order ? 'transaction' : ($report->listing_id ? 'listing' : 'user'),
                'reason' => $report->reason,
                'reason_label' => Report::allReasons()[$report->reason] ?? $report->reason,
                'description' => $report->description,
                'status' => $report->status,
                'admin_note' => $isAdmin ? $report->admin_note : null,
                'filed_at' => $report->created_at,
                'reviewed_at' => $report->reviewed_at,
                'reviewed_by' => $report->reviewer?->name,
                'escalated_to' => $report->escalated_to,
                'escalation_note' => $report->escalation_note,
                'escalated_at' => $report->escalated_at,
            ],
            'reporter' => $person($report->reporter),
            'reportedUser' => $person($report->reportedUser),
            'listing' => $report->listing ? [
                'id' => $report->listing->id,
                'title' => $report->listing->title,
                'price' => $report->listing->price,
                'type' => $report->listing->type,
                'status' => $report->listing->status,
                'hidden' => $report->listing->hidden_at !== null,
                'posted_at' => $report->listing->created_at,
            ] : null,
            'order' => $order ? [
                'id' => $order->id,
                'status' => $order->status,
                'quantity' => $order->quantity,
                'unit_price' => $order->price,
                'total' => (float) $order->price * $order->quantity,
                'placed_at' => $order->created_at,
                'last_update_at' => $order->updated_at,
                'buyer' => $order->buyer?->name,
                'seller' => $order->seller?->name,
            ] : null,
            'review' => $order
                ? Review::query()
                    ->where('order_id', $order->id)
                    ->first(['rating', 'product_rating', 'comment', 'created_at'])
                : null,
            'transcript' => $this->transcript($report),
            'priorReports' => $isAdmin && $report->reported_user_id
                ? Report::query()
                    ->where('reported_user_id', $report->reported_user_id)
                    ->whereKeyNot($report->id)
                    ->count()
                : null,
            'isAdmin' => $isAdmin,
            'authorities' => Report::AUTHORITIES,
            'generatedAt' => now(),
            'generatedBy' => $viewer->name,
        ]);
    }

    /**
     * The conversation between the two people involved, oldest first.
     *
     * @return array<int, array<string, mixed>>
     */
    private function transcript(Report $report): array
    {
        $order = $report->order;

        $conversations = Conversation::query()
            ->when(
                $order,
                fn ($q) => $q
                    ->where('listing_id', $order->listing_id)
                    ->where('buyer_id', $order->buyer_id)
                    ->where('seller_id', $order->seller_id),
                fn ($q) => $q->where(function ($q) use ($report) {
                    $q->where(fn ($q) => $q
                        ->where('buyer_id', $report->reporter_id)
                        ->where('seller_id', $report->reported_user_id))
                        ->orWhere(fn ($q) => $q
                            ->where('seller_id', $report->reporter_id)
                            ->where('buyer_id', $report->reported_user_id));
                })
            )
            ->pluck('id');

        if ($conversations->isEmpty()) {
            return [];
        }

        return \App\Models\Message::query()
            ->whereIn('conversation_id', $conversations)
            ->with(['sender:id,name', 'attachments:id,attachable_id,attachable_type,original_name,kind'])
            ->orderBy('id')
            ->limit(500)
            ->get()
            ->map(fn ($message) => [
                'id' => $message->id,
                'sender' => $message->sender?->name,
                'sender_id' => $message->sender_id,
                'body' => $message->body,
                'sent_at' => $message->created_at,
                'attachments' => $message->attachments
                    ->map(fn ($a) => ['name' => $a->original_name, 'kind' => $a->kind])
                    ->values(),
            ])
            ->all();
    }

    /**
     * @param  array<int, string>  $allowedReasons
     */
    private function createReport(Request $request, array $target, array $allowedReasons): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['required', Rule::in($allowedReasons)],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

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

        Report::create([
            ...$target,
            'reporter_id' => $request->user()->id,
            'reason' => $validated['reason'],
            'description' => $validated['description'] ?? null,
            'status' => 'pending',
        ]);

        return back()->with(
            'success',
            'Report submitted. Thank you for helping keep ACC Marketplace safe.'
        );
    }
}
