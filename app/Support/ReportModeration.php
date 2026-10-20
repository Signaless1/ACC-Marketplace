<?php

namespace App\Support;

use App\Models\Report;
use App\Models\ReportEvent;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * The rules that decide when reports are enough to suspend someone, and the
 * brakes that stop the same machinery from being used as a weapon.
 *
 * AUTOMATIC SUSPENSION
 * An account is suspended automatically when at least two different people
 * (see threshold()) have filed reports that all pass these tests:
 *
 *   - filed inside the rolling window, not dismissed, not marked false;
 *   - about conduct (duplicate-listing and "other" reports never count);
 *   - backed by a written description or an attached file;
 *   - from a reporter who is in good standing: not suspended, has a phone
 *     number on file and, in production, is not a brand-new account;
 *   - not a retaliation: a report is ignored if its subject had already
 *     reported the reporter, so a counter-report in a dispute cannot knock
 *     out whoever complained first;
 *   - filed after the account was last reinstated by an admin.
 *
 * Every report still goes to the admin queue whether or not it counts here.
 * Counting is only about whether the machine may act before a human has.
 *
 * An automatic suspension is a precaution, not a verdict. It is lifted by
 * itself if the count falls back under the threshold (for example because an
 * admin dismissed a report), and it can be appealed. An admin's own
 * suspension is never touched by this class.
 */
class ReportModeration
{
    /** The number of different reporters that triggers a suspension. Never below 2. */
    public static function threshold(): int
    {
        return max(2, (int) config('marketplace.reports.auto_suspend_threshold', 2));
    }

    public static function windowDays(): int
    {
        return max(1, (int) config('marketplace.reports.window_days', 30));
    }

    /**
     * The reports about this person that count towards an automatic suspension.
     *
     * @return Builder<Report>
     */
    public static function qualifyingReports(User $target): Builder
    {
        $minLength = max(1, (int) config('marketplace.reports.min_details_length', 20));
        $minAgeHours = max(0, (int) config('marketplace.reports.min_reporter_age_hours', 0));

        // Count from the start of the window, or from the last reinstatement
        // if that is more recent.
        $since = now()->subDays(self::windowDays());

        if ($target->reinstated_at !== null && $target->reinstated_at->greaterThan($since)) {
            $since = $target->reinstated_at;
        }

        return Report::query()
            ->where('reports.reported_user_id', $target->id)
            ->where('reports.created_at', '>', $since)
            ->whereIn('reports.status', ['pending', 'reviewing', 'escalated', 'resolved'])
            ->where('reports.bad_faith', false)
            ->whereNotIn('reports.reason', Report::NON_SUSPENDABLE_REASONS)
            ->where(function (Builder $query) use ($minLength) {
                $query
                    ->whereRaw("length(coalesce(reports.description, '')) >= ?", [$minLength])
                    ->orHas('attachments');
            })
            ->whereHas('reporter', function (Builder $query) use ($minAgeHours) {
                $query
                    ->whereNull('suspended_at')
                    ->whereNotNull('phone')
                    ->where('created_at', '<=', now()->subHours($minAgeHours));
            })
            // Retaliation guard: skip a report when the person it is about had
            // already (and not in bad faith) reported the reporter.
            ->whereNotExists(function ($earlier) {
                $earlier->select(DB::raw(1))
                    ->from('reports as earlier')
                    ->whereColumn('earlier.reporter_id', 'reports.reported_user_id')
                    ->whereColumn('earlier.reported_user_id', 'reports.reporter_id')
                    ->whereColumn('earlier.created_at', '<', 'reports.created_at')
                    ->where('earlier.bad_faith', false);
            });
    }

    /** How many DIFFERENT people have filed qualifying reports about this person. */
    public static function qualifyingReporterCount(User $target): int
    {
        return (int) self::qualifyingReports($target)
            ->distinct()
            ->count('reports.reporter_id');
    }

