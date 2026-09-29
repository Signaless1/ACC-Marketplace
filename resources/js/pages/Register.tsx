import { FormEvent, useState } from 'react';
import { apiFetch } from '../lib/api';

interface RegisterProps {
    onSuccess: () => void;
    onLogin: () => void;
}

export default function Register({
    onSuccess,
    onLogin,
}: RegisterProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] =
        useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setError('');

        if (password !== passwordConfirmation) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);

        try {
            const response = await apiFetch('/register', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    password_confirmation: passwordConfirmation,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(
                    data.message ||
                        'Unable to create your account.',
                );
                return;
            }

            onSuccess();
        } catch {
            setError(
                'Something went wrong. Please try again.',
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card auth-card-register">
                <div className="auth-logo">
                    <span className="logo-mark">A</span>
                </div>

                <p className="auth-eyebrow">
                    ACC MARKETPLACE
                </p>

                <h1>Create your account</h1>

                <p className="auth-subtitle">
                    Join the campus marketplace and start trading
                    with other ACC students.
                </p>

                {error && (
                    <div className="auth-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">
                            Full name
                        </label>

                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(event) =>
                                setName(event.target.value)
                            }
                            placeholder="Your full name"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">
                            Email address
                        </label>

                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">
                            Password
                        </label>

                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            placeholder="At least 8 characters"
                            minLength={8}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password_confirmation">
                            Confirm password
                        </label>

                        <input
                            id="password_confirmation"
                            type="password"
                            value={passwordConfirmation}
                            onChange={(event) =>
                                setPasswordConfirmation(
                                    event.target.value,
                                )
                            }
                            placeholder="Repeat your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="auth-submit"
                        disabled={loading}
                    >
                        {loading
                            ? 'Creating account...'
                            : 'Create account'}
                    </button>
                </form>

                <p className="auth-switch">
                    Already have an account?{' '}
                    <button
                        type="button"
                        onClick={onLogin}
                    >
                        Log in
                    </button>
                </p>
            </div>
        </div>
    );
}