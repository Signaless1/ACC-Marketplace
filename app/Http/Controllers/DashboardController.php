<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Conversation;
use App\Models\Favorite;
use App\Models\Listing;
use App\Models\Order;
use App\Models\Report;
use App\Models\Review;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Dashboard', $user->isAdmin()
            ? ['mode' => 'admin'] + $this->admin()
            : ['mode' => 'member'] + $this->member($user));
    }

    /*
    |--------------------------------------------------------------------------
    | Normal user: buying + selling at a glance
    |--------------------------------------------------------------------------
    */

    private function member(User $user): array
    {
        // Every prop is a closure so a background refresh that asks for just
        // a few of them does not run the other queries.
        $cache = null;
        $stats = function () use (&$cache, $user) {
            return $cache ??= $this->memberStats($user);
        };

        $uid = $user->id;

        return [
            'stats' => $stats,
            'attention' => fn () => $this->attention($user, $stats()),
            'recentOrders' => fn () => Order::query()
                ->where(fn ($q) => $q->where('buyer_id', $uid)->orWhere('seller_id', $uid))
                ->with(['listing:id,title', 'listing.images', 'buyer:id,name', 'seller:id,name'])
                ->latest()
                ->take(5)
                ->get()
                ->map(fn ($o) => [
                    'id' => $o->id,
                    'reference' => $o->reference,
                    'status' => $o->status,
                    'role' => $o->seller_id === $uid ? 'selling' : 'buying',
                    'total' => $o->total,
                    'quantity' => $o->quantity,
                    'listing' => $o->listing?->title,
                    'image' => $o->listing?->images->first()?->path,
                    'other' => $o->seller_id === $uid ? $o->buyer?->name : $o->seller?->name,
                    'created_at' => $o->created_at,
                ]),
            'recentConversations' => fn () => $this->recentConversations($uid),
            'myListings' => fn () => Listing::query()
                ->where('user_id', $uid)
                ->with(['images', 'category:id,name'])
                ->withCount('favorites')
                ->latest()
                ->take(4)
                ->get(),
            'salesChart' => fn () => $this->salesChart($uid),
            'recommended' => fn () => $this->recommended($user),
        ];
    }

    private function memberStats(User $user): array
    {
        $uid = $user->id;

        $sales = fn () => Order::query()->where('seller_id', $uid);
        $buys = fn () => Order::query()->where('buyer_id', $uid);

        $money = fn ($query) => (float) $query
            ->where('status', 'completed')
            ->selectRaw('COALESCE(SUM(price * quantity), 0) as amount')
            ->value('amount');

        $ratings = Review::query()
            ->where('seller_id', $uid)
            ->selectRaw('COUNT(*) as total, AVG(rating) as average')
            ->first();

        return [
            'active_listings' => Listing::query()
                ->where('user_id', $uid)
                ->whereNull('hidden_at')
                ->where('quantity', '>', 0)
                ->count(),
            'total_listings' => Listing::query()->where('user_id', $uid)->count(),
            'orders_to_confirm' => $sales()->where('status', 'pending')->count(),
            'orders_in_progress' => $sales()->where('status', 'confirmed')->count()
                + $buys()->whereIn('status', ['pending', 'confirmed'])->count(),
            'completed_sales' => $sales()->where('status', 'completed')->count(),
            'earnings' => $money($sales()),
            'purchases' => $buys()->where('status', 'completed')->count(),
            'spent' => $money($buys()),
            'unread_messages' => $this->unreadCount($uid),
            'saved_items' => Favorite::query()->where('user_id', $uid)->count(),
            'listing_saves' => Favorite::query()
                ->whereHas('listing', fn ($q) => $q->where('user_id', $uid))
                ->count(),
            'total_views' => (int) Listing::query()->where('user_id', $uid)->sum('views_count'),
            'rating' => $ratings->average ? round((float) $ratings->average, 1) : null,
            'reviews' => (int) $ratings->total,
        ];
    }

    /**
     * Things that need the user to do something, most urgent first.
     *
     * @return array<int, array<string, mixed>>
     */
    private function attention(User $user, array $stats): array
    {
        $uid = $user->id;
        $items = collect();

        $removed = Listing::query()
            ->where('user_id', $uid)
            ->whereNotNull('hidden_at')
            ->latest('hidden_at')
            ->take(3)
            ->get();

        foreach ($removed as $listing) {
            $items->push([
                'tone' => 'danger',
                'title' => "A moderator removed “{$listing->title}”",
                'text' => trim(($listing->removed_reason_label ?? 'No reason given').'. '.($listing->removed_note ?? '')),
                'href' => "/listings/{$listing->id}",
                'cta' => 'See details',
            ]);
        }

        if ($stats['orders_to_confirm'] > 0) {
            $n = $stats['orders_to_confirm'];
            $items->push([
                'tone' => 'warn',
                'title' => $n === 1 ? '1 order is waiting for you to confirm' : "{$n} orders are waiting for you to confirm",
                'text' => 'Buyers are waiting on your reply.',
                'href' => '/orders',
                'cta' => 'Review orders',
            ]);
        }

        $toComplete = Order::query()
            ->where('status', 'confirmed')
            ->where(fn ($q) => $q->where('buyer_id', $uid)->orWhere('seller_id', $uid))
            ->count();

        if ($toComplete > 0) {
            $items->push([
                'tone' => 'info',
                'title' => $toComplete === 1 ? '1 confirmed order to hand over' : "{$toComplete} confirmed orders to hand over",
                'text' => 'Meet up, then mark the order as completed.',
                'href' => '/orders',
                'cta' => 'Open orders',
            ]);
        }

        $toReview = Order::query()
            ->where('buyer_id', $uid)
            ->where('status', 'completed')
            ->doesntHave('review')
            ->count();

        if ($toReview > 0) {
            $items->push([
                'tone' => 'gold',
                'title' => $toReview === 1 ? '1 purchase is waiting for your review' : "{$toReview} purchases are waiting for your review",
                'text' => 'Your rating helps other students buy with confidence.',
                'href' => '/reviews',
                'cta' => 'Write reviews',
            ]);
        }

        if ($stats['unread_messages'] > 0) {
            $n = $stats['unread_messages'];
            $items->push([
                'tone' => 'info',
                'title' => $n === 1 ? '1 unread message' : "{$n} unread messages",
                'text' => 'Reply quickly to keep buyers interested.',
                'href' => '/messages',
                'cta' => 'Open messages',
            ]);
        }

        return $items->values()->all();
    }

    private function unreadCount(int $uid): int
    {
        return \App\Models\Message::query()
            ->whereNull('read_at')
            ->where('sender_id', '!=', $uid)
            ->liveFor($uid)
            ->whereHas('conversation', fn ($q) => $q
                ->where('buyer_id', $uid)
                ->orWhere('seller_id', $uid))
            ->count();
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function recentConversations(int $uid): Collection
    {
        return Conversation::query()
            ->where(fn ($q) => $q->where('buyer_id', $uid)->orWhere('seller_id', $uid))
            ->with(['listing:id,title', 'listing.images', 'buyer:id,name', 'seller:id,name', 'latestMessage.attachments'])
            ->withMax('messages', 'created_at')
            ->withCount(['messages as unread_count' => fn ($q) => $q
                ->whereNull('read_at')
                ->where('sender_id', '!=', $uid)
                ->liveFor($uid)])
            ->has('messages')
            ->latest('messages_max_created_at')
            ->take(5)
            ->get()
            ->map(function ($c) use ($uid) {
                $last = $c->latestMessage;

                return [
                    'id' => $c->id,
                    'other' => $c->buyer_id === $uid ? $c->seller?->name : $c->buyer?->name,
                    'listing' => $c->listing?->title,
                    'image' => $c->listing?->images->first()?->path,
                    'preview' => $last?->deleted_for_everyone_at
                        ? 'This message was deleted'
                        : ($last?->body
                            ? Str::limit($last->body, 70)
                            : ($last && $last->attachments->isNotEmpty() ? 'Sent an attachment' : '')),
                    'unread' => (int) $c->unread_count,
                    'at' => $last?->created_at,
                ];
            });
    }

    /**
     * Earnings per month for the last six months.
     *
     * @return array<int, array{label: string, total: float}>
     */
    private function salesChart(int $uid): array
    {
        $start = CarbonImmutable::now()->startOfMonth()->subMonths(5);

        $orders = Order::query()
            ->where('seller_id', $uid)
            ->where('status', 'completed')
            ->where('completed_at', '>=', $start)
            ->get(['price', 'quantity', 'completed_at']);

        return collect(range(0, 5))->map(function ($i) use ($start, $orders) {
            $month = $start->addMonths($i);

            return [
                'label' => $month->format('M'),
                'total' => round($orders
                    ->filter(fn ($o) => $o->completed_at->format('Y-m') === $month->format('Y-m'))
                    ->sum(fn ($o) => (float) $o->price * $o->quantity), 2),
            ];
        })->all();
    }

    /**
     * Listings picked from categories the user already shows interest in,
     * falling back to what is popular on campus.
     */
    private function recommended(User $user): Collection
    {
        $interest = Listing::query()
            ->whereIn('id', Favorite::query()->where('user_id', $user->id)->select('listing_id'))
            ->pluck('category_id')
            ->merge(
                Order::query()
                    ->where('buyer_id', $user->id)
                    ->join('listings', 'listings.id', '=', 'orders.listing_id')
                    ->pluck('listings.category_id')
            )
            ->unique()
            ->values();

        return Listing::query()
            ->visible()
            ->forCards()
            ->where('user_id', '!=', $user->id)
            ->where('quantity', '>', 0)
            ->when($interest->isNotEmpty(), fn ($q) => $q->orderByRaw(
                'CASE WHEN category_id IN ('.$interest->implode(',').') THEN 0 ELSE 1 END'
            ))
            ->orderByDesc('favorites_count')
            ->latest()
            ->take(8)
            ->get();
    }

    /*
    |--------------------------------------------------------------------------
    | Admin: moderation queue and marketplace health
    |--------------------------------------------------------------------------
    */

    private function admin(): array
    {
        return [
            'stats' => fn () => $this->adminStats(),
            'queue' => fn () => Report::query()
                ->whereIn('status', ['pending', 'reviewing'])
                ->with(['reporter:id,name', 'listing:id,title', 'reportedUser:id,name', 'order:id'])
                ->latest()
                ->take(6)
                ->get()
                ->map(fn ($r) => [
                    'id' => $r->id,
                    'kind' => $r->order_id ? 'transaction' : ($r->listing_id ? 'listing' : 'user'),
                    'reason' => Report::allReasons()[$r->reason] ?? $r->reason,
                    'status' => $r->status,
                    'target' => $r->listing?->title ?? $r->reportedUser?->name ?? 'Deleted item',
                    'order_id' => $r->order_id,
                    'reporter' => $r->reporter?->name,
                    'created_at' => $r->created_at,
                ]),
            'activity' => fn () => [
                'users' => $this->daily(User::class),
                'listings' => $this->daily(Listing::class),
                'orders' => $this->daily(Order::class),
            ],
            'recentUsers' => fn () => User::query()
                ->latest()
                ->take(5)
                ->get(['id', 'name', 'email', 'avatar_path', 'created_at', 'suspended_at']),
            'recentRemovals' => fn () => Listing::query()
                ->whereNotNull('hidden_at')
                ->with('seller:id,name')
                ->latest('hidden_at')
                ->take(4)
                ->get(['id', 'user_id', 'title', 'removed_reason', 'hidden_at']),
            'popularCategories' => fn () => Category::query()
                ->withCount('listings')
                ->orderByDesc('listings_count')
                ->take(6)
                ->get(['id', 'name']),
        ];
    }

    private function adminStats(): array
    {
        $week = now()->subDays(7);

        $completedVolume = (float) Order::query()
            ->where('status', 'completed')
            ->selectRaw('COALESCE(SUM(price * quantity), 0) as amount')
            ->value('amount');

        return [
            'users' => User::count(),
            'new_users_7d' => User::where('created_at', '>=', $week)->count(),
            'suspended_users' => User::whereNotNull('suspended_at')->count(),
            'active_listings' => Listing::whereNull('hidden_at')->where('quantity', '>', 0)->count(),
            'new_listings_7d' => Listing::where('created_at', '>=', $week)->count(),
            'removed_listings' => Listing::whereNotNull('hidden_at')->count(),
            'orders' => Order::count(),
            'open_orders' => Order::whereIn('status', ['pending', 'confirmed'])->count(),
            'completed_orders' => Order::where('status', 'completed')->count(),
            'cancelled_orders' => Order::where('status', 'cancelled')->count(),
            'volume' => $completedVolume,
            'pending_reports' => Report::where('status', 'pending')->count(),
            'reviewing_reports' => Report::where('status', 'reviewing')->count(),
            'escalated_reports' => Report::where('status', 'escalated')->count(),
            'transaction_reports' => Report::whereNotNull('order_id')
                ->whereIn('status', ['pending', 'reviewing'])
                ->count(),
            'average_rating' => ($avg = Review::avg('product_rating')) ? round((float) $avg, 1) : null,
        ];
    }

    /**
     * Rows created per day over the last 14 days.
     *
     * @param  class-string<\Illuminate\Database\Eloquent\Model>  $model
     * @return array<int, array{label: string, value: int}>
     */
    private function daily(string $model): array
    {
        $start = CarbonImmutable::now()->subDays(13)->startOfDay();

        $counts = $model::query()
            ->where('created_at', '>=', $start)
            ->pluck('created_at')
            ->countBy(fn ($date) => $date->format('Y-m-d'));

        return collect(range(0, 13))->map(function ($i) use ($start, $counts) {
            $day = $start->addDays($i);

            return [
                'label' => $day->format('M j'),
                'value' => (int) ($counts[$day->format('Y-m-d')] ?? 0),
            ];
        })->all();
    }
}
