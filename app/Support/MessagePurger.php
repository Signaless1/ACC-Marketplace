<?php

namespace App\Support;

use App\Models\Message;
use App\Models\Report;

/**
 * Permanently removes the content of messages that were deleted for everyone
 * once the retention period is over.
 *
 * Until then the content stays on file so that "delete for everyone" cannot be
 * used to destroy evidence. It is NEVER purged while a report between the two
 * people is still open, however old the deletion is.
 */
class MessagePurger
{
    /**
     * @return int how many messages were purged
     */
    public static function run(): int
    {
        $days = max(1, (int) config('marketplace.messages.deleted_retention_days', 30));
        $purged = 0;

        Message::query()
            ->whereNotNull('deleted_for_everyone_at')
            ->where('deleted_for_everyone_at', '<', now()->subDays($days))
            // Only messages that still hold something.
            ->where(fn ($query) => $query->whereNotNull('body')->orHas('attachments'))
            ->with(['conversation', 'attachments'])
            ->chunkById(200, function ($messages) use (&$purged) {
                foreach ($messages as $message) {
                    $conversation = $message->conversation;

                    if ($conversation && Report::openBetween($conversation->buyer_id, $conversation->seller_id)) {
                        continue;
                    }

                    Attachments::deleteFor($message);

                    $message->forceFill(['body' => null])->save();

                    $purged++;
                }
            });

        return $purged;
    }
}
