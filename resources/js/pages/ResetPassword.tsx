import { Head, Link, useForm } from '@inertiajs/react';
import { Check, Circle } from 'lucide-react';
import { FormEvent } from 'react';
import AuthLayout from '../Layouts/AuthLayout';
import FormField, { textInputClass } from '../components/ui/FormField';
import PasswordInput from '../components/ui/PasswordInput';

interface Props {
    token: string;
    email: string;
}

/** Step 3 of "forgot password": the page the emailed link opens. */
export default function ResetPassword({ token, email }: Props) {
    const form = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    const password = form.data.password;
    const checks = {
        length: password.length >= 8 && password.length <= 72,
        letter: /\p{L}/u.test(password),
        number: /\d/.test(password),
    };
    const mismatch = form.data.password_confirmation !== '' && form.data.password !== form.data.password_confirmation;

    // The server uses this error for a bad, used or expired link.
    const linkProblem = form.errors.email && email ? form.errors.email : undefined;

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        form.post('/reset-password', {
            onFinish: () => form.reset('password', 'password_confirmation'),
        });
    }

    return (
        <AuthLayout
            title="Choose a new password"
            subtitle="Pick something you have not used before on this site."
            asideTitle="Almost done."
            asidePoints={[
                'The link you used only works once',
                'You will be logged out on every other device',
                'Log in with your new password right after',
            ]}
        >
            <Head title="Choose a new password" />

            {linkProblem && (
                <div className="mb-6 rounded-xl bg-red-50 px-4 py-3.5 text-[14px] leading-relaxed text-red-900 ring-1 ring-red-200" role="alert">
                    {linkProblem}{' '}
                    <Link href="/forgot-password" className="font-bold underline underline-offset-4">
                        Request a new link
                    </Link>
                </div>
            )}

            <form onSubmit={submit} className="space-y-5" noValidate>
                {email ? (
                    <p className="rounded-xl bg-mist-100 px-4 py-3 text-sm text-pine-900/80">
                        Resetting the password for <strong className="break-all text-pine-950">{email}</strong>
                    </p>
                ) : (
                    <FormField id="email" label="Email address" error={form.errors.email}>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            value={form.data.email}
                            onChange={(e) => form.setData('email', e.target.value)}
                            className={textInputClass(Boolean(form.errors.email))}
                            required
                        />
                    </FormField>
                )}

                <FormField id="password" label="New password" error={form.errors.password}>
                    <PasswordInput
                        id="password"
                        autoComplete="new-password"
                        autoFocus
                        maxLength={72}
                        value={form.data.password}
                        onChange={(e) => form.setData('password', e.target.value)}
                        placeholder="Create a new password"
                        hasError={Boolean(form.errors.password)}
                        aria-invalid={Boolean(form.errors.password)}
                        required
                    />

                    <ul className="mt-3 space-y-1.5 text-[13px]">
                        {(
                            [
                                [checks.length, '8 to 72 characters'],
                                [checks.letter, 'At least one letter'],
                                [checks.number, 'At least one number'],
                            ] as const
                        ).map(([ok, label]) => (
                            <li key={label} className={`flex items-center gap-2 ${ok ? 'text-pine-700' : 'text-pine-900/55'}`}>
                                {ok ? <Check size={15} strokeWidth={3} /> : <Circle size={15} />}
                                {label}
                            </li>
                        ))}
                    </ul>
                </FormField>

                <FormField
                    id="password_confirmation"
                    label="Confirm new password"
                    error={mismatch ? 'The two passwords do not match.' : form.errors.password_confirmation}
                >
                    <PasswordInput
                        id="password_confirmation"
                        autoComplete="new-password"
                        maxLength={72}
                        value={form.data.password_confirmation}
                        onChange={(e) => form.setData('password_confirmation', e.target.value)}
                        placeholder="Type it again"
                        hasError={mismatch}
                        aria-invalid={mismatch}
                        required
                    />
                </FormField>

                <button
                    type="submit"
                    disabled={form.processing || mismatch}
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-pine-800 font-display text-base font-bold text-white shadow-sm transition hover:bg-pine-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pine-700/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {form.processing ? 'Saving…' : 'Save new password'}
                </button>
            </form>
        </AuthLayout>
    );
}
