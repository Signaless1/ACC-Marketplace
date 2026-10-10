import { Head, Link, usePage } from '@inertiajs/react';
import {
    Bell,
    ChevronRight,
    Heart,
    MessageCircle,
    Package,
    Plus,
    Search,
    Star,
    Tag,
} from 'lucide-react';
import { ReactNode } from 'react';
import AppLayout from '../Layouts/AppLayout';
import Avatar from '../components/ui/Avatar';
import ListingCard, { CardListing } from '../components/ui/ListingCard';
import RatingStars from '../components/ui/RatingStars';
import { SharedProps } from '../types/shared';

interface Conversation {
    id: number;
    other_user: { id: number; name: string; avatar_url: string | null };
    listing: { id: number; title: string } | null;
    last_message: { body: string; from_me: boolean; created_at: string } | null;
    unread_count: number;
}

interface ReviewableOrder {
    id: number;
    listing: { id: number; title: string };
    seller: { id: number; name: string; avatar_url: string | null };
}

interface Props {
    stats: { available: number; reserved: number; sold: number };
    savedListings: CardListing[];
    savedCount: number;
    recentConversations: Conversation[];
    reviewableOrders: ReviewableOrder[];
    reviewableCount: number;
    attention: {
        unread_messages: number;
        orders_to_confirm: number;
        orders_to_complete: number;
        reviews_to_leave: number;
    };
    recentListings: CardListing[];
    categories: { id: number; name: string; listings_count: number }[];
    isNewUser: boolean;
}

const greeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';

    return 'Good evening';
};

const timeAgo = (iso: string) => {
    const seconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(iso).getTime()) / 1000),
    );

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return new Date(iso).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
    });
};

const card = 'rounded-2xl border border-[#E1E9E4] bg-white p-5 shadow-sm';

