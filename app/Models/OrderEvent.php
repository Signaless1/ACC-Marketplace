<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderEvent extends Model
{
    public $timestamps = false;

    protected $fillable = ['order_id', 'user_id', 'event', 'created_at'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function record(Order $order, string $event, ?int $userId): self
    {
        return static::create([
            'order_id' => $order->id,
            'user_id' => $userId,
            'event' => $event,
            'created_at' => now(),
        ]);
    }
}