    /**
     * Suspend or reinstate an account if the reports call for it.
     *
     * @param  Report|null  $trigger  the report that caused this check, for the audit trail
     * @return 'suspended'|'lifted'|null  what changed, if anything
     */
    public static function evaluate(?User $target, ?Report $trigger = null): ?string
    {
        if ($target === null || $target->isAdmin()) {
            return null;
        }

        return DB::transaction(function () use ($target, $trigger) {
            // Lock the row so two reports arriving together cannot both act.
            $user = User::query()->whereKey($target->id)->lockForUpdate()->first();

            if ($user === null || $user->isAdmin()) {
                return null;
            }

            $count = self::qualifyingReporterCount($user);
            $threshold = self::threshold();

            if (! $user->isSuspended() && $count >= $threshold) {
                $user->forceFill([
                    'suspended_at' => now(),
                    'suspension_type' => 'auto',
                    'suspension_reason' => "Automatically suspended: {$count} different people reported this account. "
                        .'An administrator is reviewing the reports.',
                ])->save();

                foreach (self::qualifyingReports($user)->pluck('reports.id') as $reportId) {
                    ReportEvent::query()->create([
                        'report_id' => $reportId,
                        'user_id' => null,
                        'event' => 'auto_suspended',
                        'note' => "Reported account suspended automatically ({$count} separate reports).",
                        'created_at' => now(),
                    ]);
                }

                return 'suspended';
            }

            // Only lift what the algorithm did. A manual suspension is the
            // admins' decision and stays until they undo it.
            if ($user->isAutoSuspended() && $count < $threshold) {
                $user->forceFill([
                    'suspended_at' => null,
                    'suspension_type' => null,
                    'suspension_reason' => null,
                ])->save();

                if ($trigger !== null) {
                    ReportEvent::record(
                        $trigger,
                        'auto_lifted',
                        null,
                        'Automatic suspension lifted: fewer than '.$threshold.' valid reports remain.'
                    );
                }

                return 'lifted';
            }

            return null;
        });
    }

    /**
     * Why this person may not file another report right now, or null if they
     * may. Two brakes: a daily cap, and a pause for people whose reports an
     * admin keeps finding to be false.
     */
    public static function blockedFromReporting(User $user): ?string
    {
        $strikeLimit = max(1, (int) config('marketplace.reports.strike_limit', 3));
        $strikeDays = max(1, (int) config('marketplace.reports.strike_window_days', 90));

        $strikes = Report::query()
            ->where('reporter_id', $user->id)
            ->where('bad_faith', true)
            ->where('reviewed_at', '>=', now()->subDays($strikeDays))
            ->count();

        if ($strikes >= $strikeLimit) {
            return 'Reporting is paused on your account because several of your reports were found to be false. '
                .'Contact an administrator if you think this is a mistake.';
        }

        $dailyLimit = max(1, (int) config('marketplace.reports.daily_limit', 5));

        $today = Report::query()
            ->where('reporter_id', $user->id)
            ->where('created_at', '>=', now()->subDay())
            ->count();

        if ($today >= $dailyLimit) {
            return 'You have reached the limit of '.$dailyLimit.' reports per day. Please try again tomorrow.';
        }

        return null;
    }

    /**
     * Whether this person already had a report about the same listing or user
     * dismissed recently. Stops the same complaint from being resubmitted over
     * and over after an admin has looked at it.
     *
     * @param  array{listing_id: int|null, reported_user_id: int|null}  $target
     */
    public static function recentlyDismissed(User $reporter, array $target): bool
    {
        $days = max(1, (int) config('marketplace.reports.refile_cooldown_days', 7));

        return Report::query()
            ->where('reporter_id', $reporter->id)
            ->where('reported_user_id', $target['reported_user_id'])
            ->where('listing_id', $target['listing_id'])
            ->whereNull('order_id')
            ->where('status', 'dismissed')
            ->where('reviewed_at', '>=', now()->subDays($days))
            ->exists();
    }
}