function SectionHeading({
    title,
    href,
    linkLabel,
}: {
    title: string;
    href?: string;
    linkLabel?: string;
}) {
    return (
        <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[#17352A]">{title}</h2>
            {href && (
                <Link
                    href={href}
                    className="text-sm font-semibold text-[#176B4D] hover:underline"
                >
                    {linkLabel}
                </Link>
            )}
        </div>
    );
}

function EmptyNote({ children }: { children: ReactNode }) {
    return <p className="py-4 text-sm text-slate-500">{children}</p>;
}

export default function Dashboard({
    stats,
    savedListings,
    savedCount,
    recentConversations,
    reviewableOrders,
    reviewableCount,
    attention,
    recentListings,
    categories,
    isNewUser,
}: Props) {
    const { auth } = usePage<SharedProps>().props;
    const firstName = auth.user?.name?.split(' ')[0] || 'there';

    const attentionItems = [
        {
            count: attention.unread_messages,
            icon: <MessageCircle size={17} />,
            text: (n: number) =>
                `${n} unread message${n === 1 ? '' : 's'}`,
            href: '/messages',
        },
        {
            count: attention.orders_to_confirm,
            icon: <Package size={17} />,
            text: (n: number) =>
                `${n} order${n === 1 ? '' : 's'} waiting for your confirmation`,
            href: '/orders',
        },
        {
            count: attention.orders_to_complete,
            icon: <Package size={17} />,
            text: (n: number) =>
                `${n} confirmed order${n === 1 ? '' : 's'} to complete`,
            href: '/orders',
        },
        {
            count: attention.reviews_to_leave,
            icon: <Star size={17} />,
            text: (n: number) =>
                `${n} review${n === 1 ? '' : 's'} to leave`,
            href: '/reviews',
        },
    ].filter((item) => item.count > 0);

    const quickActions = [
        { label: 'Create Listing', href: '/listings/create', icon: <Plus size={18} />, primary: true },
        { label: 'Browse Marketplace', href: '/marketplace', icon: <Search size={18} /> },
        { label: 'Messages', href: '/messages', icon: <MessageCircle size={18} /> },
        { label: 'My Listings', href: '/listings', icon: <Tag size={18} /> },
    ];

    return (
        <AppLayout>
            <Head title="Dashboard" />

            <div className="min-h-full bg-[#F7F9F8] px-4 py-8 sm:px-6">
                <div className="mx-auto max-w-5xl space-y-8">
                    {/* Welcome + quick actions */}
                    <section>
                        <h1 className="text-2xl font-bold text-[#17352A]">
                            {greeting()}, {firstName}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {isNewUser
                                ? 'Welcome to ACC Marketplace.'
                                : attentionItems.length > 0
                                  ? 'Here is what needs your attention today.'
                                  : 'Here is what is happening with your marketplace activity.'}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {quickActions.map((a) => (
                                <Link
                                    key={a.href}
                                    href={a.href}
                                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                                        a.primary
                                            ? 'bg-[#176B4D] text-white hover:bg-[#12583F]'
                                            : 'border border-[#DDE6E0] bg-white text-[#17352A] hover:bg-[#EAF4EF]'
                                    }`}
                                >
                                    {a.icon}
                                    {a.label}
                                </Link>
                            ))}
                        </div>
                    </section>

                    {isNewUser && (
                        <section className="rounded-2xl border border-dashed border-[#CBD8D1] bg-white px-6 py-12 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF4EF] text-[#176B4D]">
                                <Package size={28} />
                            </div>
                            <h2 className="mt-4 text-xl font-bold text-[#17352A]">
                                Welcome to ACC Marketplace
                            </h2>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                Start by exploring listings from other
                                students, or create your first listing.
                            </p>
                            <div className="mt-6 flex flex-wrap justify-center gap-3">
                                <Link
                                    href="/marketplace"
                                    className="rounded-xl bg-[#176B4D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#12583F]"
                                >
                                    Browse Marketplace
                                </Link>
                                <Link
                                    href="/listings/create"
                                    className="rounded-xl border border-[#176B4D] px-5 py-2.5 text-sm font-semibold text-[#176B4D] hover:bg-[#EAF4EF]"
                                >
                                    Create Listing
                                </Link>
                            </div>
                        </section>
                    )}

                    {/* Needs attention: only when there is something to do */}
                    {attentionItems.length > 0 && (
                        <section
                            aria-label="Needs your attention"
                            className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
                        >
                            <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-amber-900">
                                <Bell size={17} />
                                Needs your attention
                            </h2>
                            <ul className="divide-y divide-amber-100">
                                {attentionItems.map((item) => (
                                    <li key={item.href + item.count}>
                                        <Link
                                            href={item.href}
                                            className="flex items-center gap-3 py-2.5 text-sm font-medium text-amber-900 hover:underline"
                                        >
                                            {item.icon}
                                            <span className="flex-1">
                                                {item.text(item.count)}
                                            </span>
                                            <ChevronRight size={16} />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* Reviews to leave: hidden entirely when empty */}
                    {reviewableCount > 0 && (
                        <section>
                            <SectionHeading
                                title={`You have ${reviewableCount} review${reviewableCount === 1 ? '' : 's'} to leave`}
                                href={reviewableCount > reviewableOrders.length ? '/reviews' : undefined}
                                linkLabel="See all"
                            />
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {reviewableOrders.map((order) => (
                                    <div key={order.id} className={card}>
                                        <div className="flex items-center gap-3">
                                            <Avatar
                                                name={order.seller.name}
                                                url={order.seller.avatar_url}
                                                size={40}
                                            />
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-800">
                                                    How was your experience with{' '}
                                                    {order.seller.name.split(' ')[0]}?
                                                </p>
                                                <p className="truncate text-xs text-slate-500">
                                                    Item: {order.listing.title}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between">
                                            <RatingStars value={0} size={18} />
                                            <Link
                                                href={`/users/${order.seller.id}?order=${order.id}#leave-review`}
                                                className="rounded-lg bg-[#176B4D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#12583F]"
                                            >
                                                Leave Review
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* My listings summary */}
                    {!isNewUser && (
                        <section>
                            <SectionHeading
                                title="My Listings"
                                href="/listings"
                                linkLabel="Manage"
                            />
                            <div className="grid grid-cols-3 gap-3">
                                {(
                                    [
                                        ['available', 'Available'],
                                        ['reserved', 'Reserved'],
                                        ['sold', 'Sold'],
                                    ] as const
                                ).map(([key, label]) => (
                                    <Link
                                        key={key}
                                        href={`/listings?status=${key}`}
                                        className={`${card} text-center transition hover:border-[#C8D8CF] hover:shadow-md`}
                                    >
                                        <p className="text-3xl font-bold text-[#17352A]">
                                            {stats[key]}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {label}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Saved items */}
                    {!isNewUser && (
                        <section>
                            <SectionHeading
                                title="Saved Items"
                                href={savedCount > 0 ? '/favorites' : undefined}
                                linkLabel={`View all saved items (${savedCount})`}
                            />
                            {savedListings.length > 0 ? (
                                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                                    {savedListings.map((listing) => (
                                        <ListingCard
                                            key={listing.id}
                                            listing={listing}
                                            favorited
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className={`${card} flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between`}>
                                    <p className="flex items-center gap-2 text-sm text-slate-500">
                                        <Heart size={17} className="text-slate-300" />
                                        You haven&apos;t saved any listings yet.
                                    </p>
                                    <Link
                                        href="/marketplace"
                                        className="rounded-lg border border-[#176B4D] px-3 py-1.5 text-sm font-semibold text-[#176B4D] hover:bg-[#EAF4EF]"
                                    >
                                        Browse Marketplace
                                    </Link>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Recent messages */}
                    {!isNewUser && (
                        <section>
                            <SectionHeading
                                title="Recent Messages"
                                href="/messages"
                                linkLabel="View all messages"
                            />
                            <div className={card}>
                                {recentConversations.length > 0 ? (
                                    <ul className="divide-y divide-slate-100">
                                        {recentConversations.map((c) => (
                                            <li key={c.id}>
                                                <Link
                                                    href={`/messages/${c.id}`}
                                                    className="flex items-center gap-3 py-3 hover:bg-slate-50"
                                                >
                                                    <Avatar
                                                        name={c.other_user.name}
                                                        url={c.other_user.avatar_url}
                                                        size={40}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="truncate text-sm font-semibold text-slate-800">
                                                                {c.other_user.name}
                                                                {c.listing && (
                                                                    <span className="font-normal text-slate-400">
                                                                        {' '}
                                                                        · {c.listing.title}
                                                                    </span>
                                                                )}
                                                            </p>
                                                            {c.last_message && (
                                                                <span className="shrink-0 text-xs text-slate-400">
                                                                    {timeAgo(c.last_message.created_at)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p
                                                            className={`truncate text-sm ${
                                                                c.unread_count > 0
                                                                    ? 'font-semibold text-slate-800'
                                                                    : 'text-slate-500'
                                                            }`}
                                                        >
                                                            {c.last_message?.from_me && 'You: '}
                                                            {c.last_message?.body}
                                                        </p>
                                                    </div>
                                                    {c.unread_count > 0 && (
                                                        <span
                                                            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#176B4D] px-1.5 text-xs font-bold text-white"
                                                            aria-label={`${c.unread_count} unread`}
                                                        >
                                                            {c.unread_count}
                                                        </span>
                                                    )}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <EmptyNote>No conversations yet.</EmptyNote>
                                )}
                            </div>
                        </section>
                    )}

                    {/* New listings from others */}
                    {recentListings.length > 0 && (
                        <section>
                            <SectionHeading
                                title="New Listings"
                                href="/marketplace"
                                linkLabel="See more"
                            />
                            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                                {recentListings.map((listing) => (
                                    <ListingCard key={listing.id} listing={listing} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Categories with real counts */}
                    {categories.length > 0 && (
                        <section>
                            <SectionHeading title="Categories" />
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {categories.map((c) => (
                                    <Link
                                        key={c.id}
                                        href={`/marketplace?category=${c.id}`}
                                        className={`${card} flex items-center justify-between py-4 transition hover:border-[#C8D8CF] hover:shadow-md`}
                                    >
                                        <span className="font-semibold text-[#17352A]">
                                            {c.name}
                                        </span>
                                        <span className="text-sm text-slate-500">
                                            {c.listings_count}{' '}
                                            {c.listings_count === 1 ? 'listing' : 'listings'}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
