<?php

/*
|--------------------------------------------------------------------------
| Marketplace rules
|--------------------------------------------------------------------------
|
| Every number that decides how strict moderation is lives here, so it can be
| tuned from .env without touching code.
|
*/

return [

    'reports' => [

        // How many DIFFERENT people must report an account before it is
        // suspended automatically. A floor of 2 is enforced in code
        // (see ReportModeration::threshold): one report is never enough.
        'auto_suspend_threshold' => (int) env('REPORTS_AUTO_SUSPEND_THRESHOLD', 2),

        // Only reports filed inside this rolling window count.
        'window_days' => (int) env('REPORTS_WINDOW_DAYS', 30),

        // A reporter's account must be at least this old for their report to
        // count towards an automatic suspension (their report still reaches
        // the admins either way). This stops someone from creating two fresh
        // accounts to knock a rival out. It is relaxed outside production so
        // you can try the feature locally; set it explicitly to override.
        'min_reporter_age_hours' => (int) env(
            'REPORTS_MIN_REPORTER_AGE_HOURS',
            env('APP_ENV') === 'production' ? 24 : 0
        ),

        // Reports one person may file per rolling 24 hours.
        'daily_limit' => (int) env('REPORTS_DAILY_LIMIT', 5),

        // After a report about someone is dismissed, the same person cannot
        // report the same listing or user again for this many days.
        'refile_cooldown_days' => (int) env('REPORTS_REFILE_COOLDOWN_DAYS', 7),

        // Reports an admin has marked as false/malicious ("strikes"). Reaching
        // the limit inside the window pauses that person's ability to report.
        'strike_limit' => (int) env('REPORTS_STRIKE_LIMIT', 3),
        'strike_window_days' => (int) env('REPORTS_STRIKE_WINDOW_DAYS', 90),

        // A report needs this much written detail (or an attached file) before
        // it can count towards an automatic suspension.
        'min_details_length' => 20,
    ],

    'email' => [

        // Registration refuses addresses whose domain does not really exist or
        // cannot receive mail (a DNS lookup), and sample addresses such as
        // @example.com. This needs internet access from the server. Set
        // EMAIL_STRICT=false in .env for offline local development.
        // Disposable-mail services and misspelled domains (gmial.com) are
        // always refused, whatever this is set to.
        'strict' => filter_var(env('EMAIL_STRICT', env('APP_ENV') !== 'testing'), FILTER_VALIDATE_BOOLEAN),
    ],

    'messages' => [

        // "Delete for everyone" hides a message from both people straight
        // away. The content is kept for admins this many days so a dispute
        // cannot be erased, then purged (never while a report is open).
        'deleted_retention_days' => (int) env('MESSAGES_DELETED_RETENTION_DAYS', 30),
    ],

    'appeals' => [

        // After an appeal is denied, wait this long before appealing again.
        'cooldown_days' => (int) env('APPEALS_COOLDOWN_DAYS', 7),
    ],

];
