<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * A file attached to a message or a review.
 */
class Attachment extends Model
{
    /** Extensions people may attach (images and videos are previewed inline). */
    public const ALLOWED_EXTENSIONS = [
        'jpg', 'jpeg', 'png', 'webp', 'gif',
        'mp4', 'webm', 'mov',
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip',
    ];

    public const MEDIA_EXTENSIONS = [
        'jpg', 'jpeg', 'png', 'webp', 'gif',
        'mp4', 'webm', 'mov',
    ];

    public const MAX_KILOBYTES = 20480; // 20 MB

    protected $fillable = [
        'attachable_type',
        'attachable_id',
        'path',
        'original_name',
        'mime',
        'size',
        'kind',
    ];

    protected $appends = ['url'];

    protected $hidden = ['path'];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
        ];
    }

    public function attachable(): MorphTo
    {
        return $this->morphTo();
    }

    protected function url(): Attribute
    {
        return Attribute::get(fn () => '/storage/'.$this->path);
    }

    /**
     * Store an uploaded file on the public disk and describe it.
     *
     * @return array{path: string, original_name: string, mime: string|null, size: int, kind: string}
     */
    public static function storeUpload(UploadedFile $file, string $directory): array
    {
        $mime = (string) $file->getMimeType();

        $kind = match (true) {
            str_starts_with($mime, 'image/') => 'image',
            str_starts_with($mime, 'video/') => 'video',
            default => 'file',
        };

        return [
            'path' => $file->store($directory, 'public'),
            'original_name' => mb_substr($file->getClientOriginalName(), 0, 200),
            'mime' => $mime ?: null,
            'size' => (int) $file->getSize(),
            'kind' => $kind,
        ];
    }

    public function deleteFile(): void
    {
        Storage::disk('public')->delete($this->path);
    }

    /**
     * Validation rules shared by every attachment field.
     *
     * @return array<int, string>
     */
    public static function fileRules(): array
    {
        return [
            'file',
            'max:'.self::MAX_KILOBYTES,
            'extensions:'.implode(',', self::ALLOWED_EXTENSIONS),
        ];
    }

    /** Same rules, but only photos and videos (used for reviews). */
    public static function mediaRules(): array
    {
        return [
            'file',
            'max:'.self::MAX_KILOBYTES,
            'extensions:'.implode(',', self::MEDIA_EXTENSIONS),
        ];
    }
}
