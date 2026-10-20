import { Link, router, usePage } from '@inertiajs/react';
import {
    LogOut,
    Menu,
    MessageCircle,
    PanelLeftClose,
    PanelLeftOpen,
    Plus,
    Search,
    Settings,
    UserRound,
} from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useLive } from '../../lib/live';
import type { SharedProps } from '../../types/shared';
import Avatar from '../ui/Avatar';

interface HeaderProps {
    collapsed: boolean;
    onToggleCollapse: () => void;
    onOpenMobile: () => void;
}

export default function Header({
    collapsed,
    onToggleCollapse,
    onOpenMobile,
}: HeaderProps) {
    const { auth } = usePage<SharedProps>().props;
    const { unreadMessageCount } = useLive();
    const user = auth.user;

    const [query, setQuery] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;

        const onClick = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMenuOpen(false);
        };

        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    const submitSearch = (event: FormEvent) => {
        event.preventDefault();
        router.get('/marketplace', query.trim() ? { q: query.trim() } : {});
    };

    const iconButton =
        'relative flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 transition hover:bg-mist-100 hover:text-pine-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pine-700/20';

    return (
        <header className="sticky top-0 z-30 border-b border-mist-200 bg-white/85 backdrop-blur-md print:hidden">
            <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6">
                {/* Mobile: open drawer. Desktop: collapse/expand. */}
                <button
                    type="button"
                    onClick={onOpenMobile}
                    aria-label="Open menu"
                    className={`${iconButton} lg:hidden`}
                >
                    <Menu size={22} />
                </button>

                <button
                    type="button"
                    onClick={onToggleCollapse}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className={`${iconButton} hidden lg:flex`}
                >
                    {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                </button>

                <form
                    onSubmit={submitSearch}
                    role="search"
                    className="relative mx-auto w-full max-w-xl"
                >
                    <Search
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3"
                    />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search items, services, sellers…"
                        aria-label="Search the marketplace"
                        className="h-11 w-full rounded-full border border-mist-200 bg-mist-50 pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-pine-700 focus:bg-white focus:ring-4 focus:ring-pine-700/15"
                    />
                </form>

                <div className="flex items-center gap-1.5">
                    {(
                        <Link
                            href="/listings/create"
                            className="ui-btn ui-btn-gold ui-btn-sm mr-1 hidden sm:inline-flex"
                        >
                            <Plus size={16} strokeWidth={2.6} />
                            Sell
                        </Link>
                    )}

                    <Link href="/messages" className={iconButton} aria-label="Messages">
                        <MessageCircle size={21} />
                        {unreadMessageCount > 0 && (
                            <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-sun-500 px-1 text-[10px] font-extrabold text-pine-950 ring-2 ring-white">
                                {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                            </span>
                        )}
                    </Link>

                    {user && (
                        <div ref={menuRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setMenuOpen((v) => !v)}
                                aria-haspopup="menu"
                                aria-expanded={menuOpen}
                                aria-label="Account menu"
                                className="flex items-center gap-2 rounded-full p-1 transition hover:bg-mist-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pine-700/20"
                            >
                                <Avatar name={user.name} url={user.avatar_url} size={36} />
                            </button>

                            {menuOpen && (
                                <div
                                    role="menu"
                                    className="ui-pop absolute right-0 top-[calc(100%+8px)] w-64 overflow-hidden rounded-2xl border border-mist-200 bg-white shadow-[var(--shadow-lift)]"
                                >
                                    <div className="border-b border-mist-100 px-4 py-3">
                                        <p className="truncate text-sm font-bold text-ink">{user.name}</p>
                                        <p className="truncate text-xs text-ink-3">{user.email}</p>
                                    </div>

                                    <div className="p-1.5 text-sm font-medium text-ink-2">
                                        <Link
                                            href={`/users/${user.id}`}
                                            role="menuitem"
                                            onClick={() => setMenuOpen(false)}
                                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-mist-50 hover:text-pine-800"
                                        >
                                            <UserRound size={17} /> My profile
                                        </Link>
                                        <Link
                                            href="/settings"
                                            role="menuitem"
                                            onClick={() => setMenuOpen(false)}
                                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-mist-50 hover:text-pine-800"
                                        >
                                            <Settings size={17} /> Settings
                                        </Link>
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => router.post('/logout')}
                                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-red-700 hover:bg-red-50"
                                        >
                                            <LogOut size={17} /> Log out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
