<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Listing;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use App\Models\Order;
use App\Models\Review;
use App\Support\ProductRating;
use App\Support\SellerRating;
use Illuminate\Validation\Rule;

class ListingController extends Controller
{
    public function index(Request $request): Response
    {
        $listings = Listing::query()
            ->with(['category', 'images'])
            ->where('user_id', $request->user()->id)
            ->when(
                in_array($request->query('status'), ['available', 'reserved', 'sold'], true),
                fn ($q) => $q->where('status', $request->query('status'))
            )
            ->latest()
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Listings/Index', [
            'listings' => $listings,
            'status' => $request->query('status'),
        ]);
    }

    public function create(): Response
    {
        $categories = Category::query()
            ->orderBy('name')
            ->get();

        return Inertia::render('Listings/Create', [
            'categories' => $categories,
            'limits' => self::limits(),
        ]);
    }

    public function show(Request $request, Listing $listing): Response
    {
        $user = $request->user();

        // Hidden listings behave like they do not exist for other users.
        abort_unless(Gate::forUser($user)->allows('view', $listing), 404);

        $isOwner = $user->id === $listing->user_id;

        if (! $isOwner) {
            Listing::withoutTimestamps(fn () => $listing->increment('views_count'));
        }

        // Only expose the public seller fields the page needs (no email,
        // role, suspension state, etc.).
        $listing->load([
            'seller:id,name,avatar_path,created_at',
            'category',
            'images',
        ]);

        $rating = SellerRating::summary($listing->user_id);
        $productRating = ProductRating::summary($listing->id);

        $reviews = Review::query()
            ->where('listing_id', $listing->id)
            ->with([
                'reviewer:id,name,avatar_path',
                'attachments',
            ])
            ->latest()
            ->take(20)
            ->get();

        $browse = fn (Builder $q) => $q
            ->visible()
            ->where('status', 'available')
            ->whereKeyNot($listing->id)
            ->with(['category', 'images', 'seller:id,name'])
            ->withProductRating();

        $fromSeller = Listing::query()
            ->tap($browse)
            ->where('user_id', $listing->user_id)
            ->latest()
            ->take(8)
            ->get();

        $similar = Listing::query()
            ->tap($browse)
            ->where('category_id', $listing->category_id)
            ->where('user_id', '!=', $listing->user_id)
            ->latest()
            ->take(8)
            ->get();

        $shownIds = $fromSeller->pluck('id')->merge($similar->pluck('id'));

        $discover = Listing::query()
            ->tap($browse)
            ->whereNotIn('id', $shownIds)
            ->inRandomOrder()
            ->take(8)
            ->get();

        return Inertia::render('Listings/Show', [
            'listing' => $listing,
            'canEdit' => $isOwner,
            'isFavorited' => $user->favorites()
                ->where('listing_id', $listing->id)
                ->exists(),
            'sellerRating' => [
                'average' => $rating['average'],
                'count' => $rating['count'],
            ],
            'sellerStats' => [
                'active_listings' => Listing::query()
                    ->where('user_id', $listing->user_id)
                    ->where('status', 'available')
                    ->whereNull('hidden_at')
                    ->count(),
                'completed_sales' => Order::query()
                    ->where('seller_id', $listing->user_id)
                    ->where('status', 'completed')
                    ->count(),
            ],
            'productRating' => $productRating,
            'reviews' => $reviews,
            // A completed, not-yet-reviewed order between this viewer and the seller.
            'reviewableOrderId' => $isOwner
                ? null
                : Order::query()
                    ->where('buyer_id', $user->id)
                    ->where('seller_id', $listing->user_id)
                    ->where('status', 'completed')
                    ->doesntHave('review')
                    ->latest()
                    ->value('id'),
            // Same, but for an order of this exact product, so the review
            // can be written right on this page.
            'listingReviewOrderId' => $isOwner
                ? null
                : Order::query()
                    ->where('buyer_id', $user->id)
                    ->where('listing_id', $listing->id)
                    ->where('status', 'completed')
                    ->doesntHave('review')
                    ->latest()
                    ->value('id'),
            'fromSeller' => $fromSeller,
            'similar' => $similar,
            'discover' => $discover,
            'favoriteIds' => $user->favorites()->pluck('listing_id'),
            'reportReasons' => \App\Models\Report::REASONS,
            'limits' => self::limits(),
        ]);
    }

    /**
     * Validation rules shared by create and update.
     *
     * @return array<string, array<int, mixed>>
     */
    private function rules(): array
    {
        return [
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'title' => ['required', 'string', 'min:'.Listing::TITLE_MIN, 'max:'.Listing::TITLE_MAX],
            'description' => ['required', 'string', 'min:'.Listing::DESCRIPTION_MIN, 'max:'.Listing::DESCRIPTION_MAX],
            // Whole or two-decimal amounts only, within a sensible range.
            'price' => [
                'required',
                'numeric',
                'decimal:0,2',
                'min:'.Listing::PRICE_MIN,
                'max:'.Listing::PRICE_MAX,
            ],
            'quantity' => [
                'required',
                'integer',
                'min:'.Listing::QUANTITY_MIN,
                'max:'.Listing::QUANTITY_MAX,
            ],
            'type' => ['required', 'in:item,service'],
            'condition' => ['nullable', 'string', Rule::in(Listing::CONDITIONS)],
        ];
    }

    /** Limits the forms display (kept in one place with the rules above). */
    public static function limits(): array
    {
        return [
            'title' => ['min' => Listing::TITLE_MIN, 'max' => Listing::TITLE_MAX],
            'description' => ['min' => Listing::DESCRIPTION_MIN, 'max' => Listing::DESCRIPTION_MAX],
            'price' => ['min' => Listing::PRICE_MIN, 'max' => Listing::PRICE_MAX],
            'quantity' => ['min' => Listing::QUANTITY_MIN, 'max' => Listing::QUANTITY_MAX],
        ];
    }

   public function store(Request $request): RedirectResponse
{
    $validated = $request->validate([
        ...$this->rules(),
        'images' => ['nullable', 'array', 'max:5'],
        'images.*' => ['image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
    ]);

    $listing = Listing::create([
        'user_id' => $request->user()->id,
        'category_id' => $validated['category_id'],
        'title' => $validated['title'],
        'slug' => str()->slug($validated['title']) . '-' . uniqid(),
        'description' => $validated['description'],
        'price' => $validated['price'],
        'quantity' => $validated['quantity'],
        'type' => $validated['type'],
        'status' => 'available',
        'condition' => $validated['condition'] ?? null,
    ]);

    if ($request->hasFile('images')) {
        foreach ($request->file('images') as $index => $image) {
            $path = $image->store('listings', 'public');

            $listing->images()->create([
                'path' => $path,
                'sort_order' => $index,
            ]);
        }
    }

    return redirect()
        ->route('marketplace')
        ->with('success', 'Listing created successfully.');
}


public function edit(Request $request, Listing $listing): Response
{
    Gate::authorize('update', $listing);

    

    $listing->load('images');

    $categories = Category::query()
        ->orderBy('name')
        ->get();

    return Inertia::render('Listings/Edit', [
        'listing' => $listing,
        'categories' => $categories,
        'limits' => self::limits(),
    ]);
}

public function update(Request $request, Listing $listing): RedirectResponse
{
    Gate::authorize('update', $listing);

    

    $rules = $this->rules();
    $wasSoldOut = $listing->quantity === 0;

    // A sold-out listing has 0 units; let its owner save other changes
    // without being forced to restock.
    if ($wasSoldOut) {
        $rules['quantity'] = ['required', 'integer', 'min:0', 'max:'.Listing::QUANTITY_MAX];
    }

    $validated = $request->validate([
        ...$rules,

        'remove_images' => ['nullable', 'array'],
        'remove_images.*' => ['integer', 'exists:listing_images,id'],

        'images' => ['nullable', 'array', 'max:5'],
        'images.*' => [
            'image',
            'mimes:jpeg,png,jpg,webp',
            'max:5120',
        ],
    ]);

    $imagesToRemove = $listing->images()
        ->whereIn('id', $validated['remove_images'] ?? [])
        ->get();

    foreach ($imagesToRemove as $image) {
        Storage::disk('public')->delete($image->path);
        $image->delete();
    }

    $newImages = $request->file('images', []);

    $currentImageCount = $listing->images()->count();

    if ($currentImageCount + count($newImages) > 5) {
        return back()
            ->withErrors([
                'images' => 'A listing can have a maximum of 5 images.',
            ])
            ->withInput();
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

    // Adding stock reopens a reserved or sold-out listing.
    if ($wasSoldOut && (int) $validated['quantity'] > 0) {
        $listing->update(['status' => 'available']);
    }

    $sortOrder = ($listing->images()->max('sort_order') ?? -1) + 1;

    foreach ($newImages as $image) {
        $path = $image->store('listings', 'public');

        $listing->images()->create([
            'path' => $path,
            'sort_order' => $sortOrder++,
        ]);
    }

    return redirect()
        ->route('listings.show', $listing)
        ->with('success', 'Listing updated successfully.');
}

public function destroy(Request $request, Listing $listing): RedirectResponse
{
    Gate::authorize('delete', $listing);

    

    $listing->load('images');

    foreach ($listing->images as $image) {
        Storage::disk('public')->delete($image->path);
    }

    $listing->delete();

    return redirect()
        ->route('listings.index')
        ->with('success', 'Listing deleted successfully.');
}
}