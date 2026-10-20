<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A suspended person's request for an admin to look at the decision again.
 */
class SuspensionAppeal extends Model
{
    public const STATUSES = ['pending', 'accepted', 'denied'];

    protected $fillable = [
        'user_id',
        'message',
        'status',
        'decided_by',
        'decided_at',
        'decision_note',
    ];

    protected function casts(): array
    {
        return ['decided_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }
}
