<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Message extends Model
{
    protected $fillable = [
        'conversation_id',
        'sender_id',
        'body',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
            'deleted_for_everyone_at' => 'datetime',
        ];
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

    /** People who removed this message from their own view ("delete for me"). */
    public function deletions(): HasMany
    {
        return $this->hasMany(MessageDeletion::class);
    }

    public function isDeletedForEveryone(): bool
    {
        return $this->deleted_for_everyone_at !== null;
    }

    /**
     * Messages this person has not removed from their own view. Messages that
     * were deleted for everyone are still returned (as a "deleted" placeholder);
     * hide them with scopeNotDeletedForEveryone() where they should not appear.
     */
    public function scopeVisibleTo(Builder $query, int $userId): Builder
    {
        return $query->whereDoesntHave(
            'deletions',
            fn ($deletions) => $deletions->where('user_id', $userId)
        );
    }

    public function scopeNotDeletedForEveryone(Builder $query): Builder
    {
        return $query->whereNull('deleted_for_everyone_at');
    }

    /**
     * Strip the content of a message that was deleted for everyone before it
     * is sent to a browser, and flag it so the screen can show a placeholder.
     * The database row is untouched; this only changes the in-memory copy.
     */
    public function redact(): static
    {
        $deleted = $this->isDeletedForEveryone();

        if ($deleted) {
            $this->setAttribute('body', null);
            $this->setRelation('attachments', $this->newCollection());
        }

        $this->setAttribute('deleted', $deleted);

        return $this;
    }
}
