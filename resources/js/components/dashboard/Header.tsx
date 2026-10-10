import { Link, router, usePage } from '@inertiajs/react';
import { Bell, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import type { SharedProps } from '../../types/shared';
import { useLayout } from '../../Layouts/LayoutContext';
import Avatar from '../ui/Avatar';

export default function Header() {
    const { auth } = usePage<SharedProps>().props;
    const { unread: unreadMessageCount, sidebarVisible, toggleSidebar } = useLayout();
    const [query, setQuery] = useState('');

    const submitSearch = (event: FormEvent) => {
        event.preventDefault();

        router.get('/marketplace', query.trim() ? { q: query.trim() } : {});
    };

    return (
        <header className="dashboard-header">
            <div className="dashboard-header-left">
                <button
                    type="button"
                    className="sidebar-toggle"
                    onClick={toggleSidebar}
                    aria-label={sidebarVisible ? 'Close sidebar' : 'Open sidebar'}
                    aria-expanded={sidebarVisible}
                    aria-controls="app-sidebar"
                    title={sidebarVisible ? 'Close sidebar' : 'Open sidebar'}
                >
                    {sidebarVisible ? (
                        <PanelLeftClose size={20} strokeWidth={1.8} />
                    ) : (
                        <PanelLeftOpen size={20} strokeWidth={1.8} />
                    )}
                </button>

                <img
                    src="/images/logo.png"
                    alt="Abuyog Community College"
                    className="dashboard-header-logo"
                />

                <div className="dashboard-header-divider" />

                <div>
                    <div className="dashboard-brand-title">
                        ACC Marketplace
                    </div>

                    <div className="dashboard-brand-subtitle">
                        BUY • SELL • CONNECT
                    </div>
                </div>
            </div>

            <form
                className="dashboard-search"
                onSubmit={submitSearch}
                role="search"
            >
                <Search size={17} strokeWidth={1.8} />

                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search products, name, or category..."
                    aria-label="Search listings"
                />
            </form>

            <div className="dashboard-header-actions">
                <Link
                    href="/messages"
                    className="dashboard-icon-button"
                    aria-label="Messages"
                >
                    <Bell size={18} strokeWidth={1.8} />

                    {unreadMessageCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#d4623a] px-1 text-[10px] font-bold text-white ring-2 ring-white">
                            {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                        </span>
                    )}
                </Link>

                {auth.user && (
                    <Link
                        href={`/users/${auth.user.id}`}
                        className="dashboard-icon-button"
                        aria-label="My profile"
                    >
                        <Avatar
                            name={auth.user.name}
                            url={auth.user.avatar_url}
                            size={26}
                        />
                    </Link>
                )}
            </div>
        </header>
    );
}
