import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import Header from '../components/dashboard/Header';
import MessagePopup from '../components/ui/MessagePopup';
import Toast from '../components/ui/Toast';
import { useMessagePolling } from '../hooks/useMessagePolling';
import { LayoutContext } from './LayoutContext';

interface AppLayoutProps {
    children: ReactNode;
}

const STORAGE_KEY = 'acc.sidebar.collapsed';
const MOBILE_QUERY = '(max-width: 900px)';

const isMobile = () =>
    typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;

function readCollapsed(): boolean {
    try {
        return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

export default function AppLayout({ children }: AppLayoutProps) {
    // Desktop: remembered between visits. Mobile: always starts closed.
    const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { unread, incoming, dismissIncoming } = useMessagePolling();

    const toggleSidebar = useCallback(() => {
        if (isMobile()) {
            setMobileOpen((open) => !open);

            return;
        }

        setCollapsed((current) => {
            const next = !current;

            try {
                window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
            } catch {
                // Private mode: the toggle still works for this visit.
            }

            return next;
        });
    }, []);

    const closeSidebarOnMobile = useCallback(() => setMobileOpen(false), []);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMobileOpen(false);
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const sidebarVisible = isMobile() ? mobileOpen : !collapsed;

    const value = useMemo(
        () => ({ sidebarVisible, toggleSidebar, closeSidebarOnMobile, unread }),
        [sidebarVisible, toggleSidebar, closeSidebarOnMobile, unread],
    );

    return (
        <LayoutContext.Provider value={value}>
            <div className="dashboard-page">
                <Toast />
                <MessagePopup message={incoming} onDismiss={dismissIncoming} />

                <div
                    className={`dashboard-shell ${collapsed ? 'sidebar-collapsed' : ''} ${
                        mobileOpen ? 'sidebar-open-mobile' : ''
                    }`}
                >
                    <Sidebar />

                    <button
                        type="button"
                        className="sidebar-backdrop"
                        aria-label="Close menu"
                        tabIndex={-1}
                        onClick={closeSidebarOnMobile}
                    />

                    <div className="dashboard-main">
                        <Header />

                        <main className="dashboard-content">{children}</main>
                    </div>
                </div>
            </div>
        </LayoutContext.Provider>
    );
}
