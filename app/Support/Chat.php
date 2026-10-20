<?php

namespace App\Support;

use App\Models\Message;
use Illuminate\Database\Eloquent\Collection;

/**
 * Helpers for showing conversations to one particular person, who may have
 * deleted some messages "for me" and may be looking at messages the other
 * person deleted "for everyone".
 */
class Chat
{
    /**
     * Give every conversation a `latestMessage` that is the newest message
     * THIS person has not removed from their own view. Messages deleted for
     * everyone stay in place as a redacted "deleted" placeholder, so a chat
     * list never keeps showing text that was supposed to be gone.
     *
     * Two queries for the whole list, however many conversations it holds.
     *
     * @param  Collection<int, \App\Models\Conversation>  $conversations
     */
    public static function attachLatestVisible(Collection $conversations, int $userId): void
    {
        if ($conversations->isEmpty()) {
            return;
        }

        $latestIds = Message::query()
            ->whereIn('conversation_id', $conversations->pluck('id'))
            ->visibleTo($userId)
            ->selectRaw('MAX(id) as id')
            ->groupBy('conversation_id')
            ->pluck('id');

        $latest = Message::query()
            ->with('attachments')
            ->whereIn('id', $latestIds)
            ->get()
            ->map(fn (Message $message) => $message->redact())
            ->keyBy('conversation_id');

        foreach ($conversations as $conversation) {
            $conversation->setRelation('latestMessage', $latest->get($conversation->id));
        }
    }
}
