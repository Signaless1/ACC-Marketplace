<?php

namespace App\Support;

use App\Models\Attachment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;

/**
 * Validation rules + storage for files attached to messages, reviews
 * and report evidence. Everything goes to the public disk under
 * storage/app/public/attachments/<folder>.
 */
class AttachmentService
{
    public const MAX_FILES = 5;

    /** Per-file limit in kilobytes (20 MB). */
    public const MAX_KB = 20480;

    /** SVG and HTML are deliberately absent: they can carry scripts. */
    public const MIMES = 'jpg,jpeg,png,gif,webp,mp4,webm,mov,pdf,doc,docx,xls,xlsx,ppt,pptx,txt';

    /**
     * @return array<string, array<int, string>>
     */
    public static function rules(string $field = 'attachments', int $maxFiles = self::MAX_FILES): array
    {
        return [
            $field => ['nullable', 'array', 'max:'.$maxFiles],
            $field.'.*' => ['file', 'max:'.self::MAX_KB, 'mimes:'.self::MIMES],
        ];
    }

    /**
     * @param  array<int, UploadedFile>|UploadedFile|null  $files
     */
    public static function store(Model $owner, array|UploadedFile|null $files, ?int $userId, string $folder): void
    {
        if ($files === null) {
            return;
        }

        foreach ((array) $files as $file) {
            if (! $file instanceof UploadedFile || ! $file->isValid()) {
                continue;
            }

            $mime = (string) ($file->getMimeType() ?: 'application/octet-stream');

            $owner->morphMany(Attachment::class, 'attachable')->create([
                'user_id' => $userId,
                'path' => $file->store('attachments/'.$folder, 'public'),
                'original_name' => mb_substr($file->getClientOriginalName(), 0, 150),
                'mime' => mb_substr($mime, 0, 100),
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
}
