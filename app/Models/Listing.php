<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Listing extends Model
{
    protected $fillable = [
        'user_id',
        'category_id',
        'title',
        'slug',
        'description',
        'price',
        'type',
        'status',
        'condition',
        'quantity',
        'hidden_at',
        'removed_reason',
        'removed_note',
        'removed_by',
    ];

    public const TYPES = ['item', 'service'];

    public const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Used'];

    public const MAX_IMAGES = 8;
    public const MAX_PRICE = 999999.99;
    public const MAX_QUANTITY = 999;

    /** Reasons a moderator can give when removing a listing. */
    public const REMOVAL_REASONS = [
        'prohibited' => 'Prohibited item or service',
        'scam' => 'Suspected scam or fraud',
        'misleading' => 'Misleading title, photos or price',
        'inappropriate' => 'Inappropriate content',
        'duplicate' => 'Duplicate listing',
        'spam' => 'Spam',
        'other' => 'Other (see note)',
    ];

    protected function casts(): array
    {
        return [
            'hidden_at' => 'datetime',
            'quantity' => 'integer',
            'price' => 'decimal:2',
        ];
    }

    protected $appends = ['removed_reason_label'];

    protected function removedReasonLabel(): Attribute
    {
        return Attribute::get(
            fn () => $this->removed_reason
                ? (self::REMOVAL_REASONS[$this->removed_reason] ?? $this->removed_reason)
                : null
        );
    }

    public function isRemoved(): bool
    {
        return $this->hidden_at !== null;
    }

    /**
     * Keep `status` consistent with stock and open orders:
     * units left -> available; none left but orders open -> reserved; else sold.
     */
    public function syncStatus(): void
    {
        $hasOpenOrders = $this->orders()
            ->whereIn('status', ['pending', 'confirmed'])
            ->exists();

        $status = $this->quantity > 0
            ? 'available'
            : ($hasOpenOrders ? 'reserved' : 'sold');

        if ($this->status !== $status) {
            $this->forceFill(['status' => $status])->save();
        }
    }

    /**
     * Everything a listing card needs: relations plus product rating,
     * favourite count and sold units.
     */
    public function scopeForCards(Builder $query): Builder
    {
        return $query
            ->with(['category:id,name', 'images', 'seller:id,name'])
            ->withAvg('reviews as rating_avg', 'product_rating')
            ->withCount([
                'reviews as rating_count' => fn ($q) => $q->whereNotNull('product_rating'),
                'favorites',
            ]);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function remover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'removed_by');
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