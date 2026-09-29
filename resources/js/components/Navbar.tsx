import { Link, router } from '@inertiajs/react';

interface AuthUser {
    id: number;
    name: string;
    email: string;
}

interface NavbarProps {
    user?: AuthUser | null;
}

export default function Navbar({ user = null }: NavbarProps) {
    function logout() {
        router.post('/logout');
    }

    return (
        <header className="nav">
            <div className="nav-inner">
                <Link href="/" className="logo">
                    <span className="logo-mark">A</span>
                    ACC Marketplace
                </Link>

                <nav className="nav-links">
                    <a href="#how-it-works">
                        How it works
                    </a>

                    <a href="#features">
                        Features
                    </a>

                    <a href="#safety">
                        Safety
                    </a>
                </nav>

                <div className="nav-auth">
                    {user ? (
                        <>
                            <span className="nav-user">
                                Hi, {user.name.split(' ')[0]}
                            </span>

                            <button
                                type="button"
                                className="btn btn-outline btn-small"
                                onClick={logout}
                            >
                                Log out
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className="nav-login">
                                Log in
                            </Link>

                            <Link
                                href="/register"
                                className="btn btn-primary btn-small"
                            >
                                Register
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}