<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use App\Models\Order;
use App\Models\Review;
use App\Models\User;
use App\Support\SellerRating;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function show(Request $request, User $user): Response
    {
        $viewer = $request->user();

        abort_if(
            $user->isSuspended() && ! $viewer->isAdmin() && $viewer->id !== $user->id,
            404
        );

        $listings = Listing::query()
            ->where('user_id', $user->id)
            ->where('status', 'available')
            ->whereNull('hidden_at')
            ->with(['category', 'images'])
            ->withProductRating()
            ->latest()
            ->take(12)
            ->get();

        $reviews = Review::query()
            ->where('seller_id', $user->id)
            ->with(['reviewer:id,name,avatar_path', 'listing:id,title', 'attachments'])
            ->latest()
            ->paginate(10)
            ->withQueryString();

        $rating = SellerRating::summary($user->id);

        // Completed orders the viewer may still review for this seller.
        $reviewableOrders = $viewer->id === $user->id
            ? collect()
            : Order::query()
                ->where('buyer_id', $viewer->id)
                ->where('seller_id', $user->id)
                ->where('status', 'completed')
                ->doesntHave('review')
                ->with('listing:id,title')
                ->latest()
                ->get(['id', 'listing_id']);

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
                // True totals, not the size of the 12-item page below.
                'active_listings' => Listing::query()
                    ->where('user_id', $user->id)
                    ->where('status', 'available')
                    ->whereNull('hidden_at')
                    ->count(),
                'completed_sales' => Order::query()
                    ->where('seller_id', $user->id)
                    ->where('status', 'completed')
                    ->count(),
            ],
            'reviewableOrders' => $reviewableOrders,
            'listings' => $listings,
            'reviews' => $reviews,
            'isOwnProfile' => $viewer->id === $user->id,
        ]);
    }
}
