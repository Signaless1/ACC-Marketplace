<?php

namespace App\Support;

/**
 * Philippine mobile numbers.
 *
 * A valid mobile number is exactly 11 digits starting with 09
 * (09171234567), or the same number in international form: +63 followed by
 * 10 digits starting with 9 (+639171234567, also typed as 639171234567).
 * Landlines and numbers from other countries are rejected.
 *
 * Everything is stored in the local 11-digit form so the same person
 * cannot register once as 0917… and again as +63917….
 */
class PhilippinePhone
{
    /** The canonical, stored form. */
    public const PATTERN = '/^09\d{9}$/';

    /**
     * Turn whatever the user typed into 09XXXXXXXXX, or null when it is not
     * a valid Philippine mobile number.
     */
    public static function normalize(mixed $input): ?string
    {
        if (! is_string($input)) {
            return null;
        }

        $input = trim($input);

        // Only digits and the usual separators may be typed; letters or
        // other symbols mean this is not a phone number.
        if ($input === '' || ! preg_match('/^\+?[\d\s().\-]+$/', $input)) {
            return null;
        }

        $hasPlus = str_starts_with($input, '+');
        $digits = preg_replace('/\D/', '', $input);

        // +639XXXXXXXXX or 639XXXXXXXXX  ->  09XXXXXXXXX
        if (preg_match('/^639\d{9}$/', $digits)) {
            return '0'.substr($digits, 2);
        }

        // A "+" is only meaningful in front of the 63 country code.
        if ($hasPlus) {
            return null;
        }

        return preg_match(self::PATTERN, $digits) ? $digits : null;
    }

    public static function isValid(mixed $input): bool
    {
        return self::normalize($input) !== null;
    }

    /**
     * Same number with the country code, for display or SMS providers.
     */
    public static function international(string $local): string
    {
        return '+63'.substr($local, 1);
    }
}
