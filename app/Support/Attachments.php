<?php

namespace App\Support;

use App\Models\Attachment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * One place for every file-upload rule used by chat and reviews.
 */
class Attachments
{
    public const MAX_KB = 25600; // 25 MB per file

    /** Allowed in private chat. */
    public const CHAT_TYPES = [
        'jpg', 'jpeg', 'png', 'webp', 'gif',
        'mp4', 'webm', 'mov',
        'pdf', 'txt', 'docx', 'xlsx', 'pptx',
    ];

    /** Reviews are public, so only media and PDFs. */
    public const REVIEW_TYPES = [
        'jpg', 'jpeg', 'png', 'webp', 'gif',
        'mp4', 'webm', 'mov',
        'pdf',
    ];

    /**
     * Validation rules for an array of uploaded files.
     *
     * @param  array<int, string>  $types
     * @return array<string, array<int, string>>
     */
    public static function rules(string $field, int $maxFiles, array $types): array
    {
        return [
            $field => ['nullable', 'array', 'max:'.$maxFiles],
            $field.'.*' => [
                'file',
                'max:'.self::MAX_KB,
                'mimes:'.implode(',', $types),
            ],
        ];
    }

    /**
     * Friendly messages for the rules above.
     *
     * @return array<string, string>
     */
    public static function messages(string $field, int $maxFiles, array $types): array
    {
        $mb = (int) (self::MAX_KB / 1024);

        return [
            $field.'.max' => "You can attach up to {$maxFiles} files at a time.",
            $field.'.*.max' => "Each file must be {$mb} MB or smaller.",
            $field.'.*.mimes' => 'Allowed file types: '.implode(', ', $types).'.',
            $field.'.*.uploaded' => "That file could not be uploaded. It may be larger than the server's upload limit.",
            $field.'.*.file' => 'One of the attachments is not a valid file.',
        ];
    }

    /**
     * Save uploaded files and attach them to a model.
     *
     * @param  array<int, UploadedFile>  $files
     * @param  int|null  $userId  who uploaded them (report evidence is only shown to its uploader and admins)
     */
    public static function store(Model $owner, array $files, string $disk, string $directory, ?int $userId = null): void
    {
        foreach ($files as $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $mime = $file->getMimeType() ?: 'application/octet-stream';

            $owner->attachments()->create([
                'user_id' => $userId,
                'disk' => $disk,
                'path' => $file->store($directory, $disk),
                // Strip any path pieces and control characters from the display name.
                'original_name' => self::cleanName($file->getClientOriginalName()),
                'mime' => $mime,
                'size' => $file->getSize() ?: 0,
                'kind' => self::kindFor($mime),
            ]);
        }
    }

    public static function kindFor(string $mime): string
    {
        return match (true) {
            str_starts_with($mime, 'image/') => 'image',
            str_starts_with($mime, 'video/') => 'video',
            default => 'file',
        };
    }

    public static function cleanName(string $name): string
    {
        $name = basename(str_replace('\\', '/', $name));
        $name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name) ?? '';

        return mb_substr($name !== '' ? $name : 'file', 0, 120);
    }

    /**
     * Remove the files (and rows) belonging to a model.
     */
    public static function deleteFor(Model $owner): void
    {
        foreach ($owner->attachments as $attachment) {
            Storage::disk($attachment->disk)->delete($attachment->path);
            $attachment->delete();
        }
    }
}
