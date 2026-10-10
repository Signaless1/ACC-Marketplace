<?php

namespace App\Support;

use App\Models\Review;

/**
 * Aggregated rating of a single product (listing). Only reviews that carry a
 * product rating count; older seller-only reviews are ignored here.
 */
class ProductRating
{
    /**
     * @return array{average: float|null, count: int, distribution: array<int,int>}
     */
    public static function summary(int $listingId): array
    {
        $counts = Review::query()
            ->where('listing_id', $listingId)
            ->whereNotNull('product_rating')
            ->selectRaw('product_rating, COUNT(*) as total')
            ->groupBy('product_rating')
            ->pluck('total', 'product_rating');

        $distribution = [];
        $count = 0;
        $sum = 0;

        foreach ([5, 4, 3, 2, 1] as $star) {
            $n = (int) ($counts[$star] ?? 0);
            $distribution[$star] = $n;
            $count += $n;
            $sum += $n * $star;
        }

        return [
            'average' => $count > 0 ? round($sum / $count, 1) : null,
            'count' => $count,
            'distribution' => $distribution,
        ];
    }
}
