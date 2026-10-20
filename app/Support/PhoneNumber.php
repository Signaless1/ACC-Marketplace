<?php

namespace App\Support;

/**
 * Philippine mobile numbers.
 *
 * A mobile number is "09" + 9 digits when dialled inside the country, which
 * is the same as "+63 9" + 9 digits internationally: 10 digits after the
 * country code, always starting with 9. People type it in many ways, so
 * normalize() accepts all of these and returns ONE canonical form:
 *
 *     0917 123 4567      09171234567
 *     +63 917 123 4567   +639171234567   639171234567   9171234567
 *
 * The canonical form (+639171234567) is what gets stored and compared, so the
 * "one number per account" rule cannot be dodged with different spacing.
 *
 * Landlines (area code + 7 digits) are deliberately not accepted: they cannot
 * receive texts, and a marketplace needs a number people can actually reach.
 */
final class PhoneNumber
{
    /** +63, then a 10-digit mobile number that starts with 9. */
    public const CANONICAL = '/^\+639\d{9}$/';

    /**
     * Turn whatever the person typed into +639XXXXXXXXX, or null if it is not
     * a Philippine mobile number.
     */
    public static function normalize(mixed $input): ?string
    {
        if (! is_string($input)) {
            return null;
        }

        $input = trim($input);

        if ($input === '' || strlen($input) > 25) {
            return null;
        }

        // Drop the separators people really type (spaces, non-breaking spaces
        // from copy-paste, dashes, dots, brackets). Anything else - letters,
        // a stray "+" in the middle - survives and fails the match below.
        $compact = preg_replace('/[\s\x{00A0}().\-]/u', '', $input);

        if ($compact === null) {
            return null;
        }

        if (! preg_match('/^(?:\+63|63|0)?(9\d{9})$/', $compact, $match)) {
            return null;
        }

        $number = '+63'.$match[1];

        return self::isPlausible($number) ? $number : null;
    }

    /** True only for an already-canonical, believable number. */
    public static function isCanonical(mixed $value): bool
    {
        return is_string($value)
            && preg_match(self::CANONICAL, $value) === 1
            && self::isPlausible($value);
    }

    /** 0917 123 4567 - how a Filipino reader expects to see the number. */
    public static function display(?string $canonical): ?string
    {
        if ($canonical === null || ! self::isCanonical($canonical)) {
            return $canonical;
        }

        $national = '0'.substr($canonical, 3); // 09171234567

        return substr($national, 0, 4).' '.substr($national, 4, 3).' '.substr($national, 7);
    }

    /**
     * Reject obvious placeholders such as +639000000000 or +639999999999
     * (nine identical digits after the leading 9).
     */
    private static function isPlausible(string $number): bool
    {
        return preg_match('/^\+639(\d)\1{8}$/', $number) !== 1;
    }
}
