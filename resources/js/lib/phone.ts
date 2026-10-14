/**
 * Philippine mobile numbers. Mirrors app/Support/PhilippinePhone.php.
 *
 * Accepted: 09XXXXXXXXX (11 digits), +639XXXXXXXXX or 639XXXXXXXXX.
 */

export const PH_PHONE_PLACEHOLDER = '09171234567';
export const PH_PHONE_HINT = '11 digits starting with 09, e.g. 09171234567 (+63 9XX XXX XXXX also works).';
export const PH_PHONE_ERROR =
    'Enter a valid Philippine mobile number: 11 digits starting with 09, or +63 followed by 10 digits.';

/** Keep only what can belong to a PH number while the user types. */
export function sanitizePhoneInput(raw: string): string {
    const plus = raw.trimStart().startsWith('+');
    const digits = raw.replace(/\D/g, '');

    // 09XXXXXXXXX = 11 digits, 639XXXXXXXXX = 12 digits.
    const max = plus || digits.startsWith('63') ? 12 : 11;

    return (plus ? '+' : '') + digits.slice(0, max);
}

/** The stored form (09XXXXXXXXX), or null when the number is not valid. */
export function normalizePhPhone(raw: string): string | null {
    const value = raw.trim();
    if (!/^\+?[\d\s().-]+$/.test(value)) return null;

    const digits = value.replace(/\D/g, '');

    if (/^639\d{9}$/.test(digits)) return `0${digits.slice(2)}`;
    if (value.startsWith('+')) return null;

    return /^09\d{9}$/.test(digits) ? digits : null;
}
