<?php

namespace App\Http\Controllers;

use App\Models\Favorite;
use App\Models\Listing;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FavoriteController extends Controller
{
    public function index(Request $request): Response
    {
        $listings = Listing::query()
            ->whereIn(
                'id',
                $request->user()->favorites()->select('listing_id')
            )
            ->visible()
            ->with(['category', 'images', 'seller:id,name'])
            ->withProductRating()
            ->latest()
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Favorites/Index', [
            'listings' => $listings,
        ]);
    }

    public function toggle(Request $request, Listing $listing): RedirectResponse
    {
        $user = $request->user();

        $existing = Favorite::query()
            ->where('user_id', $user->id)
            ->where('listing_id', $listing->id)
            ->first();

        if ($existing) {
            $existing->delete();

            return back()->with('success', 'Removed from favorites.');
        }

        if ($listing->user_id === $user->id) {
            return back()->with('error', 'You cannot favorite your own listing.');
        }

        if ($listing->hidden_at !== null) {
            return back()->with('error', 'This listing is not available.');
        }

        Favorite::firstOrCreate([
            'user_id' => $user->id,
            'listing_id' => $listing->id,
        ]);

        return back()->with('success', 'Saved to favorites.');
    }
}
