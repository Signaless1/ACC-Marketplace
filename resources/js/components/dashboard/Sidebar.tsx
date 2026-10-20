import { Link, router, usePage } from '@inertiajs/react';
import {
    Flag,
    Heart,
    LayoutDashboard,
    LogOut,
    Package,
    Plus,
    ReceiptText,
    Scale,
    Settings,
    ShieldCheck,
    ShoppingBag,
    Star,
    Store,
    Users,
    X,
    type LucideIcon,
} from 'lucide-react';
import { useLive } from '../../lib/live';
import type { SharedProps } from '../../types/shared';
import Avatar from '../ui/Avatar';

interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    badge?: number;
    /** Highlight only on an exact URL match (e.g. /dashboard). */
    exact?: boolean;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

interface SidebarProps {
    collapsed: boolean;
    onToggleCollapse: () => void;
    mobileOpen: boolean;
    onCloseMobile: () => void;
}

export default function Sidebar({
    collapsed,
    onToggleCollapse,
    mobileOpen,
    onCloseMobile,
}: SidebarProps) {
    const { url, props } = usePage<SharedProps>();
    const { pendingOrderCount, pendingReportCount } = useLive();
    const user = props.auth.user;
    const isAdmin = user?.role === 'admin';

    const path = url.split('?')[0];

    // Everyone gets the same member navigation; admins get the Moderation group on top.
    // Messages is reached only through the header icon, and the profile through the avatar menu.
    const moderationGroup: NavGroup = {
        label: 'Moderation',
        items: [
            { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
            { label: 'Reports', href: '/admin/reports', icon: Flag, badge: pendingReportCount },
            { label: 'Transactions', href: '/admin/orders', icon: ReceiptText },
            { label: 'Listings', href: '/admin/listings', icon: Package },
            { label: 'Users', href: '/admin/users', icon: Users },
        ],
    };

    const discoverItems: NavItem[] = [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
        { label: 'Marketplace', href: '/marketplace', icon: Store },
        { label: 'Favorites', href: '/favorites', icon: Heart },
    ];

    const memberGroups: NavGroup[] = [
        {
            label: 'Discover',
            // Admins already have Dashboard under Moderation.
            items: isAdmin ? discoverItems.slice(1) : discoverItems,
        },
        {
            label: 'Selling & buying',
            items: [
                { label: 'My listings', href: '/listings', icon: Package, exact: true },
                { label: 'My orders', href: '/orders', icon: ShoppingBag, badge: pendingOrderCount },
                { label: 'Reviews', href: '/reviews', icon: Star },
            ],
        },
        {
            label: 'Account',
            items: [
                { label: 'My reports', href: '/reports', icon: Scale },
                { label: 'Settings', href: '/settings', icon: Settings },
            ],
        },
    ];

    const groups: NavGroup[] = isAdmin ? [moderationGroup, ...memberGroups] : memberGroups;

    const isActive = (item: NavItem) =>
        item.exact
            ? path === item.href
            : path === item.href || path.startsWith(`${item.href}/`);

    const logout = () => router.post('/logout');

    return (
        <>
            {/* Dim the page behind the drawer on small screens */}
            <div
                onClick={onCloseMobile}
                aria-hidden="true"
                className={`fixed inset-0 z-40 bg-pine-950/55 backdrop-blur-[2px] transition-opacity print:hidden lg:hidden ${
                    mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
            />

            <aside
                data-collapsed={collapsed}
                aria-label="Main navigation"
                className={`group/sb fixed inset-y-0 left-0 z-50 flex w-[284px] print:hidden flex-col bg-gradient-to-b from-pine-950 via-pine-950 to-pine-900 text-white shadow-2xl transition-[transform,width] duration-300 ease-out lg:translate-x-0 lg:shadow-none ${
                    mobileOpen ? 'translate-x-0' : '-translate-x-full'
                } ${collapsed ? 'lg:w-[84px]' : 'lg:w-[272px]'}`}
            >
                {/* Brand + collapse control */}
                <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-white/10 px-4">
                    <Link
                        href="/dashboard"
                        className="flex min-w-0 flex-1 items-center gap-3"
                        title={collapsed ? 'ACC Marketplace' : undefined}
                    >
                        <img
                            src="/images/logo.png"
                            alt=""
                            className="h-11 w-11 shrink-0 rounded-full bg-white p-0.5"
                        />
                        <span className="min-w-0 leading-tight lg:group-data-[collapsed=true]/sb:hidden">
                            <strong className="block truncate font-display text-[17px] font-extrabold text-white">
                                ACC Marketplace
                            </strong>
                            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-sun-300">
                                {isAdmin ? 'Admin console' : 'Buy · Sell · Trade'}
                            </span>
                        </span>
                    </Link>

                    <button
                        type="button"
                        onClick={onCloseMobile}
                        aria-label="Close menu"
                        className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white lg:hidden"
                    >
                        <X size={20} />
                    </button>

                </div>

                {/* Navigation */}
                <nav className="thin-scroll-light min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
                    {isAdmin && (
                        <div className="mb-4 flex items-center gap-2.5 rounded-xl bg-sun-400/15 px-3 py-2.5 text-sun-300 ring-1 ring-sun-400/30 lg:group-data-[collapsed=true]/sb:hidden">
                            <ShieldCheck size={18} className="shrink-0" />
                            <span className="text-[13px] font-semibold">
                                Signed in as administrator
                            </span>
                        </div>
                    )}

                    {groups.map((group, index) => (
                        <div key={group.label} className={index > 0 ? 'mt-5' : ''}>
                            <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/55 lg:group-data-[collapsed=true]/sb:hidden">
                                {group.label}
                            </p>
                            {index > 0 && (
                                <hr className="mx-2 mb-2 hidden border-white/10 lg:group-data-[collapsed=true]/sb:block" />
                            )}

                            <ul className="space-y-1">
                                {group.items.map((item) => {
                                    const active = isActive(item);
                                    const Icon = item.icon;

                                    return (
                                        <li key={item.href}>
                                            <Link
                                                href={item.href}
                                                title={collapsed ? item.label : undefined}
                                                aria-label={item.label}
                                                aria-current={active ? 'page' : undefined}
                                                className={`relative flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-semibold transition lg:group-data-[collapsed=true]/sb:justify-center lg:group-data-[collapsed=true]/sb:px-0 ${
                                                    active
                                                        ? 'bg-white/12 text-white'
                                                        : 'text-white/80 hover:bg-white/8 hover:text-white'
                                                }`}
                                            >
                                                {active && (
                                                    <span className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-sun-400" />
                                                )}

                                                <span className="relative">
                                                    <Icon
                                                        size={19}
                                                        strokeWidth={active ? 2.2 : 1.9}
                                                        className={active ? 'text-sun-300' : ''}
                                                    />
                                                    {!!item.badge && item.badge > 0 && (
                                                        <span className="absolute -right-1.5 -top-1.5 hidden h-2.5 w-2.5 rounded-full bg-sun-400 ring-2 ring-pine-950 lg:group-data-[collapsed=true]/sb:block" />
                                                    )}
                                                </span>

                                                <span className="min-w-0 flex-1 truncate lg:group-data-[collapsed=true]/sb:hidden">
                                                    {item.label}
                                                </span>

                                                {!!item.badge && item.badge > 0 && (
                                                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sun-400 px-1.5 text-[11px] font-extrabold text-pine-950 lg:group-data-[collapsed=true]/sb:hidden">
                                                        {item.badge > 99 ? '99+' : item.badge}
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                {/* Footer: sell button + account */}
                <div className="shrink-0 space-y-3 border-t border-white/10 p-3">
                    {(
                        <Link
                            href="/listings/create"
                            title={collapsed ? 'Sell something' : undefined}
                            aria-label="Sell something"
                            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-sun-400 font-display text-sm font-extrabold text-pine-950 shadow-lg shadow-black/20 transition hover:bg-sun-300"
                        >
                            <Plus size={19} strokeWidth={2.6} />
                            <span className="lg:group-data-[collapsed=true]/sb:hidden">
                                Sell something
                            </span>
                        </Link>
                    )}

                    <div className="flex items-center gap-3 rounded-xl bg-white/6 p-2 lg:group-data-[collapsed=true]/sb:flex-col lg:group-data-[collapsed=true]/sb:bg-transparent lg:group-data-[collapsed=true]/sb:p-0">
                        {user && (
                            <Link
                                href={`/users/${user.id}`}
                                title={collapsed ? user.name : undefined}
                                className="flex min-w-0 flex-1 items-center gap-2.5 lg:group-data-[collapsed=true]/sb:flex-none"
                            >
                                <Avatar name={user.name} url={user.avatar_url} size={36} />
                                <span className="min-w-0 leading-tight lg:group-data-[collapsed=true]/sb:hidden">
                                    <span className="block truncate text-[13px] font-bold text-white">
                                        {user.name}
                                    </span>
                                    <span className="block text-[11px] font-medium text-white/60">
                                        {isAdmin ? 'Administrator' : 'Student'}
                                    </span>
                                </span>
                            </Link>
                        )}

                        <button
                            type="button"
                            onClick={logout}
                            aria-label="Log out"
                            title="Log out"
                            className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
