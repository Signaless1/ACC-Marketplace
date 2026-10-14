<?php

namespace App\Models;

use App\Support\AutoSuspension;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Report extends Model
{
    public const REASONS = [
        'scam' => 'Scam or fraud',
        'spam' => 'Spam',
        'prohibited' => 'Prohibited item or service',
        'misleading' => 'Misleading listing',
        'inappropriate' => 'Inappropriate content',
        'duplicate' => 'Duplicate listing',
        'harassment' => 'Harassment or abusive behavior',
        'other' => 'Other',
    ];

    /** Reasons offered when reporting a transaction (an order). */
    public const TRANSACTION_REASONS = [
        'item_not_received' => 'Item or service was not received',
        'not_as_described' => 'Not as described',
        'no_show' => 'Other party did not show up',
        'payment_issue' => 'Payment problem',
        'fraud' => 'Suspected scam or fraud',
        'harassment' => 'Harassment or threats',
        'other' => 'Other',
    ];

    public const STATUSES = ['pending', 'reviewing', 'escalated', 'resolved', 'dismissed'];

    /**
     * Every reason label, regardless of report type.
     *
     * @return array<string, string>
     */
    public static function allReasons(): array
    {
        return self::REASONS + self::TRANSACTION_REASONS;
    }

    protected static function booted(): void
    {
        // Every new report re-checks the reported user against the
        // auto-suspension threshold.
        static::created(function (Report $report) {
            AutoSuspension::check($report->reportedUser);
        });
    }

    protected $fillable = [
        'reporter_id',
        'listing_id',
        'order_id',
        'reported_user_id',
        'reason',
        'description',
        'status',
        'admin_note',
        'reviewed_by',
        'reviewed_at',
        'escalated_to',
        'escalated_at',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
            'escalated_at' => 'datetime',
        ];
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function reportedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_user_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
