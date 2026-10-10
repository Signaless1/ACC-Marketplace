import { Link, router, usePage } from '@inertiajs/react';
import {
    Flag,
    Heart,
    LayoutDashboard,
    ShieldCheck,
    Users,
    LogOut,
    MessageSquare,
    Package,
    Plus,
    Settings,
    ShoppingBag,
    Star,
    Store,
    X,
} from 'lucide-react';
import { useLayout } from '../../Layouts/LayoutContext';

interface PageProps {
    auth: {
        user: {
            id: number;
            name: string;
            email: string;
            role?: 'user' | 'admin';
        } | null;
    };

    [key: string]: unknown;
}

export default function Sidebar() {
    const { url, props } = usePage<PageProps>();
    const { auth } = props;
    const { unread: unreadMessageCount, closeSidebarOnMobile, sidebarVisible } = useLayout();

    const isActive = (path: string) =>
        url === path ||
        url.startsWith(`${path}/`) ||
        url.startsWith(`${path}?`);

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

    navigation.splice(5, 0, {
        label: 'Favorites',
        href: '/favorites',
        icon: Heart,
    });

    const adminNavigation = [
        { label: 'Overview', href: '/admin', icon: ShieldCheck },
        { label: 'Users', href: '/admin/users', icon: Users },
        { label: 'Listings', href: '/admin/listings', icon: Package },
        { label: 'Reports', href: '/admin/reports', icon: Flag },
    ];

    function logout() {
        router.post('/logout');
    }

    return (
        <aside
            className="dashboard-sidebar"
            id="app-sidebar"
            aria-label="Main navigation"
            aria-hidden={!sidebarVisible}
            // Keeps hidden links out of the tab order while the sidebar is closed.
            inert={!sidebarVisible}
        >
            <button
                type="button"
                className="sidebar-close"
                onClick={closeSidebarOnMobile}
                aria-label="Close menu"
            >
                <X size={18} />
            </button>

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

            <nav className="sidebar-nav" onClick={(event) => {
                if ((event.target as HTMLElement).closest('a')) {
                    closeSidebarOnMobile();
                }
            }}>
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

                                <span className="flex-1">
                                    {item.label}
                                </span>

                                {item.label === 'Messages' &&
                                    unreadMessageCount > 0 && (
                                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d4623a] px-1.5 text-[10px] font-bold text-white">
                                            {unreadMessageCount > 99
                                                ? '99+'
                                                : unreadMessageCount}
                                        </span>
                                    )}
                            </Link>
                        );
                    })}
                </div>

                {auth.user?.role === 'admin' && (
                    <>
                        <div className="sidebar-divider" />

                        <div className="sidebar-section-label">
                            Admin
                        </div>

                        <div className="sidebar-nav-list">
                            {adminNavigation.map((item) => {
                                const Icon = item.icon;
                                const active =
                                    item.href === '/admin'
                                        ? url === '/admin'
                                        : isActive(item.href);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`sidebar-nav-link ${
                                            active ? 'active' : ''
                                        }`}
                                    >
                                        <Icon size={18} strokeWidth={1.8} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </>
                )}

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