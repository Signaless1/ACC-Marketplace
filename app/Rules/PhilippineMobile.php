<?php

namespace App\Rules;

use App\Support\PhoneNumber;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Accepts only a Philippine mobile number in canonical form (+639XXXXXXXXX).
 *
 * Callers normalise what the person typed with PhoneNumber::normalize() first,
 * then validate. Requiring the canonical form here means a caller that forgets
 * to normalise fails safely instead of storing "0917 123 4567" and "0917-123-4567"
 * as two different numbers.
 */
class PhilippineMobile implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! PhoneNumber::isCanonical($value)) {
            $fail('Enter a valid Philippine mobile number, like 0917 123 4567 or +63 917 123 4567.');
        }
    }
}
