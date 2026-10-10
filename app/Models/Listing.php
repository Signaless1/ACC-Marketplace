<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Listing extends Model
{
    /** Input limits, shared by the create and update forms. */
    public const TITLE_MIN = 3;
    public const TITLE_MAX = 100;
    public const DESCRIPTION_MIN = 10;
    public const DESCRIPTION_MAX = 2000;
    public const PRICE_MIN = 1;
    public const PRICE_MAX = 999999.99;
    public const QUANTITY_MIN = 1;
    public const QUANTITY_MAX = 999;

    public const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Used'];

    /** Reasons a moderator can give when taking a listing down. */
    public const REMOVAL_REASONS = [
        'prohibited' => 'Prohibited item or service',
        'misleading' => 'Misleading or inaccurate listing',
        'scam' => 'Suspected scam or fraud',
        'inappropriate' => 'Inappropriate content',
        'duplicate' => 'Duplicate listing',
        'spam' => 'Spam',
        'wrong_category' => 'Wrong category',
        'other' => 'Other',
    ];

    protected $fillable = [
        'user_id',
        'category_id',
        'title',
        'slug',
        'description',
        'price',
        'quantity',
        'type',
        'status',
        'condition',
        'hidden_at',
        'removed_reason',
        'removed_note',
        'removed_by',
    ];

    protected function casts(): array
    {
        return [
            'hidden_at' => 'datetime',
            'quantity' => 'integer',
        ];
    }

    /**
     * Listings that may appear publicly: not hidden by a moderator and
     * not owned by a suspended account.
     */
    public function scopeVisible(Builder $query): Builder
    {
        return $query
            ->whereNull('hidden_at')
            ->whereHas('seller', fn ($q) => $q->whereNull('suspended_at'));
    }

    /**
     * Adds `rating_average` and `rating_count` (product ratings only) so
     * cards can show stars without loading every review.
     */
    public function scopeWithProductRating(Builder $query): Builder
    {
        return $query
            ->withAvg(
                ['reviews as rating_average' => fn ($q) => $q->whereNotNull('product_rating')],
                'product_rating'
            )
            ->withCount(
                ['reviews as rating_count' => fn ($q) => $q->whereNotNull('product_rating')]
            );
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ListingImage::class);
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}