import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import AuthLayout from '../Layouts/AuthLayout';
import FormField, { textInputClass } from '../components/ui/FormField';
import PasswordInput from '../components/ui/PasswordInput';

export default function Login() {
    const form = useForm({
        email: '',
        password: '',
        remember: false,
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        form.post('/login', {
            onFinish: () => form.reset('password'),
        });
    }

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Log in to check your orders, messages and listings."
            asideTitle="Your campus marketplace is waiting."
            asidePoints={[
                'Pick up where you left off with orders and messages',
                'Buy and sell with students you can actually meet',
                'Every seller is rated by real buyers',
            ]}
        >
            <Head title="Log in" />

            <form onSubmit={submit} className="space-y-5" noValidate>
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
                        autoFocus
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

                <FormField
                    id="password"
                    label="Password"
                    error={form.errors.password}
                >
                    <PasswordInput
                        id="password"
                        autoComplete="current-password"
                        maxLength={128}
                        value={form.data.password}
                        onChange={(e) =>
                            form.setData('password', e.target.value)
                        }
                        placeholder="Enter your password"
                        hasError={Boolean(form.errors.password)}
                        aria-invalid={Boolean(form.errors.password)}
                        required
                    />
                </FormField>

                <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-pine-900/80">
                    <input
                        type="checkbox"
                        checked={form.data.remember}
                        onChange={(e) =>
                            form.setData('remember', e.target.checked)
                        }
                        className="h-4.5 w-4.5 rounded border-pine-900/30 accent-pine-700"
                    />
                    Keep me logged in on this device
                </label>

                <button
                    type="submit"
                    disabled={form.processing}
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-pine-800 font-display text-base font-bold text-white shadow-sm transition hover:bg-pine-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pine-700/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {form.processing ? 'Logging in…' : 'Log in'}
                </button>
            </form>

            <p className="mt-8 rounded-xl bg-mist-100 px-5 py-4 text-center text-[15px] text-pine-900/80">
                New to ACC Marketplace?{' '}
                <Link
                    href="/register"
                    className="font-bold text-pine-700 underline decoration-sun-500 decoration-[3px] underline-offset-4 transition hover:text-pine-900"
                >
                    Create an account
                </Link>
            </p>
        </AuthLayout>
    );
}
