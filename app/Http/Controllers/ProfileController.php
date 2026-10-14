<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use App\Models\Order;
use App\Models\Review;
use App\Models\User;
use App\Support\SellerRating;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function show(Request $request, User $user): Response|RedirectResponse
    {
        $viewer = $request->user();

        // A suspended profile stays hidden from everyone except admins and
        // the owner. Instead of a bare 404, send the visitor somewhere safe
        // and show a "this user is suspended" pop-up.
        if ($user->isSuspended() && ! $viewer->isAdmin() && $viewer->id !== $user->id) {
            return redirect()
                ->route('dashboard')
                ->with('suspended', ['name' => $user->name]);
        }

        $activeListings = Listing::query()
            ->where('user_id', $user->id)
            ->where('quantity', '>', 0)
            ->whereNull('hidden_at');

        // Counted separately so the number is not capped by the 12 cards shown.
        $activeListingsCount = (clone $activeListings)->count();

        $listings = (clone $activeListings)
            ->forCards()
            ->latest()
            ->take(12)
            ->get();

        $reviews = Review::query()
            ->where('seller_id', $user->id)
            ->with(['reviewer:id,name,avatar_path', 'listing:id,title', 'attachments'])
            ->latest()
            ->paginate(10)
            ->withQueryString();

        // Aggregates always come from the whole reviews table, never a page.
        $rating = SellerRating::summary($user->id);

        // Completed orders from this seller that the viewer has not reviewed yet.
        $reviewableOrders = $viewer->id === $user->id
            ? collect()
            : Order::query()
                ->where('seller_id', $user->id)
                ->where('buyer_id', $viewer->id)
                ->where('status', 'completed')
                ->doesntHave('review')
                ->with('listing:id,title')
                ->latest()
                ->get(['id', 'listing_id', 'quantity', 'completed_at']);

        return Inertia::render('Profile/Show', [
            'profile' => [
                'id' => $user->id,
                'name' => $user->name,
                'bio' => $user->bio,
                'avatar_url' => $user->avatar_url,
                'created_at' => $user->created_at,
                'is_suspended' => $user->isSuspended(),
            ],
            'stats' => [
                'rating' => $rating['average'],
                'reviews_count' => $rating['count'],
                'distribution' => $rating['distribution'],
                'active_listings' => $activeListingsCount,
                'completed_sales' => Order::query()
                    ->where('seller_id', $user->id)
                    ->where('status', 'completed')
                    ->count(),
            ],
            'listings' => $listings,
            'reviews' => $reviews,
            'reviewableOrders' => $reviewableOrders->values(),
            'isOwnProfile' => $viewer->id === $user->id,
        ]);
    }
}
