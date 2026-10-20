<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One line in a report's history: filed, responded, decided, auto-suspended...
 */
class ReportEvent extends Model
{
    public $timestamps = false;

    protected $fillable = ['report_id', 'user_id', 'event', 'note', 'created_at'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function record(Report $report, string $event, ?int $userId = null, ?string $note = null): self
    {
        return static::create([
            'report_id' => $report->id,
            'user_id' => $userId,
            'event' => $event,
            'note' => $note,
            'created_at' => now(),
        ]);
    }
}
