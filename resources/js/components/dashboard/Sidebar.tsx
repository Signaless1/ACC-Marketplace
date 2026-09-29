import { Link, router, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    LogOut,
    MessageSquare,
    Package,
    Plus,
    Settings,
    ShoppingBag,
    Star,
    Store,
} from 'lucide-react';

interface PageProps {
    auth: {
        user: {
            id: number;
            name: string;
            email: string;
        } | null;
    };
}

export default function Sidebar() {
    const { url } = usePage<PageProps>();

    const isActive = (path: string) =>
        url === path || url.startsWith(`${path}/`);

    const navigation = [
        {
            label: 'Dashboard',
            href: '/dashboard',
            icon: LayoutDashboard,
        },
        {
            label: 'Marketplace',
            href: '/marketplace',
            icon: Store,
        },
        {
            label: 'My Listings',
            href: '/listings',
            icon: Package,
        },
        {
            label: 'My Orders',
            href: '/orders',
            icon: ShoppingBag,
        },
        {
            label: 'Messages',
            href: '/messages',
            icon: MessageSquare,
        },
        {
            label: 'Reviews',
            href: '/reviews',
            icon: Star,
        },
    ];

    function logout() {
        router.post('/logout');
    }

    return (
        <aside className="dashboard-sidebar">
            <div className="sidebar-brand">
                <Link href="/" className="sidebar-brand-link">
                    <img
                        src="/images/logo.png"
                        alt="Abuyog Community College"
                        className="sidebar-brand-logo"
                    />

                    <div className="sidebar-brand-text">
                        <strong>ACC Marketplace</strong>
                        <span>BUY • SELL • CONNECT</span>
                    </div>
                </Link>
            </div>

            <nav className="sidebar-nav">
                <div className="sidebar-section-label">
                    Marketplace
                </div>

                <div className="sidebar-nav-list">
                    {navigation.map((item) => {
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar-nav-link ${
                                    isActive(item.href)
                                        ? 'active'
                                        : ''
                                }`}
                            >
                                <Icon size={18} strokeWidth={1.8} />

                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="sidebar-divider" />

                <div className="sidebar-section-label">
                    Account
                </div>

                <Link
                    href="/settings"
                    className={`sidebar-nav-link ${
                        isActive('/settings') ? 'active' : ''
                    }`}
                >
                    <Settings size={18} strokeWidth={1.8} />

                    <span>Settings</span>
                </Link>

                <Link
                    href="/listings/create"
                    className="sidebar-sell-button"
                >
                    <Plus size={17} />

                    <span>Sell Something</span>
                </Link>
            </nav>

            <div className="sidebar-footer">
                <img
                    src="/images/sidebar-branding.png"
                    alt=""
                    className="sidebar-lineart"
                />

                <button
                    type="button"
                    onClick={logout}
                    className="sidebar-logout"
                >
                    <LogOut size={18} />

                    <span>Log out</span>
                </button>
            </div>
        </aside>
    );
}