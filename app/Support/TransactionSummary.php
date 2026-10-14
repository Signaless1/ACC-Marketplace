<?php

namespace App\Support;

use App\Models\Conversation;
use App\Models\Order;
use App\Models\Report;
use App\Models\User;

/**
 * Compiles everything known about one transaction into a single document:
 * who, what, when, the full chat between the two parties, and any reports.
 * It is shown to the parties and admins, and can be printed or saved as a
 * PDF to hand to a figure of authority.
 */
class TransactionSummary
{
    /**
     * @param  User|null  $viewer  Who is reading the document. Admins see every
     *                             message, including ones the sender deleted
     *                             (flagged as deleted) because a deleted message
     *                             can still be evidence. Everyone else sees the
     *                             chat exactly as they saw it: messages they hid
     *                             for themselves are left out and messages
     *                             deleted for everyone appear without content.
     * @return array<string, mixed>
     */
    public static function for(Order $order, ?User $viewer = null): array
    {
        $isAdmin = $viewer?->isAdmin() === true;

        $order->loadMissing([
            'listing.category',
            'buyer:id,name,email,created_at',
            'seller:id,name,email,created_at',
            'canceller:id,name',
            'review',
        ]);

        $listing = $order->listing;

        $conversation = Conversation::query()
            ->where('listing_id', $order->listing_id)
            ->where('buyer_id', $order->buyer_id)
            ->where('seller_id', $order->seller_id)
            ->first();

        $messages = $conversation
            ? $conversation->messages()
                ->with(['sender:id,name', 'attachments'])
                ->when(! $isAdmin, fn ($q) => $q->visibleTo((int) $viewer?->id))
                ->oldest()
                ->take(500)
                ->get()
                ->map(function ($m) use ($order, $isAdmin) {
                    $deleted = $m->deleted_for_everyone_at !== null;
                    $showContent = $isAdmin || ! $deleted;

                    return [
                        'id' => $m->id,
                        'sender' => $m->sender?->name,
                        'role' => $m->sender_id === $order->buyer_id ? 'buyer' : 'seller',
                        'body' => $showContent ? $m->body : null,
                        'at' => $m->created_at,
                        'deleted' => $deleted,
                        'attachments' => $showContent
                            ? $m->attachments->map(fn ($a) => [
                                'name' => $a->original_name,
                                'kind' => $a->kind,
                                'size' => $a->human_size,
                            ])->values()
                            : collect(),
                    ];
                })->values()
            : collect();

        $timeline = collect([
            ['label' => 'Order placed', 'at' => $order->created_at, 'by' => $order->buyer?->name],
            $order->confirmed_at
                ? ['label' => 'Confirmed by seller', 'at' => $order->confirmed_at, 'by' => $order->seller?->name]
                : null,
            $order->completed_at
                ? ['label' => 'Marked as completed', 'at' => $order->completed_at, 'by' => null]
                : null,
            $order->cancelled_at
                ? [
                    'label' => 'Cancelled',
                    'at' => $order->cancelled_at,
                    'by' => $order->canceller?->name,
                    'note' => $order->cancel_reason,
                ]
                : null,
            $order->review
                ? ['label' => 'Buyer left a review', 'at' => $order->review->created_at, 'by' => $order->buyer?->name]
                : null,
        ])->filter()->sortBy('at')->values();

        $reports = Report::query()
            ->where('order_id', $order->id)
            ->with(['reporter:id,name', 'reviewer:id,name'])
            ->oldest()
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'reporter' => $r->reporter?->name,
                'reason' => Report::allReasons()[$r->reason] ?? $r->reason,
                'description' => $r->description,
                'status' => $r->status,
                'filed_at' => $r->created_at,
                'escalated_to' => $r->escalated_to,
                'escalated_at' => $r->escalated_at,
                'admin_note' => $r->admin_note,
            ]);

        return [
            'reference' => 'TR-'.$order->created_at->format('Y').'-'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT),
            'generated_at' => now(),
            'order' => [
                'id' => $order->id,
                'reference' => $order->reference,
                'status' => $order->status,
                'quantity' => $order->quantity,
                'unit_price' => $order->price,
                'total' => $order->total,
                'placed_at' => $order->created_at,
                'cancel_reason' => $order->cancel_reason,
            ],
            'listing' => $listing ? [
                'id' => $listing->id,
                'title' => $listing->title,
                'category' => $listing->category?->name,
                'type' => $listing->type,
                'condition' => $listing->condition,
                'current_price' => $listing->price,
                'removed' => $listing->hidden_at !== null,
                'removed_reason' => $listing->removed_reason_label,
            ] : null,
            'buyer' => [
                'id' => $order->buyer?->id,
                'name' => $order->buyer?->name,
                'email' => $order->buyer?->email,
                'member_since' => $order->buyer?->created_at,
            ],
            'seller' => [
                'id' => $order->seller?->id,
                'name' => $order->seller?->name,
                'email' => $order->seller?->email,
                'member_since' => $order->seller?->created_at,
            ],
            'timeline' => $timeline,
            'messages' => $messages,
            'reports' => $reports,
        ];
    }
}
