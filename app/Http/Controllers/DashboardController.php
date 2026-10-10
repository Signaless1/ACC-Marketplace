<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Conversation;
use App\Models\Favorite;
use App\Models\Listing;
use App\Models\Message;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $userId = $user->id;

        // --- My listings: one grouped query -------------------------------
        $byStatus = Listing::query()
            ->where('user_id', $userId)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $listingStats = [
            'available' => (int) ($byStatus['available'] ?? 0),
            'reserved' => (int) ($byStatus['reserved'] ?? 0),
            'sold' => (int) ($byStatus['sold'] ?? 0),
        ];

        // --- Saved items ---------------------------------------------------
        $savedBase = Favorite::query()
            ->where('user_id', $userId)
            ->whereHas('listing', fn ($q) => $q->visible());

        $savedCount = (clone $savedBase)->count();

        $savedListings = $savedBase
            ->with(['listing.category', 'listing.images'])
            ->latest()
            ->latest('id')
            ->limit(4)
            ->get()
            ->pluck('listing')
            ->values();

        // --- Recent conversations (+ last message without N+1) ------------
        $conversations = Conversation::query()
            ->where(fn ($q) => $q->where('buyer_id', $userId)->orWhere('seller_id', $userId))
            ->whereHas('messages')
            ->with([
                'listing:id,title',
                'buyer:id,name,avatar_path',
                'seller:id,name,avatar_path',
            ])
            ->withMax('messages', 'created_at')
            ->withCount([
                'messages as unread_count' => fn ($q) => $q
                    ->whereNull('read_at')
                    ->where('sender_id', '!=', $userId),
            ])
            ->latest('messages_max_created_at')
            ->limit(4)
            ->get();

        $lastMessages = Message::query()
            ->whereIn('id', Message::query()
                ->selectRaw('MAX(id)')
                ->whereIn('conversation_id', $conversations->pluck('id'))
                ->groupBy('conversation_id'))
            ->get()
            ->keyBy('conversation_id');

        $recentConversations = $conversations->map(function (Conversation $c) use ($userId, $lastMessages) {
            $other = $c->buyer_id === $userId ? $c->seller : $c->buyer;
            $last = $lastMessages->get($c->id);

            return [
                'id' => $c->id,
                'other_user' => [
                    'id' => $other->id,
                    'name' => $other->name,
                    'avatar_url' => $other->avatar_url,
                ],
                'listing' => $c->listing ? ['id' => $c->listing->id, 'title' => $c->listing->title] : null,
                'last_message' => $last ? [
                    'body' => Str::limit($last->body, 90),
                    'from_me' => $last->sender_id === $userId,
                    'created_at' => $last->created_at,
                ] : null,
                'unread_count' => (int) $c->unread_count,
            ];
        })->values();

        // --- Reviews to leave ---------------------------------------------
        $reviewableBase = Order::query()
            ->where('buyer_id', $userId)
            ->where('status', 'completed')
            ->doesntHave('review');

        $reviewableCount = (clone $reviewableBase)->count();

        $reviewableOrders = $reviewableBase
            ->with(['listing:id,title', 'seller:id,name,avatar_path'])
            ->latest()
            ->limit(3)
            ->get()
            ->map(fn (Order $o) => [
                'id' => $o->id,
                'listing' => ['id' => $o->listing->id, 'title' => $o->listing->title],
                'seller' => [
                    'id' => $o->seller->id,
                    'name' => $o->seller->name,
                    'avatar_url' => $o->seller->avatar_url,
                ],
            ])
            ->values();

        // --- Needs attention (counts only; the page hides zeros) ---------
        $unreadMessages = Message::query()
            ->whereNull('read_at')
            ->where('sender_id', '!=', $userId)
            ->whereHas('conversation', fn ($q) => $q
                ->where('buyer_id', $userId)
                ->orWhere('seller_id', $userId))
            ->count();

        $attention = [
            'unread_messages' => $unreadMessages,
            'orders_to_confirm' => Order::query()
                ->where('seller_id', $userId)
                ->where('status', 'pending')
                ->count(),
            'orders_to_complete' => Order::query()
                ->where('status', 'confirmed')
                ->where(fn ($q) => $q->where('buyer_id', $userId)->orWhere('seller_id', $userId))
                ->count(),
            'reviews_to_leave' => $reviewableCount,
        ];

        // --- Discovery -----------------------------------------------------
        $recentListings = Listing::query()
            ->visible()
            ->where('status', 'available')
            ->where('user_id', '!=', $userId)
            ->with(['category', 'images'])
            ->latest()
            ->latest('id')
            ->limit(4)
            ->get();

        $categories = Category::query()
            ->withCount([
                'listings as listings_count' => fn ($q) => $q
                    ->visible()
                    ->where('status', 'available'),
            ])
            ->get()
            ->filter(fn ($c) => $c->listings_count > 0)
            ->sortByDesc('listings_count')
            ->take(6)
            ->map(fn ($c) => ['id' => $c->id, 'name' => $c->name, 'listings_count' => $c->listings_count])
            ->values();

        $isNewUser = array_sum($listingStats) === 0
            && $savedCount === 0
            && $recentConversations->isEmpty()
            && $reviewableCount === 0
            && ! Order::query()
                ->where(fn ($q) => $q->where('buyer_id', $userId)->orWhere('seller_id', $userId))
                ->exists();

        return Inertia::render('Dashboard', [
            'stats' => $listingStats,
            'savedListings' => $savedListings,
            'savedCount' => $savedCount,
            'recentConversations' => $recentConversations,
            'reviewableOrders' => $reviewableOrders,
            'reviewableCount' => $reviewableCount,
            'attention' => $attention,
            'recentListings' => $recentListings,
            'categories' => $categories,
            'isNewUser' => $isNewUser,
        ]);
    }
}
