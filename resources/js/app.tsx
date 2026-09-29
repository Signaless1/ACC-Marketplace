import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

import { apiFetch } from './lib/api';
import type { User } from './types/auth';

function App() {
    const [user, setUser] = useState<User | null>(null);
    const [path, setPath] = useState(window.location.pathname);

    async function loadUser() {
        try {
            const response = await apiFetch('/auth/user');

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
            }
        } catch {
            setUser(null);
        }
    }

    useEffect(() => {
        loadUser();
    }, []);

    useEffect(() => {
        const handlePopState = () => {
            setPath(window.location.pathname);
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    function navigate(newPath: string) {
        window.history.pushState({}, '', newPath);
        setPath(newPath);
    }

    if (path === '/login') {
        return (
            <Login
                onSuccess={async () => {
                    await loadUser();
                    navigate('/');
                }}
                onRegister={() => navigate('/register')}
            />
        );
    }

    if (path === '/register') {
        return (
            <Register
                onSuccess={async () => {
                    await loadUser();
                    navigate('/');
                }}
                onLogin={() => navigate('/login')}
            />
        );
    }

    return (
        <Home
            user={user}
            onLogin={() => navigate('/login')}
            onRegister={() => navigate('/register')}
            onLogout={async () => {
                await apiFetch('/logout', {
                    method: 'POST',
                });

                setUser(null);
                navigate('/');
            }}
        />
    );
}

createRoot(
    document.getElementById('app')!,
).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);