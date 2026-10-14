<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Message extends Model
{
    protected $fillable = [
        'conversation_id',
        'sender_id',
        'body',
    ];

    protected $appends = ['is_deleted'];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
            'deleted_for_everyone_at' => 'datetime',
        ];
    }

    /**
     * True once the sender has deleted the message for everyone.
     */
    protected function isDeleted(): Attribute
    {
        return Attribute::get(fn () => $this->deleted_for_everyone_at !== null);
    }

    /**
     * Never send the content of a message that was deleted for everyone to
     * the browser, whichever page or query it came through. Admins reviewing
     * a reported transaction read it from TransactionSummary instead.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $array = parent::toArray();

        if ($this->deleted_for_everyone_at !== null) {
            $array['body'] = null;

            if (array_key_exists('attachments', $array)) {
                $array['attachments'] = [];
            }
        }

        return $array;
    }

    /**
     * People who used "Delete for me" on this message.
     */
    public function hiddenBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'message_deletions')->withTimestamps();
    }

    /**
     * Messages this person has not deleted for themselves. Messages deleted
     * for everyone stay in (they show as "This message was deleted").
     */
    public function scopeVisibleTo(Builder $query, int $userId): Builder
    {
        return $query->whereDoesntHave(
            'hiddenBy',
            fn ($q) => $q->where('users.id', $userId)
        );
    }

    /**
     * Messages with real content for this person: not deleted for everyone and
     * not deleted for them. Used for unread counts and notification previews.
     */
    public function scopeLiveFor(Builder $query, int $userId): Builder
    {
        return $query
            ->whereNull('deleted_for_everyone_at')
            ->visibleTo($userId);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }
}