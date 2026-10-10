# How to apply

1. Extract this zip over your project folder (same paths, it overwrites).
2. `php artisan migrate`   (5 new migrations, nothing is dropped)
3. `php artisan storage:link`   (if you haven't already; needed for uploads)
4. `npm install` then `npm run build`   (or `npm run dev`)

Uploads: PHP's default `upload_max_filesize` (2 MB) and `post_max_size` (8 MB) are smaller
than the 20 MB attachment limit. Raise them in php.ini (e.g. 25M / 30M) to allow big videos.
