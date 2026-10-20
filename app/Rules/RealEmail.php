<?php

namespace App\Rules;

use App\Support\EmailCheck;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Refuses addresses that cannot be real: disposable mailboxes, misspelled
 * well-known domains (emaill.com), sample domains and domains that do not
 * exist. See EmailCheck for what can and cannot be proven.
 */
class RealEmail implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            return;
        }

        $problem = EmailCheck::problem($value);

        if ($problem !== null) {
            $fail($problem);
        }
    }
}
