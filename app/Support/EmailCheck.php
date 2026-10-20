<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Decides whether an email address looks like a real, usable one.
 *
 * What this CAN tell: the domain exists and accepts mail, is not a throw-away
 * mailbox service, is not a sample domain, and is not a typo of a well-known
 * provider (emaill.com, gmial.com, gmail.con).
 *
 * What it CANNOT tell: whether that particular mailbox exists. Nothing can,
 * without sending a message to it. Proof of ownership comes from the
 * password-reset email, which only works if the address is real.
 */
final class EmailCheck
{
    /** Throw-away mailbox services. Subdomains are covered too. */
    private const DISPOSABLE = [
        '10minutemail.com', '10minutemail.net', '33mail.com', 'anonbox.net', 'burnermail.io', 'crazymailing.com',
        'discard.email', 'discardmail.com', 'dispostable.com', 'dropmail.me', 'emailfake.com', 'emailondeck.com',
        'eyepaste.com', 'fakeinbox.com', 'fakemail.net', 'fakermail.com', 'getnada.com', 'grr.la',
        'guerrillamail.biz', 'guerrillamail.com', 'guerrillamail.de', 'guerrillamail.net', 'guerrillamail.org',
        'harakirimail.com', 'inboxkitten.com', 'jetable.org', 'luxusmail.org', 'maildrop.cc', 'mailcatch.com',
        'mailforspam.com', 'mailinator.com', 'mailnesia.com', 'mailnull.com', 'minuteinbox.com', 'mintemail.com',
        'moakt.com', 'mohmal.com', 'mt2015.com', 'mytemp.email', 'nada.email', 'owlymail.com', 'sharklasers.com',
        'spam4.me', 'spambox.us', 'spamgourmet.com', 'tempail.com', 'tempinbox.com', 'tempmail.com',
        'tempmail.net', 'tempmailo.com', 'temp-mail.io', 'temp-mail.org', 'tempr.email', 'throwawaymail.com',
        'tmpmail.net', 'tmpmail.org', 'trashmail.com', 'trashmail.de', 'trashmail.net', 'trbvm.com',
        'yopmail.com', 'yopmail.fr', 'yopmail.net', 'zetmail.com',
    ];

    /** Sample domains reserved for documentation: nobody reads mail there. */
    private const PLACEHOLDER = ['example.com', 'example.net', 'example.org'];

    /** The providers most people use, used to catch near-miss spellings of them. */
    private const POPULAR = [
        'gmail.com', 'yahoo.com', 'yahoo.com.ph', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com',
        'email.com',
    ];

    /** Real domains that happen to look like a typo of a popular one. */
    private const KNOWN_REAL = [
        'mail.com', 'ymail.com', 'rocketmail.com', 'gmx.com', 'gmx.net', 'live.com', 'msn.com', 'me.com', 'aol.com',
        'proton.me', 'pm.me', 'zoho.com', 'yandex.com', 'mail.ru', 'hotmail.co.uk', 'yahoo.co.uk', 'cloud.com',
    ];

    /** The part after the last "@", lower-cased, or null if there is none. */
    public static function domainOf(string $email): ?string
    {
        $at = strrpos($email, '@');

        if ($at === false) {
            return null;
        }

        $domain = strtolower(trim(substr($email, $at + 1)));

        return $domain === '' ? null : $domain;
    }

    /**
     * A message explaining why the address is not accepted, or null if it is.
     */
    public static function problem(string $email): ?string
    {
        $domain = self::domainOf($email);

        if ($domain === null) {
            return null; // Format errors are reported by the email rule itself.
        }

        if (self::isDisposable($domain)) {
            return 'Temporary or disposable email addresses cannot be used. Please use your own email.';
        }

        $suggestion = self::suggestion($domain);

        if ($suggestion !== null) {
            $local = substr($email, 0, (int) strrpos($email, '@'));

            return "Did you mean {$local}@{$suggestion}? Check the spelling after the @.";
        }

        if (! config('marketplace.email.strict', true)) {
            return null;
        }

        if (in_array($domain, self::PLACEHOLDER, true)) {
            return 'That is a sample address, not a real one. Please use your own email.';
        }

        if (! self::domainAcceptsMail($domain)) {
            return "We could not find a mail server for {$domain}. Check the spelling after the @.";
        }

        return null;
    }

    public static function isDisposable(string $domain): bool
    {
        // a.b.mailinator.com is as disposable as mailinator.com.
        $labels = explode('.', $domain);

        for ($i = 0; $i < count($labels) - 1; $i++) {
            if (in_array(implode('.', array_slice($labels, $i)), self::DISPOSABLE, true)) {
                return true;
            }
        }

        return false;
    }

    /** The popular provider this domain is one slip away from, if any. */
    public static function suggestion(string $domain): ?string
    {
        if (in_array($domain, self::POPULAR, true) || in_array($domain, self::KNOWN_REAL, true)) {
            return null;
        }

        foreach (self::POPULAR as $popular) {
            if (self::oneSlipAway($domain, $popular)) {
                return $popular;
            }
        }

        return null;
    }

    /** One letter added, missing or wrong, or two neighbouring letters swapped. */
    private static function oneSlipAway(string $typed, string $real): bool
    {
        if (levenshtein($typed, $real) === 1) {
            return true;
        }

        if (strlen($typed) !== strlen($real)) {
            return false;
        }

        $differ = [];

        for ($i = 0, $n = strlen($typed); $i < $n; $i++) {
            if ($typed[$i] !== $real[$i]) {
                $differ[] = $i;
            }
        }

        return count($differ) === 2
            && $differ[1] === $differ[0] + 1
            && $typed[$differ[0]] === $real[$differ[1]]
            && $typed[$differ[1]] === $real[$differ[0]];
    }

    /**
     * Does the domain publish a mail server (or at least an address)? A found
     * answer is remembered for a day; a miss only for five minutes, so a brief
     * DNS hiccup does not lock a real domain out for long.
     */
    private static function domainAcceptsMail(string $domain): bool
    {
        $key = 'email-domain:'.$domain;
        $known = Cache::get($key);

        if ($known !== null) {
            return (bool) $known;
        }

        $host = $domain.'.';

        $found = checkdnsrr($host, 'MX')
            || checkdnsrr($host, 'A')
            || checkdnsrr($host, 'AAAA');

        Cache::put($key, $found, $found ? now()->addDay() : now()->addMinutes(5));

        return $found;
    }
}
