import type { User } from '../types/auth';

interface NavbarProps {
    user: User | null;
    onLogin: () => void;
    onRegister: () => void;
    onLogout: () => void;
}

export default function Navbar({
    user,
    onLogin,
    onRegister,
    onLogout,
}: NavbarProps) {
    return (
        <header className="nav">
            <div className="nav-inner">
                <a href="/" className="logo">
                    <span className="logo-mark">A</span>
                    ACC Marketplace
                </a>

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
                                onClick={onLogout}
                            >
                                Log out
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="nav-login"
                                onClick={onLogin}
                            >
                                Log in
                            </button>

                            <button
                                type="button"
                                className="btn btn-primary btn-small"
                                onClick={onRegister}
                            >
                                Register
                            </button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}