import { Head, Link } from '@inertiajs/react';
import { MessageCircle, Package, Paperclip, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader, { Page } from '../../components/ui/PageHeader';
import { useLiveReload } from '../../lib/live';
import { Attachment, timeAgo } from '../../types/shared';

interface Person {
    id: number;
    name: string;
    avatar_url: string | null;
}

interface Conversation {
    id: number;
    buyer_id: number;
    seller_id: number;
    messages_max_created_at: string | null;
    unread_messages_count: number;
    buyer: Person;
    seller: Person;
    listing: {
        id: number;
        title: string;
        images: { id: number; path: string }[];
    };
    latest_message: {
        sender_id: number;
        is_deleted: boolean;
        body: string | null;
        attachments: Attachment[];
    } | null;
}

type Tab = 'all' | 'unread' | 'buying' | 'selling';

export default function Index({
    conversations,
    currentUserId,
}: {
    conversations: Conversation[];
    currentUserId: number;
}) {
    const [tab, setTab] = useState<Tab>('all');
    const [query, setQuery] = useState('');

    // New messages appear here without a refresh.
    useLiveReload(['conversations'], 4000);

    const unreadTotal = conversations.reduce((n, c) => n + c.unread_messages_count, 0);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();

        return conversations.filter((c) => {
            const other = c.buyer_id === currentUserId ? c.seller : c.buyer;

            if (tab === 'unread' && c.unread_messages_count === 0) return false;
            if (tab === 'buying' && c.buyer_id !== currentUserId) return false;
            if (tab === 'selling' && c.seller_id !== currentUserId) return false;
            if (q && !`${other.name} ${c.listing.title}`.toLowerCase().includes(q)) return false;

            return true;
        });
    }, [conversations, tab, query, currentUserId]);

    const tabs: [Tab, string][] = [
        ['all', 'All'],
        ['unread', `Unread${unreadTotal ? ` (${unreadTotal})` : ''}`],
        ['buying', 'Buying'],
        ['selling', 'Selling'],
    ];

    return (
        <AppLayout>
            <Head title="Messages" />

            <Page>
                <PageHeader icon={MessageCircle} title="Messages" subtitle="Your conversations with buyers and sellers" />

                {conversations.length === 0 ? (
                    <EmptyState
                        icon={MessageCircle}
                        title="No conversations yet"
                        text="Open any listing and tap “Message seller” to start chatting. Replies show up here instantly."
                        action={{ label: 'Browse the marketplace', href: '/marketplace' }}
                    />
                ) : (
                    <div className="ui-card overflow-hidden">
                        <div className="flex flex-wrap items-center gap-3 border-b border-mist-100 p-4">
                            <div className="flex gap-1.5 rounded-xl bg-mist-100 p-1" role="tablist">
                                {tabs.map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        role="tab"
                                        aria-selected={tab === value}
                                        onClick={() => setTab(value)}
                                        className={`rounded-lg px-3.5 py-1.5 text-sm font-bold transition ${
                                            tab === value ? 'bg-white text-pine-800 shadow-sm' : 'text-ink-2 hover:text-pine-800'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="relative ml-auto w-full sm:w-64">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
                                <input
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search people or items"
                                    aria-label="Search conversations"
                                    className="ui-input !h-10 !pl-9 text-sm"
                                />
                            </div>
                        </div>

                        {visible.length > 0 ? (
                            <ul className="divide-y divide-mist-100">
                                {visible.map((c) => {
                                    const other = c.buyer_id === currentUserId ? c.seller : c.buyer;
                                    const last = c.latest_message;
                                    const unread = c.unread_messages_count > 0;
                                    const mine = last?.sender_id === currentUserId;
                                    const preview = last
                                        ? last.is_deleted
                                            ? mine
                                                ? 'You deleted this message'
                                                : 'This message was deleted'
                                            : last.body ||
                                          (last.attachments.length > 0
                                              ? `${last.attachments.length} attachment${last.attachments.length === 1 ? '' : 's'}`
                                              : '')
                                        : 'No messages yet. Say hello!';

                                    return (
                                        <li key={c.id}>
                                            <Link
                                                href={`/messages/${c.id}`}
                                                className={`flex items-center gap-4 px-4 py-4 transition hover:bg-mist-50 sm:px-5 ${
                                                    unread ? 'bg-sun-300/15' : ''
                                                }`}
                                            >
                                                <Avatar name={other.name} url={other.avatar_url} size={48} />

                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-baseline justify-between gap-3">
                                                        <span className={`truncate text-[15px] ${unread ? 'font-extrabold text-ink' : 'font-bold text-ink'}`}>
                                                            {other.name}
                                                        </span>
                                                        <span className="shrink-0 text-xs text-ink-3">
                                                            {timeAgo(c.messages_max_created_at)}
                                                        </span>
                                                    </span>

                                                    <span className="mt-0.5 block truncate text-xs font-semibold text-pine-700">
                                                        {c.listing.title}
                                                    </span>

                                                    <span
                                                        className={`mt-0.5 flex items-center gap-1.5 truncate text-sm ${
                                                            unread ? 'font-semibold text-ink' : 'text-ink-2'
                                                        }`}
                                                    >
                                                        {last && !last.is_deleted && last.attachments.length > 0 && !last.body && (
                                                            <Paperclip size={14} className="shrink-0" />
                                                        )}
                                                        <span className="truncate">
                                                            {mine && last && !last.is_deleted ? 'You: ' : ''}
                                                            {preview}
                                                        </span>
                                                    </span>
                                                </span>

                                                <span className="hidden h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-mist-100 sm:block">
                                                    {c.listing.images[0] ? (
                                                        <img
                                                            src={`/storage/${c.listing.images[0].path}`}
                                                            alt=""
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <Package className="m-4 text-mist-300" size={24} />
                                                    )}
                                                </span>

                                                {unread && (
                                                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-sun-500 px-1.5 text-xs font-extrabold text-pine-950">
                                                        {c.unread_messages_count}
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="px-6 py-14 text-center text-sm text-ink-2">
                                No conversations match your filters.
                            </p>
                        )}
                    </div>
                )}
            </Page>
        </AppLayout>
    );
}
