import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import AuthLayout from '../Layouts/AuthLayout';
import FormField, { textInputClass } from '../components/ui/FormField';
import PasswordInput from '../components/ui/PasswordInput';

const MAX = 1500;

/**
 * A suspended person cannot log in, so they appeal from here with their own
 * email and password. The password is only used to prove the appeal is theirs.
 */
export default function Appeal() {
    const form = useForm({
        email: '',
        password: '',
        message: '',
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        form.transform((data) => ({
            ...data,
            email: data.email.trim().toLowerCase(),
            message: data.message.trim(),
        }));

        form.post('/appeal', {
            onFinish: () => form.reset('password'),
        });
    }

    const tooShort = form.data.message.trim().length < 20;

    return (
        <AuthLayout
            title="Appeal a suspension"
            subtitle="Tell an administrator why the suspension should be lifted."
            asideTitle="Everyone gets to tell their side."
            asidePoints={[
                'A person reads every appeal, not a program',
                'Say what happened, and what the reports got wrong',
                'If this one is refused you can appeal again later',
            ]}
        >
            <Head title="Appeal a suspension" />

            <form onSubmit={submit} className="space-y-5" noValidate>
                <FormField
                    id="email"
                    label="Email address"
                    error={form.errors.email}
                    hint="The email of the suspended account."
                >
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

                <FormField
                    id="password"
                    label="Password"
                    error={form.errors.password}
                    hint="Only used to prove the appeal is really yours."
                >
                    <PasswordInput
                        id="password"
                        autoComplete="current-password"
                        maxLength={128}
                        value={form.data.password}
                        onChange={(e) => form.setData('password', e.target.value)}
                        placeholder="Enter your password"
                        hasError={Boolean(form.errors.password)}
                        aria-invalid={Boolean(form.errors.password)}
                        required
                    />
                </FormField>

                <FormField
                    id="message"
                    label="Your side of the story"
                    error={form.errors.message}
                >
                    <textarea
                        id="message"
                        rows={6}
                        maxLength={MAX}
                        value={form.data.message}
                        onChange={(e) => form.setData('message', e.target.value)}
                        placeholder="What happened? What do the reports leave out? Mention anything an administrator can check, like messages or order details."
                        aria-invalid={Boolean(form.errors.message)}
                        aria-describedby={form.errors.message ? 'message-error' : undefined}
                        className={`${textInputClass(Boolean(form.errors.message)).replace('h-12 ', '')} min-h-40 resize-y py-3`}
                        required
                    />
                    <p className="mt-1.5 flex justify-between text-[13px] text-pine-900/60">
                        <span>{tooShort ? 'At least 20 characters.' : 'Thank you. That is enough to send.'}</span>
                        <span>
                            {form.data.message.length}/{MAX}
                        </span>
                    </p>
                </FormField>

                <button
                    type="submit"
                    disabled={form.processing}
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-pine-800 font-display text-base font-bold text-white shadow-sm transition hover:bg-pine-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pine-700/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {form.processing ? 'Sending…' : 'Send appeal'}
                </button>
            </form>

            <p className="mt-6 rounded-xl bg-mist-100 px-5 py-4 text-center text-[15px] text-pine-900/80">
                Changed your mind?{' '}
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
