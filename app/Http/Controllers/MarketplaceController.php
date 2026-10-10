<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Listing;
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
            'sort' => ['nullable', 'in:newest,oldest,price_asc,price_desc'],
        ]);

        $availability = $filters['availability'] ?? 'available';
        $sort = $filters['sort'] ?? 'newest';
        $search = trim($filters['q'] ?? '');

        $query = Listing::query()
            ->visible()
            ->with(['category', 'images', 'seller:id,name'])
            ->withProductRating()
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

        match ($sort) {
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
            ],
        ]);
    }
}
