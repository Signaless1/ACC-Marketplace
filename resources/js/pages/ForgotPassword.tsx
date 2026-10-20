import { Head, Link, useForm } from '@inertiajs/react';
import { MailCheck } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import AuthLayout from '../Layouts/AuthLayout';
import FormField, { textInputClass } from '../components/ui/FormField';

/** A person may ask for another email once a minute (the server enforces it too). */
const RESEND_SECONDS = 60;

interface Props {
    expiresInMinutes: number;
}

/**
 * Step 1 of "forgot password": ask for the account's email. Whether or not an
 * account uses it, the answer is the same, so this page cannot be used to
 * find out who is registered.
 */
export default function ForgotPassword({ expiresInMinutes }: Props) {
    const form = useForm({ email: '' });
    const [sentTo, setSentTo] = useState<string | null>(null);
    const [wait, setWait] = useState(0);

    useEffect(() => {
        if (wait <= 0) return;

        const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000);

        return () => clearTimeout(timer);
    }, [wait]);

    function send(event?: FormEvent<HTMLFormElement>) {
        event?.preventDefault();

        const email = form.data.email.trim().toLowerCase();

        form.transform(() => ({ email }));
        form.post('/forgot-password', {
            preserveScroll: true,
            onSuccess: () => {
                setSentTo(email);
                setWait(RESEND_SECONDS);
            },
        });
    }

    return (
        <AuthLayout
            title="Forgot your password?"
            subtitle="No problem. We will email you a link to choose a new one."
            asideTitle="Back in three steps."
            asidePoints={[
                '1. Enter the email you signed up with',
                `2. Open the link we email you (it works for ${expiresInMinutes} minutes)`,
                '3. Choose a new password and log in',
            ]}
        >
            <Head title="Forgot password" />

            {sentTo ? (
                <div className="space-y-6">
                    <div className="rounded-2xl bg-mist-100 p-5">
                        <p className="flex items-center gap-2.5 font-display text-lg font-extrabold text-pine-950">
                            <MailCheck size={22} className="text-pine-700" /> Check your email
                        </p>
                        <p className="mt-2 text-[15px] leading-relaxed text-pine-900/80">
                            If an account uses <strong className="break-all text-pine-950">{sentTo}</strong>, a reset
                            link is on its way.
                        </p>
                    </div>

                    <ol className="space-y-3.5 text-[15px] leading-relaxed text-pine-900/85">
                        <li className="flex gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pine-800 text-xs font-bold text-white">1</span>
                            <span>
                                Open the email called <strong>“Reset your ACC Marketplace password”</strong>. It can
                                take a few minutes, and it may be in your spam or junk folder.
                            </span>
                        </li>
                        <li className="flex gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pine-800 text-xs font-bold text-white">2</span>
                            <span>
                                Tap <strong>Choose a new password</strong>. The link works once and expires in{' '}
                                {expiresInMinutes} minutes.
                            </span>
                        </li>
                        <li className="flex gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pine-800 text-xs font-bold text-white">3</span>
                            <span>
                                Pick a new password. You will be logged out on other devices, then you can log in
                                with the new one.
                            </span>
                        </li>
                    </ol>

                    <p className="text-sm leading-relaxed text-pine-900/70">
                        Nothing arrived? Check the spelling of the address. If the email is right and you still
                        cannot find it, send it again below.
                    </p>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => send()}
                            disabled={form.processing || wait > 0}
                            className="inline-flex h-11 items-center rounded-xl bg-pine-800 px-5 font-display text-sm font-bold text-white transition hover:bg-pine-900 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {form.processing ? 'Sending…' : wait > 0 ? `Send again in ${wait}s` : 'Send it again'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setSentTo(null)}
                            className="inline-flex h-11 items-center rounded-xl border-2 border-pine-900/20 px-5 font-display text-sm font-bold text-pine-900 transition hover:border-pine-900"
                        >
                            Use a different email
                        </button>
                    </div>
                </div>
            ) : (
                <form onSubmit={send} className="space-y-5" noValidate>
                    <FormField id="email" label="Email address" error={form.errors.email}>
                        <input
                            id="email"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            autoFocus
                            maxLength={254}
                            value={form.data.email}
                            onChange={(e) => form.setData('email', e.target.value)}
                            placeholder="you@example.com"
                            aria-invalid={Boolean(form.errors.email)}
                            aria-describedby={form.errors.email ? 'email-error' : undefined}
                            className={textInputClass(Boolean(form.errors.email))}
                            required
                        />
                    </FormField>

                    <button
                        type="submit"
                        disabled={form.processing}
                        className="flex h-12 w-full items-center justify-center rounded-xl bg-pine-800 font-display text-base font-bold text-white shadow-sm transition hover:bg-pine-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pine-700/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {form.processing ? 'Sending…' : 'Email me a reset link'}
                    </button>
                </form>
            )}

            <p className="mt-8 rounded-xl bg-mist-100 px-5 py-4 text-center text-[15px] text-pine-900/80">
                Remembered it?{' '}
                <Link
                    href="/login"
                    className="font-bold text-pine-700 underline decoration-sun-500 decoration-[3px] underline-offset-4 transition hover:text-pine-900"
                >
                    Back to log in
                </Link>
            </p>
        </AuthLayout>
    );
}
