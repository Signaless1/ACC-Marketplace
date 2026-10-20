<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Attachment extends Model
{
    protected $fillable = [
        'attachable_id',
        'attachable_type',
        'disk',
        'path',
        'original_name',
        'mime',
        'size',
        'kind',
        'user_id',
    ];

    protected $appends = ['url', 'human_size'];

    protected $hidden = ['disk', 'path', 'user_id'];

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

    /**
     * Public files are served from /storage. Private files (chat) go through
     * an authorised route so only the people in the conversation can open them.
     */
    protected function url(): Attribute
    {
        return Attribute::get(
            fn () => $this->disk === 'public'
                ? '/storage/'.$this->path
                : route('attachments.show', $this, false)
        );
    }

    protected function humanSize(): Attribute
    {
        return Attribute::get(function () {
            $bytes = $this->size;

            if ($bytes >= 1048576) {
                return round($bytes / 1048576, 1).' MB';
            }

            return max(1, (int) round($bytes / 1024)).' KB';
        });
    }
}
