import { Head, Link, useForm } from '@inertiajs/react';
import { Check, Circle } from 'lucide-react';
import { FormEvent } from 'react';
import AuthLayout from '../Layouts/AuthLayout';
import FormField, { textInputClass } from '../components/ui/FormField';
import PasswordInput from '../components/ui/PasswordInput';
import PhoneInput from '../components/ui/PhoneInput';
import { normalizePhone } from '../lib/phone';

function evaluate(password: string) {
    const checks = {
        length: password.length >= 8 && password.length <= 72,
        letter: /\p{L}/u.test(password),
        number: /\d/.test(password),
    };

    // Strength bonus on top of the three required rules.
    let score = Object.values(checks).filter(Boolean).length;
    if (password.length >= 12) score += 1;
    if (/[^\p{L}\d]/u.test(password) && /\p{Lu}/u.test(password)) score += 1;

    const level = !password
        ? 0
        : score <= 2
          ? 1
          : score === 3
            ? 2
            : score === 4
              ? 3
              : 4;

    return { checks, level };
}

const strengthLabel = ['', 'Weak', 'Okay', 'Good', 'Strong'];
const strengthColor = [
    '',
    'bg-red-500',
    'bg-sun-500',
    'bg-sprout-500',
    'bg-pine-600',
];

export default function Register() {
    const form = useForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
    });

    const { checks, level } = evaluate(form.data.password);

    const confirmMismatch =
        form.data.password_confirmation !== '' &&
        form.data.password_confirmation !== form.data.password;

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        form.transform((data) => ({
            ...data,
            name: data.name.trim().replace(/\s+/g, ' '),
            email: data.email.trim().toLowerCase(),
            // The server accepts every spelling, but sending the canonical form
            // keeps what we show ("saved as ...") identical to what is stored.
            phone: normalizePhone(data.phone) ?? data.phone.trim(),
        }));

        form.post('/register', {
            onFinish: () => form.reset('password', 'password_confirmation'),
        });
    }

    return (
        <AuthLayout
            title="Create your account"
            subtitle="It's free, and it takes less than a minute."
            asideTitle="Join the students already trading on campus."
            asidePoints={[
                'List an item or service in a couple of minutes',
                'Chat with buyers inside the app. Your number stays private',
                'Build a reputation with ratings and reviews',
            ]}
        >
            <Head title="Create account" />

            <form onSubmit={submit} className="space-y-5" noValidate>
                <FormField
                    id="name"
                    label="Full name"
                    error={form.errors.name}
                >
                    <input
                        id="name"
                        type="text"
                        autoComplete="name"
                        autoFocus
                        maxLength={60}
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        placeholder="Juan Dela Cruz"
                        aria-invalid={Boolean(form.errors.name)}
                        aria-describedby={
                            form.errors.name ? 'name-error' : undefined
                        }
                        className={textInputClass(Boolean(form.errors.name))}
                        required
                    />
                </FormField>

                <FormField
                    id="email"
                    label="Email address"
                    error={form.errors.email}
                >
                    <input
                        id="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        maxLength={254}
                        value={form.data.email}
                        onChange={(e) => form.setData('email', e.target.value)}
                        placeholder="you@example.com"
                        aria-invalid={Boolean(form.errors.email)}
                        aria-describedby={
                            form.errors.email ? 'email-error' : undefined
                        }
                        className={textInputClass(Boolean(form.errors.email))}
                        required
                    />
                </FormField>

                <PhoneInput
                    value={form.data.phone}
                    onChange={(value) => {
                        form.setData('phone', value);
                        form.clearErrors('phone');
                    }}
                    error={form.errors.phone}
                />

                <FormField
                    id="password"
                    label="Password"
                    error={form.errors.password}
                >
                    <PasswordInput
                        id="password"
                        autoComplete="new-password"
                        maxLength={72}
                        value={form.data.password}
                        onChange={(e) =>
                            form.setData('password', e.target.value)
                        }
                        placeholder="Create a password"
                        hasError={Boolean(form.errors.password)}
                        aria-invalid={Boolean(form.errors.password)}
                        required
                    />

                    {form.data.password && (
                        <div className="mt-3" aria-live="polite">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-1 gap-1.5">
                                    {[1, 2, 3, 4].map((n) => (
                                        <span
                                            key={n}
                                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                                                n <= level
                                                    ? strengthColor[level]
                                                    : 'bg-pine-900/10'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="w-12 text-right text-xs font-semibold text-pine-900/70">
                                    {strengthLabel[level]}
                                </span>
                            </div>
                        </div>
                    )}

                    <ul className="mt-3 space-y-1.5 text-[13px]">
                        {(
                            [
                                [checks.length, '8 to 72 characters'],
                                [checks.letter, 'At least one letter'],
                                [checks.number, 'At least one number'],
                            ] as const
                        ).map(([ok, label]) => (
                            <li
                                key={label}
                                className={`flex items-center gap-2 ${
                                    ok ? 'text-pine-700' : 'text-pine-900/55'
                                }`}
                            >
                                {ok ? (
                                    <Check size={15} strokeWidth={3} />
                                ) : (
                                    <Circle size={15} />
                                )}
                                {label}
                            </li>
                        ))}
                    </ul>
                </FormField>

                <FormField
                    id="password_confirmation"
                    label="Confirm password"
                    error={
                        confirmMismatch
                            ? 'The two passwords do not match.'
                            : form.errors.password_confirmation
                    }
                >
                    <PasswordInput
                        id="password_confirmation"
                        autoComplete="new-password"
                        maxLength={72}
                        value={form.data.password_confirmation}
                        onChange={(e) =>
                            form.setData(
                                'password_confirmation',
                                e.target.value,
                            )
                        }
                        placeholder="Type your password again"
                        hasError={confirmMismatch}
                        aria-invalid={confirmMismatch}
                        required
                    />
                </FormField>

                <button
                    type="submit"
                    disabled={form.processing || confirmMismatch}
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-pine-800 font-display text-base font-bold text-white shadow-sm transition hover:bg-pine-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pine-700/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {form.processing ? 'Creating account…' : 'Create account'}
                </button>

                <p className="text-center text-xs leading-relaxed text-pine-900/60">
                    By creating an account you agree to follow the marketplace
                    rules and keep trades respectful.
                </p>
            </form>

            <p className="mt-6 rounded-xl bg-mist-100 px-5 py-4 text-center text-[15px] text-pine-900/80">
                Already have an account?{' '}
                <Link
                    href="/login"
                    className="font-bold text-pine-700 underline decoration-sun-500 decoration-[3px] underline-offset-4 transition hover:text-pine-900"
                >
                    Log in
                </Link>
            </p>
        </AuthLayout>
    );
}
