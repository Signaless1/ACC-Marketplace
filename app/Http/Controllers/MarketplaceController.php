<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Listing;
use App\Models\Review;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MarketplaceController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'integer'],
            'type' => ['nullable', 'in:item,service'],
            'min_price' => ['nullable', 'numeric', 'min:0'],
            'max_price' => ['nullable', 'numeric', 'min:0'],
            'availability' => ['nullable', 'in:available,all'],
            'sort' => ['nullable', 'in:newest,oldest,price_asc,price_desc,top_rated,popular'],
            'min_rating' => ['nullable', 'integer', 'between:1,5'],
        ]);

        $availability = $filters['availability'] ?? 'available';
        $sort = $filters['sort'] ?? 'newest';
        $search = trim($filters['q'] ?? '');

        $query = Listing::query()
            ->visible()
            ->forCards()
            ->when(
                $availability === 'available',
                fn ($q) => $q->where('status', 'available')
            )
            ->when(
                $search !== '',
                function ($q) use ($search) {
                    $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $search).'%';

                    $q->where(function ($q) use ($like) {
                        $q->where('title', 'like', $like)
                            ->orWhere('description', 'like', $like)
                            ->orWhereHas('category', fn ($c) => $c->where('name', 'like', $like))
                            ->orWhereHas('seller', fn ($s) => $s->where('name', 'like', $like));
                    });
                }
            )
            ->when(
                ! empty($filters['category']),
                fn ($q) => $q->where('category_id', $filters['category'])
            )
            ->when(
                ! empty($filters['type']),
                fn ($q) => $q->where('type', $filters['type'])
            )
            ->when(
                isset($filters['min_price']) && $filters['min_price'] !== '',
                fn ($q) => $q->where('price', '>=', $filters['min_price'])
            )
            ->when(
                isset($filters['max_price']) && $filters['max_price'] !== '',
                fn ($q) => $q->where('price', '<=', $filters['max_price'])
            );

        if (! empty($filters['min_rating'])) {
            $query->whereIn('id', Review::query()
                ->select('listing_id')
                ->whereNotNull('product_rating')
                ->groupBy('listing_id')
                ->havingRaw('AVG(product_rating) >= ?', [(int) $filters['min_rating']]));
        }

        match ($sort) {
            'top_rated' => $query->orderByDesc('rating_avg')->orderByDesc('rating_count')->latest(),
            'popular' => $query->orderByDesc('favorites_count')->orderByDesc('views_count')->latest(),
            'oldest' => $query->oldest(),
            'price_asc' => $query->orderBy('price')->latest(),
            'price_desc' => $query->orderByDesc('price')->latest(),
            default => $query->latest(),
        };

        $listings = $query->paginate(12)->withQueryString();

        $favoriteIds = $request->user()
            ? $request->user()->favorites()->pluck('listing_id')
            : [];

        return Inertia::render('Marketplace', [
            'listings' => $listings,
            'categories' => Category::query()->orderBy('name')->get(),
            'favoriteIds' => $favoriteIds,
            'filters' => [
                'q' => $search,
                'category' => $filters['category'] ?? '',
                'type' => $filters['type'] ?? '',
                'min_price' => $filters['min_price'] ?? '',
                'max_price' => $filters['max_price'] ?? '',
                'availability' => $availability,
                'sort' => $sort,
                'min_rating' => $filters['min_rating'] ?? '',
            ],
        ]);
    }
}
