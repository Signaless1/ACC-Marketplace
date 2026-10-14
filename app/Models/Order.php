<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    protected $fillable = [
        'listing_id',
        'buyer_id',
        'seller_id',
        'price',
        'quantity',
        'status',
        'confirmed_at',
        'completed_at',
        'cancelled_at',
        'cancelled_by',
        'cancel_reason',
    ];

    protected $appends = ['reference', 'total'];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'quantity' => 'integer',
            'confirmed_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    /** Human-friendly order number, e.g. ACC-000042. */
    protected function reference(): Attribute
    {
        return Attribute::get(
            fn () => 'ACC-'.str_pad((string) $this->id, 6, '0', STR_PAD_LEFT)
        );
    }

    /** Unit price x quantity (the unit price is a snapshot from order time). */
    protected function total(): Attribute
    {
        return Attribute::get(
            fn () => number_format((float) $this->price * (int) $this->quantity, 2, '.', '')
        );
    }

    public function canceller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function isOpen(): bool
    {
        return in_array($this->status, ['pending', 'confirmed'], true);
    }

    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }

    public function reports(): HasMany
    {
        return $this->hasMany(Report::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(OrderEvent::class);
    }
}
