<?php

namespace App\Support;

use App\Models\Review;

/**
 * Aggregated seller reputation, always computed from the reviews table
 * with aggregate queries (never from a paginated subset).
 */
class SellerRating
{
    /**
     * @return array{average: float|null, count: int, distribution: array<int,int>}
     *         distribution is keyed 5..1 with the number of reviews at each star level.
     */
    public static function summary(int $sellerId): array
    {
        $counts = Review::query()
            ->where('seller_id', $sellerId)
            ->selectRaw('rating, COUNT(*) as total')
            ->groupBy('rating')
            ->pluck('total', 'rating');

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
