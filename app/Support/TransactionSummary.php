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
     * What the document shows depends on who is reading it:
     *
     *  - Admins see everything, including messages that were deleted (marked
     *    as such) and each person's phone number, so a dispute can be judged.
     *  - The two people involved see their own conversation as they see it in
     *    the chat: messages they deleted for themselves are gone, and messages
     *    deleted for everyone appear only as "deleted". Each of them sees their
     *    own email but not the other person's, and never a phone number.
     *
     * @return array<string, mixed>
     */
    public static function for(Order $order, ?User $viewer = null): array
    {
        $isAdmin = $viewer?->isAdmin() ?? false;

        $order->loadMissing([
            'listing.category',
            'buyer:id,name,email,phone,created_at',
            'seller:id,name,email,phone,created_at',
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
                ->when(
                    $viewer !== null && ! $isAdmin,
                    fn ($query) => $query->visibleTo($viewer->id)
                )
                ->with(['sender:id,name', 'attachments'])
                ->oldest()
                ->orderBy('id')
                ->take(500)
                ->get()
                ->map(function ($m) use ($order, $isAdmin) {
                    $deleted = $m->isDeletedForEveryone();
                    $hidden = $deleted && ! $isAdmin;

                    return [
                        'id' => $m->id,
                        'sender' => $m->sender?->name,
                        'role' => $m->sender_id === $order->buyer_id ? 'buyer' : 'seller',
                        'body' => $hidden ? null : $m->body,
                        'at' => $m->created_at,
                        // Admins can still read it, but it is flagged so nobody
                        // mistakes it for a message both people could see.
                        'deleted' => $deleted,
                        'deleted_at' => $deleted && $isAdmin ? $m->deleted_for_everyone_at : null,
                        'attachments' => $hidden
                            ? collect()
                            : $m->attachments->map(fn ($a) => [
                                'name' => $a->original_name,
                                'kind' => $a->kind,
                                'size' => $a->human_size,
                            ])->values(),
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
                // "Dismissed as a false report" is only shown to admins and to the
                // person who filed it; the other side just sees "Not upheld".
                'outcome' => ($r->status === 'dismissed' && ! $isAdmin && $viewer?->id !== $r->reporter_id)
                    ? 'Not upheld'
                    : $r->outcomeLabel(),
                'filed_at' => $r->created_at,
                // The reported person's answer, so the document shows both sides.
                'response' => $r->respondent_statement,
                'responded_at' => $r->responded_at,
                'escalated_to' => $r->escalated_to,
                'escalated_at' => $r->escalated_at,
                // The explanation meant for the two people, once decided. The
                // admin's private working note is for admins only.
                'decision_note' => $r->isOpen() ? null : $r->decision_note,
                'admin_note' => $isAdmin ? $r->admin_note : null,
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
            'buyer' => self::person($order->buyer, $viewer, $isAdmin),
            'seller' => self::person($order->seller, $viewer, $isAdmin),
            'timeline' => $timeline,
            'messages' => $messages,
            'reports' => $reports,
        ];
    }

    /**
     * One side of the transaction, with contact details limited to what the
     * reader is entitled to see.
     *
     * @return array<string, mixed>
     */
    private static function person(?User $person, ?User $viewer, bool $isAdmin): array
    {
        $isSelf = $person !== null && $viewer !== null && $viewer->id === $person->id;

        return [
            'id' => $person?->id,
            'name' => $person?->name,
            'email' => ($isAdmin || $isSelf) ? $person?->email : null,
            'member_since' => $person?->created_at,
        ] + ($isAdmin ? ['phone' => $person?->phone] : []);
    }
}
