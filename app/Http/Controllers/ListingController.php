<?php

namespace App\Http\Controllers;

use App\Http\Requests\ListingRequest;
use App\Models\Category;
use App\Models\Listing;
use App\Models\Report;
use App\Models\Review;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ListingController extends Controller
{
    public function index(Request $request): Response
    {
        $listings = Listing::query()
            ->with(['category', 'images'])
            ->withCount(['favorites', 'orders as open_orders_count' => fn ($q) => $q
                ->whereIn('status', ['pending', 'confirmed'])])
            ->withAvg('reviews as rating_avg', 'product_rating')
            ->withCount(['reviews as rating_count' => fn ($q) => $q->whereNotNull('product_rating')])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Listings/Index', [
            'listings' => $listings,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Listings/Create', [
            'categories' => Category::query()->orderBy('name')->get(),
            'limits' => $this->limits(),
        ]);
    }

    public function show(Request $request, Listing $listing): Response
    {
        $user = $request->user();

        // Removed listings behave like they do not exist for other users.
        abort_unless(Gate::forUser($user)->allows('view', $listing), 404);

        // Count a view once per session, never for the owner.
        if ($user->id !== $listing->user_id && ! $request->session()->has("viewed.{$listing->id}")) {
            Listing::query()->whereKey($listing->id)->increment('views_count');
            $request->session()->put("viewed.{$listing->id}", true);
        }

        $listing->load([
            'seller:id,name,avatar_path,created_at',
            'category',
            'images',
            'remover:id,name',
        ]);
        $listing->loadAvg('reviews as rating_avg', 'product_rating');
        $listing->loadCount([
            'reviews as rating_count' => fn ($q) => $q->whereNotNull('product_rating'),
            'favorites',
        ]);

        $soldUnits = (int) $listing->orders()
            ->where('status', 'completed')
            ->sum('quantity');

        $sellerStats = Review::query()
            ->where('seller_id', $listing->user_id)
            ->selectRaw('COUNT(*) as total, AVG(rating) as average')
            ->first();

        $breakdown = Review::query()
            ->where('listing_id', $listing->id)
            ->whereNotNull('product_rating')
            ->selectRaw('product_rating, COUNT(*) as total')
            ->groupBy('product_rating')
            ->pluck('total', 'product_rating');

        $reviews = Review::query()
            ->where('listing_id', $listing->id)
            ->whereNotNull('product_rating')
            ->with(['reviewer:id,name,avatar_path', 'attachments'])
            ->latest()
            ->take(20)
            ->get();

        // A completed order of this item that the buyer has not reviewed yet.
        $reviewableOrder = $user->id === $listing->user_id
            ? null
            : $listing->orders()
                ->where('buyer_id', $user->id)
                ->where('status', 'completed')
                ->doesntHave('review')
                ->first(['id']);

        $sellerOtherListings = Listing::query()
            ->visible()
            ->forCards()
            ->where('user_id', $listing->user_id)
            ->whereKeyNot($listing->id)
            ->where('quantity', '>', 0)
            ->latest()
            ->take(6)
            ->get();

        $similar = Listing::query()
            ->visible()
            ->forCards()
            ->where('category_id', $listing->category_id)
            ->whereKeyNot($listing->id)
            ->where('user_id', '!=', $listing->user_id)
            ->where('quantity', '>', 0)
            ->orderByDesc('favorites_count')
            ->latest()
            ->take(8)
            ->get();

        $featured = Listing::query()
            ->visible()
            ->forCards()
            ->whereKeyNot($listing->id)
            ->whereNotIn('id', $similar->pluck('id'))
            ->where('user_id', '!=', $user->id)
            ->where('quantity', '>', 0)
            ->orderByDesc('favorites_count')
            ->orderByDesc('views_count')
            ->take(8)
            ->get();

        return Inertia::render('Listings/Show', [
            'listing' => $listing,
            'canEdit' => $user->id === $listing->user_id,
            'isFavorited' => $user->favorites()
                ->where('listing_id', $listing->id)
                ->exists(),
            'soldUnits' => $soldUnits,
            'sellerRating' => [
                'average' => $sellerStats->average
                    ? round((float) $sellerStats->average, 1)
                    : null,
                'count' => (int) $sellerStats->total,
            ],
            'ratingBreakdown' => [
                5 => (int) ($breakdown[5] ?? 0),
                4 => (int) ($breakdown[4] ?? 0),
                3 => (int) ($breakdown[3] ?? 0),
                2 => (int) ($breakdown[2] ?? 0),
                1 => (int) ($breakdown[1] ?? 0),
            ],
            'reviews' => $reviews,
            'reviewableOrder' => $reviewableOrder,
            'reviewableOrderId' => $reviewableOrder?->id,
            'sellerOtherListings' => $sellerOtherListings,
            'similarListings' => $similar,
            'featuredListings' => $featured,
            'reportReasons' => Report::REASONS,
        ]);
    }

    public function store(ListingRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $listing = Listing::create([
            'user_id' => $request->user()->id,
            'category_id' => $validated['category_id'],
            'title' => $validated['title'],
            'slug' => str()->slug($validated['title']).'-'.uniqid(),
            'description' => $validated['description'],
            'price' => $validated['price'],
            'quantity' => $validated['quantity'],
            'type' => $validated['type'],
            'status' => 'available',
            'condition' => $validated['condition'] ?? null,
        ]);

        $this->storeImages($listing, $request->file('images', []), 0);

        return redirect()
            ->route('listings.show', $listing)
            ->with('success', 'Your listing is live.');
    }

    public function edit(Request $request, Listing $listing): Response
    {
        Gate::authorize('update', $listing);

        $listing->load('images');

        return Inertia::render('Listings/Edit', [
            'listing' => $listing,
            'categories' => Category::query()->orderBy('name')->get(),
            'limits' => $this->limits(),
        ]);
    }

    public function update(ListingRequest $request, Listing $listing): RedirectResponse
    {
        Gate::authorize('update', $listing);

        $validated = $request->validated();

        $imagesToRemove = $listing->images()
            ->whereIn('id', $validated['remove_images'] ?? [])
            ->get();

        $newImages = $request->file('images', []);

        $remaining = $listing->images()->count() - $imagesToRemove->count();

        if ($remaining + count($newImages) > Listing::MAX_IMAGES) {
            return back()->withErrors([
                'images' => 'A listing can have at most '.Listing::MAX_IMAGES.' photos.',
            ]);
        }

        foreach ($imagesToRemove as $image) {
            Storage::disk('public')->delete($image->path);
            $image->delete();
        }

        $listing->update([
            'category_id' => $validated['category_id'],
            'title' => $validated['title'],
            'description' => $validated['description'],
            'price' => $validated['price'],
            'quantity' => $validated['quantity'],
            'type' => $validated['type'],
            'condition' => $validated['condition'] ?? null,
        ]);

        // Stock edits change availability; keep the status in step with them.
        $listing->syncStatus();

        $this->storeImages(
            $listing,
            $newImages,
            ($listing->images()->max('sort_order') ?? -1) + 1
        );

        return redirect()
            ->route('listings.show', $listing)
            ->with('success', 'Listing updated.');
    }

    public function destroy(Request $request, Listing $listing): RedirectResponse
    {
        Gate::authorize('delete', $listing);

        // Orders still in progress must be finished or cancelled first.
        if ($listing->orders()->whereIn('status', ['pending', 'confirmed'])->exists()) {
            return back()->with(
                'error',
                'This listing has open orders. Complete or cancel them before deleting it.'
            );
        }

        $listing->load('images');

        foreach ($listing->images as $image) {
            Storage::disk('public')->delete($image->path);
        }

        $listing->delete();

        return redirect()
            ->route('listings.index')
            ->with('success', 'Listing deleted.');
    }

    /**
     * @param  array<int, \Illuminate\Http\UploadedFile>  $files
     */
    private function storeImages(Listing $listing, array $files, int $startAt): void
    {
        foreach (array_values($files) as $index => $image) {
            $listing->images()->create([
                'path' => $image->store('listings', 'public'),
                'sort_order' => $startAt + $index,
            ]);
        }
    }

    /**
     * Limits the form shows to the user (kept in one place with the rules).
     *
     * @return array<string, mixed>
     */
    private function limits(): array
    {
        return [
            'title' => 100,
            'description' => 3000,
            'maxPrice' => Listing::MAX_PRICE,
            'maxQuantity' => Listing::MAX_QUANTITY,
            'maxImages' => Listing::MAX_IMAGES,
            'conditions' => Listing::CONDITIONS,
        ];
    }
}
