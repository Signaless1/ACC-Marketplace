/**
 * Philippine mobile numbers, mirrored from App\Support\PhoneNumber on the
 * server. The server is the one that decides; this only gives people instant
 * feedback while they type, so keep the two in step.
 *
 * Accepted: 0917 123 4567, +63 917 123 4567, 639171234567, 9171234567 ...
 * Stored:   +639171234567
 */

const MOBILE = /^(?:\+63|63|0)?(9\d{9})$/;

/** The 10 digits after the country code (917 123 4567), or null if it is not a mobile number. */
export function nationalDigits(input: string): string | null {
    const compact = input.trim().replace(/[\s\u00A0().-]/g, '');
    const match = MOBILE.exec(compact);

    if (!match) return null;

    // Placeholders such as 0900 000 0000 or 0999 999 9999.
    if (/^9(\d)\1{8}$/.test(match[1])) return null;

    return match[1];
}

/** +639171234567, or null if the input is not a Philippine mobile number. */
export function normalizePhone(input: string): string | null {
    const digits = nationalDigits(input);

    return digits ? `+63${digits}` : null;
}

/** 0917 123 4567 - how a Filipino reader expects to see the number. */
export function formatPhone(canonical: string | null | undefined): string {
    if (!canonical) return '';

    const match = /^\+63(9\d{2})(\d{3})(\d{4})$/.exec(canonical);

    return match ? `0${match[1]} ${match[2]} ${match[3]}` : canonical;
}

/** Split digits into groups, e.g. ("9171234567", [3, 3, 4]) -> "917 123 4567". */
function group(digits: string, sizes: number[]): string {
    const parts: string[] = [];
    let at = 0;

    for (const size of sizes) {
        if (at >= digits.length) break;
        parts.push(digits.slice(at, at + size));
        at += size;
    }

    return parts.join(' ');
}

/**
 * Shapes what is typed into a Philippine mobile number and stops it at the
 * real length, so extra digits are simply not accepted:
 *
 *   0917 123 4567      11 digits (starts with 0)
 *   +63 917 123 4567   12 digits after the "+" (63 + 10)
 *   63 917 123 4567    12 digits
 *   917 123 4567       10 digits
 *
 * Letters and symbols are dropped, the number is spaced as it is typed, and
 * pasting any usual format works. The server still validates everything.
 */
export function sanitizePhoneInput(value: string): string {
    const plus = value.trimStart().startsWith('+');
    const digits = value.replace(/\D/g, '');

    // +63 917 123 4567 or 63 917 123 4567
    if (plus || digits.startsWith('63')) {
        const capped = digits.slice(0, 12);
        const country = capped.slice(0, 2);
        const national = group(capped.slice(2), [3, 3, 4]);

        return `${plus ? '+' : ''}${country}${national ? ` ${national}` : ''}`;
    }

    // 0917 123 4567
    if (digits.startsWith('0')) return group(digits.slice(0, 11), [4, 3, 4]);

    // 917 123 4567
    return group(digits.slice(0, 10), [3, 3, 4]);
}

/** An error message for the field, or null when the number is fine (or not entered yet). */
export function phoneError(value: string): string | null {
    if (value.trim() === '') return null;

    return normalizePhone(value)
        ? null
        : 'Enter a Philippine mobile number, like 0917 123 4567 or +63 917 123 4567.';
}
