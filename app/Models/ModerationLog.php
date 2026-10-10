<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ModerationLog extends Model
{
    protected $fillable = [
        'admin_id',
        'listing_id',
        'listing_title',
        'seller_id',
        'action',
        'reason',
        'note',
    ];

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
