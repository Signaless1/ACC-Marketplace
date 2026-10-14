import { router } from '@inertiajs/react';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import Header from '../components/dashboard/Header';
import MessagePopup from '../components/dashboard/MessagePopup';
import Sidebar from '../components/dashboard/Sidebar';
import SuspendedNotice from '../components/ui/SuspendedNotice';
import Toast from '../components/ui/Toast';
import { LiveProvider } from '../lib/live';

const STORAGE_KEY = 'acc.sidebar';

interface AppLayoutProps {
    children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    // The collapsed state is remembered between visits.
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        try {
            return window.localStorage.getItem(STORAGE_KEY) === 'collapsed';
        } catch {
            return false;
        }
    });
    const [mobileOpen, setMobileOpen] = useState(false);

    const toggleCollapse = useCallback(() => {
        setCollapsed((current) => {
            const next = !current;

            try {
                window.localStorage.setItem(STORAGE_KEY, next ? 'collapsed' : 'expanded');
            } catch {
                // Private mode: still works, just not remembered.
            }

            return next;
        });
    }, []);

    // Close the mobile drawer after navigating, and on Escape.
    useEffect(() => {
        const stop = router.on('navigate', () => setMobileOpen(false));
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMobileOpen(false);
        };

        window.addEventListener('keydown', onKey);

        return () => {
            stop();
            window.removeEventListener('keydown', onKey);
        };
    }, []);

    return (
        <LiveProvider>
            <div className="min-h-screen bg-mist-50 font-body text-ink print:bg-white">
                <Toast />
                <SuspendedNotice />
                <MessagePopup />

                <Sidebar
                    collapsed={collapsed}
                    onToggleCollapse={toggleCollapse}
                    mobileOpen={mobileOpen}
                    onCloseMobile={() => setMobileOpen(false)}
                />

                <div
                    className={`min-h-screen transition-[padding] duration-300 ease-out print:pl-0 ${
                        collapsed ? 'lg:pl-[84px]' : 'lg:pl-[272px]'
                    }`}
                >
                    <Header
                        collapsed={collapsed}
                        onToggleCollapse={toggleCollapse}
                        onOpenMobile={() => setMobileOpen(true)}
                    />

                    <main className="min-w-0">{children}</main>
                </div>
            </div>
        </LiveProvider>
    );
}
