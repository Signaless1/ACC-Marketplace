<?php

namespace App\Support;

use App\Models\Report;
use App\Models\User;

/**
 * Suspends a user automatically once enough different people have an open
 * report against them. Runs every time a report is filed (see Report::booted),
 * so it covers listing, user and transaction reports alike.
 *
 * What counts:
 *  - Only OPEN reports (pending, reviewing, escalated). Resolved and
 *    dismissed reports have been dealt with by an admin, so they never push a
 *    reinstated user straight back into suspension.
 *  - DISTINCT reporters. Reporting someone twice (say a listing and then the
 *    seller) is still one voice, so one person cannot reach the threshold alone.
 *  - Reporters who are themselves suspended do not count, which blunts
 *    throw-away accounts being used to take someone down.
 *
 * Admins and already-suspended users are never touched.
 */
class AutoSuspension
{
    /** Report statuses that still need an admin's attention. */
    public const OPEN_STATUSES = ['pending', 'reviewing', 'escalated'];

    public static function threshold(): int
    {
        return max(2, (int) config('moderation.auto_suspend_reports', 2));
    }

    /**
     * Number of different people with an open report against this user.
     */
    public static function reporterCount(User $user): int
    {
        return Report::query()
            ->where('reported_user_id', $user->id)
            ->whereIn('status', self::OPEN_STATUSES)
            ->where('reporter_id', '!=', $user->id)
            ->whereHas('reporter', fn ($q) => $q->whereNull('suspended_at'))
            ->distinct()
            ->count('reporter_id');
    }

    /**
     * Suspend the user if they have reached the threshold.
     *
     * @return bool true when this call suspended the user
     */
    public static function check(?User $user): bool
    {
        if (! $user || $user->isAdmin() || $user->isSuspended()) {
            return false;
        }

        $count = self::reporterCount($user);

        if ($count < self::threshold()) {
            return false;
        }

        // Conditional update: if two reports land at once, only one of them
        // performs the suspension and the other sees 0 rows changed.
        $changed = User::query()
            ->whereKey($user->id)
            ->whereNull('suspended_at')
            ->where('role', '!=', 'admin')
            ->update([
                'suspended_at' => now(),
                'suspension_reason' => "Automatically suspended: reported by {$count} different users. "
                    .'An administrator will review the reports.',
            ]);

        return $changed > 0;
    }
}
