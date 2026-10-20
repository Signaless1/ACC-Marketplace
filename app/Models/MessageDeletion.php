<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One person's "delete for me" on one message.
 */
class MessageDeletion extends Model
{
    public $timestamps = false;

    protected $fillable = ['message_id', 'user_id', 'created_at'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
