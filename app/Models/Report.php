<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

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

    /**
     * Reasons a BUYER can give when reporting a transaction. Only a buyer can
     * say an item never arrived or was not as described.
     */
    public const BUYER_TRANSACTION_REASONS = [
        'item_not_received' => 'Item or service was not received',
        'not_as_described' => 'Not as described',
        'no_show' => 'Other party did not show up',
        'payment_issue' => 'Payment problem',
        'fraud' => 'Suspected scam or fraud',
        'harassment' => 'Harassment or threats',
        'other' => 'Other',
    ];

    /**
     * Reasons a SELLER can give. Sellers get problems of their own to report,
     * so the system is not built only around the buyer's point of view.
     */
    public const SELLER_TRANSACTION_REASONS = [
        'no_show' => 'Other party did not show up',
        'payment_issue' => 'Payment problem',
        'order_abuse' => 'Fake or abusive order (no intention to buy)',
        'fraud' => 'Suspected scam or fraud',
        'harassment' => 'Harassment or threats',
        'other' => 'Other',
    ];

    /** Every transaction reason, for showing a label whoever filed it. */
    public const TRANSACTION_REASONS = self::BUYER_TRANSACTION_REASONS + self::SELLER_TRANSACTION_REASONS;

    public const STATUSES = ['pending', 'reviewing', 'escalated', 'resolved', 'dismissed'];

    /** A report in one of these states still needs a decision. */
    public const OPEN_STATUSES = ['pending', 'reviewing', 'escalated'];

    /**
     * Too vague to suspend a person over, however many people pick them. They
     * still go to the admins like any other report.
     */
    public const NON_SUSPENDABLE_REASONS = ['duplicate', 'other'];

    /**
     * Every reason label, regardless of report type.
     *
     * @return array<string, string>
     */
    public static function allReasons(): array
    {
        return self::REASONS + self::TRANSACTION_REASONS;
    }

    /**
     * The reasons offered to one side of a transaction.
     *
     * @return array<string, string>
     */
    public static function transactionReasonsFor(string $role): array
    {
        return $role === 'seller'
            ? self::SELLER_TRANSACTION_REASONS
            : self::BUYER_TRANSACTION_REASONS;
    }

    protected $fillable = [
        'reporter_id',
        'listing_id',
        'order_id',
        'reported_user_id',
        'reporter_role',
        'reason',
        'description',
        'status',
        'admin_note',
        'decision_note',
        'bad_faith',
        'respondent_statement',
        'responded_at',
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
            'responded_at' => 'datetime',
            'bad_faith' => 'boolean',
        ];
    }

    public function isOpen(): bool
    {
        return in_array($this->status, self::OPEN_STATUSES, true);
    }

    /**
     * How the outcome is described to the people involved. Null while the
     * report is still open.
     */
    public function outcomeLabel(): ?string
    {
        return match (true) {
            $this->status === 'resolved' => 'Upheld',
            $this->status === 'dismissed' && $this->bad_faith => 'Dismissed as a false report',
            $this->status === 'dismissed' => 'Not upheld',
            default => null,
        };
    }

    /**
     * True while a report between these two people is still open. Used to keep
     * deleted chat messages as evidence until the dispute is decided.
     */
    public static function openBetween(int $firstUserId, int $secondUserId): bool
    {
        return static::query()
            ->whereIn('status', self::OPEN_STATUSES)
            ->where(function ($query) use ($firstUserId, $secondUserId) {
                $query
                    ->where(fn ($q) => $q
                        ->where('reporter_id', $firstUserId)
                        ->where('reported_user_id', $secondUserId))
                    ->orWhere(fn ($q) => $q
                        ->where('reporter_id', $secondUserId)
                        ->where('reported_user_id', $firstUserId));
            })
            ->exists();
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

    /** Evidence files, from either the reporter or the reported person. */
    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function events(): HasMany
    {
        return $this->hasMany(ReportEvent::class);
    }
}
