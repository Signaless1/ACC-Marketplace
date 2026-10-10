<?php

namespace App\Models;

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

    /** Extra reasons that only make sense for a specific transaction. */
    public const TRANSACTION_REASONS = [
        'not_as_described' => 'Item or service not as described',
        'non_delivery' => 'Item not handed over / service not delivered',
        'payment_issue' => 'Payment problem',
        'no_show' => 'Seller or buyer did not show up',
        'fraud' => 'Suspected fraud or scam',
        'harassment' => 'Harassment or abusive behavior',
        'other' => 'Other',
    ];

    public const AUTHORITIES = [
        'Student Affairs Office',
        'Guidance Office',
        'Dean\'s Office',
        'Campus Security',
        'School Administrator',
    ];

    public const STATUSES = ['pending', 'reviewing', 'resolved', 'dismissed'];

    protected $fillable = [
        'reporter_id',
        'listing_id',
        'reported_user_id',
        'order_id',
        'reason',
        'description',
        'status',
        'admin_note',
        'reviewed_by',
        'reviewed_at',
        'escalated_to',
        'escalation_note',
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

    /** Every reason label, for both listing and transaction reports. */
    public static function allReasons(): array
    {
        return array_merge(self::REASONS, self::TRANSACTION_REASONS);
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
