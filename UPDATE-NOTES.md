# ACC Marketplace update - how to apply

Copy the folders in this zip over your project (same paths). Nothing else in your
project was touched. Your `.env`, database and `public/images` are not included.

```cmd
php artisan migrate
php artisan storage:link        (only if you never ran it)
npm run dev                     (or: npm run build)
```

## php.ini (needed for videos and big files)

Attachments allow 5 files, 20 MB each. PHP's default limits are 2 MB / 8 MB, so raise them
and restart `php artisan serve`:

```
upload_max_filesize = 25M
post_max_size = 110M
```

Without this, small images work but videos fail with "files are too large".

## What the migrations do to existing data

- Existing listings get `quantity = 1` (or 0 if they are already reserved/sold).
- Existing reviews keep their seller rating; their product rating stays empty
  (they simply don't count toward product stars).
- Nothing is deleted.

## Tests

`php artisan test` - 113 tests (the original 71, adjusted where behavior changed, plus 42 new
ones in `tests/Feature/MarketplaceUpgradeTest.php`).
