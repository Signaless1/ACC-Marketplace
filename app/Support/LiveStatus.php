<?php

namespace App\Support;

use App\Models\Message;
use App\Models\Order;
use App\Models\Report;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * The few numbers the app shell keeps fresh in the background: unread
 * messages, orders waiting on the seller, open reports for admins.
 * Used by both the shared Inertia props and the lightweight /live endpoint.
 */
class LiveStatus
{
    public static function unread(?User $user): int
    {
        if (! $user) {
            return 0;
        }

        return self::unreadQuery($user)->count();
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function latestMessage(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        $message = self::unreadQuery($user)
            ->with(['sender:id,name', 'conversation.listing:id,title'])
            ->withCount('attachments')
            ->latest('id')
            ->first();

        if (! $message) {
            return null;
        }

        return [
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'sender' => $message->sender?->name,
            'listing' => $message->conversation?->listing?->title,
            'preview' => $message->body
                ? Str::limit($message->body, 90)
                : ($message->attachments_count > 0 ? 'Sent an attachment' : ''),
        ];
    }

    public static function pendingOrders(?User $user): int
    {
        if (! $user) {
            return 0;
        }

        return Order::query()
            ->where('seller_id', $user->id)
            ->where('status', 'pending')
            ->count();
    }

    public static function pendingReports(?User $user): int
    {
        if (! $user?->isAdmin()) {
            return 0;
        }

        return Report::query()->whereIn('status', ['pending', 'reviewing'])->count();
    }

    /**
     * @return array<string, mixed>
     */
    public static function all(?User $user): array
    {
        return [
            'unreadMessageCount' => self::unread($user),
            'latestMessage' => self::latestMessage($user),
            'pendingOrderCount' => self::pendingOrders($user),
            'pendingReportCount' => self::pendingReports($user),
        ];
    }

    private static function unreadQuery(User $user)
    {
        return Message::query()
            ->whereNull('read_at')
            ->where('sender_id', '!=', $user->id)
            ->liveFor($user->id)
            ->whereHas('conversation', fn ($q) => $q
                ->where('buyer_id', $user->id)
                ->orWhere('seller_id', $user->id));
    }
}
