import { FormEvent, useState } from 'react';
import { Link, router } from '@inertiajs/react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError('');
        setLoading(true);

        router.post('/login', 
            { email, password },
        {
            onError: (errors) => {
                setError(
                    errors.email ||
                        errors.password ||
                        'Unable to log in. Please check your information.',
                );
            },
            onFinish: () => {
                setLoading(false);
            },
        },
    );
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <span className="logo-mark">A</span>
                </div>

                <p className="auth-eyebrow">
                    ACC MARKETPLACE
                </p>

                <h1>Welcome back</h1>

                <p className="auth-subtitle">
                    Log in to continue buying, selling, and trading
                    on campus.
                </p>

                {error && (
                    <div className="auth-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
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
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="auth-submit"
                        disabled={loading}
                    >
                        {loading
                            ? 'Logging in...'
                            : 'Log in'}
                    </button>
                </form>

                <p className="auth-switch">
                    Don't have an account?{' '}
                    <Link href="/register">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
}