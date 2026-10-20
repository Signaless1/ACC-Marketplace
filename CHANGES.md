# ACC Marketplace: phone numbers, message deletion, fair reports

Unzip over your project root (paths are preserved), then:

    php artisan migrate        # 4 new migrations, all safe on a database that already has data
    php artisan test           # 119 new tests plus your existing ones
    npm run build

**None of the PHP was executed while this was written (no PHP runtime was available), so run the tests first.**

## What was added

| Request | Where |
|---|---|
| Auto-suspend at 2+ reports | `app/Support/ReportModeration.php`, tuned in `config/marketplace.php` |
| Philippine phone number | `app/Support/PhoneNumber.php`, `app/Rules/PhilippineMobile.php`, `resources/js/lib/phone.ts` |
| Delete for me / for everyone | `MessageController::destroy`, `Message` model, `DeleteMessageDialog.tsx` |
| Fair report system | `ReportController`, `Reports/Index.tsx` (new "My reports"), `Admin/Reports.tsx` |
| Appeals for suspended users | `AppealController`, `Appeal.tsx` (linked from the login error) |

## Auto-suspension rules

An account is suspended when **2 or more different people** (never below 2, even if the config says 1) filed reports that all:
are within 30 days; are not dismissed or marked false; are about conduct (not "duplicate" or "other");
have a written description (20+ characters) or an attached file; come from an account that is not suspended and has a phone number
(and, in production, is at least 24 hours old); and are not a counter-report from someone the target had already reported.
It is lifted automatically if reports are dismissed and fewer than 2 valid ones remain. An admin's own suspension is never lifted automatically.
Reinstating someone resets the count.

## .env settings (all optional)

    REPORTS_AUTO_SUSPEND_THRESHOLD=2        # never below 2
    REPORTS_WINDOW_DAYS=30
    REPORTS_MIN_REPORTER_AGE_HOURS=24       # defaults to 0 outside production so you can test locally
    REPORTS_DAILY_LIMIT=5
    REPORTS_REFILE_COOLDOWN_DAYS=7
    REPORTS_STRIKE_LIMIT=3                  # false reports in 90 days that pause someone's reporting
    MESSAGES_DELETED_RETENTION_DAYS=30
    APPEALS_COOLDOWN_DAYS=7

## Needs a scheduler

"Delete for everyone" hides a message at once but keeps its content for admins for 30 days (so a dispute cannot be erased), then
`messages:purge-deleted` removes it. That only runs if the scheduler does: add `* * * * * php artisan schedule:run` to cron.
Until then deleted content is simply kept.

## Also fixed

`resources/js/types/shared.ts` now exports `formatBytes`. Three existing files import it and it did not exist, which breaks `npm run build`.

## Round 2

| Request | Where |
|---|---|
| Nav underline stays on the section you are in | `resources/js/pages/Home.tsx` (scroll-spy; a clicked link stays underlined while the page scrolls) |
| Phone field stops at the real length | `resources/js/lib/phone.ts`: 0917 = 11 digits, +63 = 12 digits after the +, 917 = 10; spaces added as you type |
| Fake emails refused (`test@emaill.com`) | `app/Support/EmailCheck.php`, `app/Rules/RealEmail.php` |
| Forgot password | `PasswordResetController`, `ForgotPassword.tsx`, `ResetPassword.tsx`, link on the login page |

### Email checks
Always refused: disposable mailbox services (mailinator, yopmail...) and misspelled popular domains (emaill.com, gmial.com, gmail.con), with a "Did you mean...?" message.
Also refused when `EMAIL_STRICT` is on (the default everywhere except tests): sample domains (`@example.com`) and domains with no mail server (a DNS lookup, so the server needs internet).
For offline local development set `EMAIL_STRICT=false`.
No check can prove that a particular mailbox exists without sending to it; the reset email is that proof.

### Forgot password needs email to work
Out of the box Laravel only writes emails to `storage/logs/laravel.log` (`MAIL_MAILER=log`), so for testing you can copy the reset link from there.
To really send mail, set these in `.env` (Gmail example; it needs a Google "App password", not your normal one):

    MAIL_MAILER=smtp
    MAIL_HOST=smtp.gmail.com
    MAIL_PORT=587
    MAIL_USERNAME=youraddress@gmail.com
    MAIL_PASSWORD=your-app-password
    MAIL_ENCRYPTION=tls
    MAIL_FROM_ADDRESS=youraddress@gmail.com
    MAIL_FROM_NAME="ACC Marketplace"

The process: enter email -> a single-use link (valid 60 minutes) is emailed -> choose a new password -> every other device is logged out -> log in.
The page answers the same whether or not the email has an account, and each account gets at most one reset email a minute.

## Round 3: your new landing page design

`resources/js/pages/Home.tsx` and `resources/css/app.css` are your new design files, unchanged except for:
- Home.tsx: the header links now keep their underline for the section you are in (scroll-spy; a clicked link stays underlined while the page scrolls there). Everything else, including your scroll handler, reveals and slider, is exactly as you sent it.
- app.css: one rule added next to your `.nv:hover::after` so the current section's link shows the same underline.
The old landing page's animation classes (`site-*`, `is-in`) are gone from the stylesheet, which is fine: only the old Home used them.
