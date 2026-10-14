import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    BadgeCheck,
    CheckCircle2,
    Eye,
    Flag,
    Heart,
    MessageCircle,
    Package,
    PiggyBank,
    Plus,
    ReceiptText,
    ShieldCheck,
    ShoppingBag,
    Star,
    Store,
    TrendingUp,
    Users,
    type LucideIcon,
} from 'lucide-react';
import AppLayout from '../Layouts/AppLayout';
import { BarChart, Sparkline } from '../components/ui/Charts';
import ListingCard, { CardListing } from '../components/ui/ListingCard';
import { Page } from '../components/ui/PageHeader';
import SiteImage from '../components/ui/SiteImage';
import StatusBadge from '../components/ui/StatusBadge';
import Avatar from '../components/ui/Avatar';
import { siteImages } from '../config/siteImages';
import { useLiveReload } from '../lib/live';
import { formatCompactPrice, formatPrice, SharedProps, timeAgo } from '../types/shared';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MemberStats {
    active_listings: number;
    total_listings: number;
    orders_to_confirm: number;
    orders_in_progress: number;
    completed_sales: number;
    earnings: number;
    purchases: number;
    spent: number;
    unread_messages: number;
    saved_items: number;
    listing_saves: number;
    total_views: number;
    rating: number | null;
    reviews: number;
}

interface AttentionItem {
    tone: 'danger' | 'warn' | 'info' | 'gold';
    title: string;
    text: string;
    href: string;
    cta: string;
}

interface MemberProps {
    mode: 'member';
    stats: MemberStats;
    attention: AttentionItem[];
    recentOrders: {
        id: number;
        reference: string;
        status: string;
        role: 'buying' | 'selling';
        total: string;
        quantity: number;
        listing: string | null;
        image: string | null;
        other: string | null;
        created_at: string;
    }[];
    recentConversations: {
        id: number;
        other: string | null;
        listing: string | null;
        image: string | null;
        preview: string;
        unread: number;
        at: string | null;
    }[];
    myListings: (CardListing & { views_count: number; favorites_count: number; hidden_at: string | null })[];
    salesChart: { label: string; total: number }[];
    recommended: CardListing[];
}

interface AdminProps {
    mode: 'admin';
    stats: {
        users: number;
        new_users_7d: number;
        suspended_users: number;
        active_listings: number;
        new_listings_7d: number;
        removed_listings: number;
        orders: number;
        open_orders: number;
        completed_orders: number;
        cancelled_orders: number;
        volume: number;
        pending_reports: number;
        reviewing_reports: number;
        escalated_reports: number;
        transaction_reports: number;
        average_rating: number | null;
    };
    queue: {
        id: number;
        kind: 'transaction' | 'listing' | 'user';
        reason: string;
        status: string;
        target: string;
        order_id: number | null;
        reporter: string | null;
        created_at: string;
    }[];
    activity: Record<'users' | 'listings' | 'orders', { label: string; value: number }[]>;
    recentUsers: { id: number; name: string; email: string; avatar_url: string | null; created_at: string; suspended_at: string | null }[];
    recentRemovals: { id: number; title: string; removed_reason: string | null; hidden_at: string; seller: { name: string } | null }[];
    popularCategories: { id: number; name: string; listings_count: number }[];
}

type Props = MemberProps | AdminProps;

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */

function greeting() {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

function Banner({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle: string;
    children: React.ReactNode;
}) {
    return (
        <section className="relative isolate overflow-hidden rounded-3xl bg-pine-900 text-white shadow-[var(--shadow-lift)]">
            <SiteImage
                name={siteImages.dashboard}
                alt=""
                className="absolute inset-0 -z-10 opacity-35"
                imageClassName="object-[60%_40%]"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-pine-950 via-pine-950/85 to-pine-900/40" />
            <div
                aria-hidden="true"
                className="absolute -right-16 -top-16 -z-10 h-64 w-64 rounded-full bg-sun-400/20 blur-2xl"
            />

            <div className="px-6 py-8 sm:px-10 sm:py-10">
                <h1 className="font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl">
                    {title}
                </h1>
                <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/80">{subtitle}</p>
                <div className="mt-6 flex flex-wrap gap-3">{children}</div>
            </div>
        </section>
    );
}

function Tile({
    icon: Icon,
    label,
    value,
    hint,
    href,
    tone = 'default',
}: {
    icon: LucideIcon;
    label: string;
    value: string | number;
    hint?: string;
    href?: string;
    tone?: 'default' | 'alert' | 'gold';
}) {
    const chip =
        tone === 'alert'
            ? 'bg-red-50 text-red-600'
            : tone === 'gold'
              ? 'bg-sun-300/50 text-sun-800'
              : 'bg-mist-100 text-pine-700';

    const body = (
        <div className="ui-card h-full p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
            <div className="flex items-center justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${chip}`}>
                    <Icon size={20} />
                </span>
                {href && <ArrowRight size={16} className="text-mist-300" />}
            </div>
            <p className="mt-4 font-display text-[1.75rem] font-extrabold leading-none text-pine-950">
                {value}
            </p>
            <p className="mt-1.5 text-sm font-semibold text-ink-2">{label}</p>
            {hint && <p className="mt-0.5 text-xs text-ink-3">{hint}</p>}
        </div>
    );

    return href ? (
        <Link href={href} className="block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pine-700/25 rounded-2xl">
            {body}
        </Link>
    ) : (
        body
    );
}

function Panel({
    title,
    action,
    children,
    className = '',
}: {
    title: string;
    action?: { label: string; href: string };
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={`ui-card p-5 sm:p-6 ${className}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-extrabold text-pine-950">{title}</h2>
                {action && (
                    <Link
                        href={action.href}
                        className="inline-flex items-center gap-1 text-[13px] font-bold text-pine-700 hover:text-pine-900"
                    >
                        {action.label}
                        <ArrowRight size={14} />
                    </Link>
                )}
            </div>
            {children}
        </section>
    );
}

const toneStyles: Record<AttentionItem['tone'], { box: string; icon: string; Icon: LucideIcon }> = {
    danger: { box: 'border-red-200 bg-red-50/70', icon: 'bg-red-100 text-red-600', Icon: AlertTriangle },
    warn: { box: 'border-sun-400/50 bg-sun-300/25', icon: 'bg-sun-300/70 text-sun-800', Icon: ReceiptText },
    gold: { box: 'border-sun-400/50 bg-sun-300/25', icon: 'bg-sun-300/70 text-sun-800', Icon: Star },
    info: { box: 'border-mist-300 bg-white', icon: 'bg-mist-100 text-pine-700', Icon: MessageCircle },
};

/* ------------------------------------------------------------------ */
/*  Member dashboard                                                   */
/* ------------------------------------------------------------------ */

function MemberDashboard({ data, name }: { data: MemberProps; name: string }) {
    const { stats } = data;

    return (
        <>
            <Banner
                title={`${greeting()}, ${name.split(' ')[0]}`}
                subtitle="Here is what is happening with your listings, orders and messages today."
            >
                <Link href="/listings/create" className="ui-btn ui-btn-gold ui-btn-lg">
                    <Plus size={18} strokeWidth={2.6} />
                    Sell something
                </Link>
                <Link
                    href="/marketplace"
                    className="ui-btn ui-btn-lg border-2 border-white/35 text-white hover:bg-white/10"
                >
                    <Store size={18} />
                    Browse marketplace
                </Link>
            </Banner>

            {/* Needs attention */}
            <section className="mt-6" aria-labelledby="attention-title">
                <h2 id="attention-title" className="mb-3 font-display text-lg font-extrabold text-pine-950">
                    Needs your attention
                </h2>

                {data.attention.length > 0 ? (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
                        {data.attention.map((item) => {
                            const style = toneStyles[item.tone];

                            return (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    className={`group flex items-start gap-3.5 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] ${style.box}`}
                                >
                                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.icon}`}>
                                        <style.Icon size={19} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-bold leading-snug text-ink">{item.title}</span>
                                        <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">{item.text}</span>
                                        <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-pine-700 group-hover:text-pine-900">
                                            {item.cta} <ArrowRight size={13} />
                                        </span>
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex items-center gap-3 rounded-2xl border border-mist-200 bg-white p-5 text-sm text-ink-2">
                        <CheckCircle2 className="text-pine-600" size={22} />
                        You are all caught up. Nothing is waiting on you right now.
                    </div>
                )}
            </section>

            {/* Key numbers */}
            <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Key numbers">
                <Tile
                    icon={Package}
                    label="Active listings"
                    value={stats.active_listings}
                    hint={`${stats.total_listings} in total`}
                    href="/listings"
                />
                <Tile
                    icon={ReceiptText}
                    label="Orders in progress"
                    value={stats.orders_to_confirm + stats.orders_in_progress}
                    hint={stats.orders_to_confirm > 0 ? `${stats.orders_to_confirm} need your confirmation` : 'Nothing waiting on you'}
                    href="/orders"
                    tone={stats.orders_to_confirm > 0 ? 'gold' : 'default'}
                />
                <Tile
                    icon={PiggyBank}
                    label="Total earned"
                    value={formatCompactPrice(stats.earnings)}
                    hint={`${stats.completed_sales} completed sale${stats.completed_sales === 1 ? '' : 's'}`}
                />
                <Tile
                    icon={Star}
                    label="Seller rating"
                    value={stats.rating ? stats.rating.toFixed(1) : '—'}
                    hint={stats.reviews ? `${stats.reviews} review${stats.reviews === 1 ? '' : 's'}` : 'No reviews yet'}
                    href="/reviews"
                />
                <Tile
                    icon={MessageCircle}
                    label="Unread messages"
                    value={stats.unread_messages}
                    href="/messages"
                    tone={stats.unread_messages > 0 ? 'gold' : 'default'}
                />
                <Tile icon={ShoppingBag} label="Purchases" value={stats.purchases} hint={`${formatCompactPrice(stats.spent)} spent`} href="/orders" />
                <Tile icon={Heart} label="Saved items" value={stats.saved_items} href="/favorites" />
                <Tile
                    icon={Eye}
                    label="Views on your listings"
                    value={stats.total_views}
                    hint={`${stats.listing_saves} save${stats.listing_saves === 1 ? '' : 's'}`}
                />
            </section>

            {/* Sales + orders */}
            <div className="mt-6 grid gap-6 xl:grid-cols-5">
                <Panel title="Sales, last 6 months" className="xl:col-span-2">
                    {data.salesChart.some((m) => m.total > 0) ? (
                        <BarChart
                            data={data.salesChart.map((m) => ({ label: m.label, value: m.total }))}
                            format={(v) => formatPrice(v)}
                            summary="Monthly earnings from completed sales over the last six months"
                        />
                    ) : (
                        <div className="flex h-[170px] flex-col items-center justify-center rounded-xl bg-mist-50 text-center">
                            <TrendingUp className="text-mist-300" size={30} />
                            <p className="mt-2 max-w-[16rem] text-sm text-ink-2">
                                Your completed sales will chart here.
                            </p>
                        </div>
                    )}
                </Panel>

                <Panel title="Recent orders" action={{ label: 'All orders', href: '/orders' }} className="xl:col-span-3">
                    {data.recentOrders.length > 0 ? (
                        <ul className="divide-y divide-mist-100">
                            {data.recentOrders.map((order) => (
                                <li key={order.id}>
                                    <Link
                                        href="/orders"
                                        className="-mx-2 flex items-center gap-3.5 rounded-xl px-2 py-3 transition hover:bg-mist-50"
                                    >
                                        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-mist-100">
                                            {order.image ? (
                                                <img src={`/storage/${order.image}`} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <Package className="m-3 text-mist-300" size={24} />
                                            )}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-bold text-ink">{order.listing ?? 'Deleted listing'}</span>
                                            <span className="block truncate text-xs text-ink-3">
                                                {order.role === 'selling' ? 'Sold to' : 'Bought from'} {order.other ?? 'someone'} ·{' '}
                                                {timeAgo(order.created_at)}
                                            </span>
                                        </span>
                                        <span className="text-right">
                                            <span className="block text-sm font-extrabold text-pine-900">{formatPrice(order.total)}</span>
                                            <StatusBadge status={order.status} />
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="rounded-xl bg-mist-50 px-4 py-10 text-center text-sm text-ink-2">
                            No orders yet. They will show up here as soon as you buy or sell something.
                        </p>
                    )}
                </Panel>
            </div>

            {/* Messages + listings */}
            <div className="mt-6 grid gap-6 xl:grid-cols-5">
                <Panel title="Recent conversations" action={{ label: 'Open inbox', href: '/messages' }} className="xl:col-span-2">
                    {data.recentConversations.length > 0 ? (
                        <ul className="divide-y divide-mist-100">
                            {data.recentConversations.map((c) => (
                                <li key={c.id}>
                                    <Link
                                        href={`/messages/${c.id}`}
                                        className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-mist-50"
                                    >
                                        <Avatar name={c.other ?? '?'} size={40} />
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="truncate text-sm font-bold text-ink">{c.other}</span>
                                                <span className="shrink-0 text-[11px] text-ink-3">{timeAgo(c.at)}</span>
                                            </span>
                                            <span className={`block truncate text-[13px] ${c.unread ? 'font-semibold text-ink' : 'text-ink-2'}`}>
                                                {c.preview || c.listing}
                                            </span>
                                        </span>
                                        {c.unread > 0 && (
                                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sun-500 px-1.5 text-[11px] font-extrabold text-pine-950">
                                                {c.unread}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="rounded-xl bg-mist-50 px-4 py-10 text-center text-sm text-ink-2">
                            No conversations yet. Message a seller from any listing.
                        </p>
                    )}
                </Panel>

                <Panel title="Your listings" action={{ label: 'Manage', href: '/listings' }} className="xl:col-span-3">
                    {data.myListings.length > 0 ? (
                        <ul className="grid gap-3 sm:grid-cols-2">
                            {data.myListings.map((l) => (
                                <li key={l.id}>
                                    <Link
                                        href={`/listings/${l.id}`}
                                        className="flex items-center gap-3 rounded-xl border border-mist-200 p-3 transition hover:border-pine-700 hover:bg-mist-50"
                                    >
                                        <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-mist-100">
                                            {l.images[0] ? (
                                                <img src={`/storage/${l.images[0].path}`} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <Package className="m-3.5 text-mist-300" size={28} />
                                            )}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-bold text-ink">{l.title}</span>
                                            <span className="flex items-center gap-2.5 text-xs text-ink-3">
                                                <span className="inline-flex items-center gap-1"><Eye size={12} />{l.views_count}</span>
                                                <span className="inline-flex items-center gap-1"><Heart size={12} />{l.favorites_count}</span>
                                                <span>{l.quantity} left</span>
                                            </span>
                                            <span className="mt-1 block">
                                                <StatusBadge status={l.hidden_at ? 'removed' : l.status} />
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="rounded-xl bg-mist-50 px-4 py-10 text-center">
                            <p className="text-sm text-ink-2">You have not listed anything yet.</p>
                            <Link href="/listings/create" className="ui-btn ui-btn-primary ui-btn-sm mt-4">
                                Create your first listing
                            </Link>
                        </div>
                    )}
                </Panel>
            </div>

            {/* Recommendations */}
            {data.recommended.length > 0 && (
                <section className="mt-8">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="font-display text-xl font-extrabold text-pine-950">Picked for you</h2>
                        <Link href="/marketplace" className="inline-flex items-center gap-1 text-sm font-bold text-pine-700 hover:text-pine-900">
                            See more <ArrowRight size={14} />
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                        {data.recommended.slice(0, 4).map((listing) => (
                            <ListingCard key={listing.id} listing={listing} />
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  Admin dashboard                                                    */
/* ------------------------------------------------------------------ */

const kindIcon = { transaction: ReceiptText, listing: Package, user: Users } as const;

function AdminDashboard({ data, name }: { data: AdminProps; name: string }) {
    const { stats } = data;
    const open = stats.pending_reports + stats.reviewing_reports;
    const maxCat = Math.max(1, ...data.popularCategories.map((c) => c.listings_count));

    return (
        <>
            <Banner
                title={`${greeting()}, ${name}`}
                subtitle={
                    open > 0
                        ? `${open} report${open === 1 ? '' : 's'} need${open === 1 ? 's' : ''} a decision. Here is the state of the marketplace.`
                        : 'The moderation queue is clear. Here is the state of the marketplace.'
                }
            >
                <Link href="/admin/reports" className="ui-btn ui-btn-gold ui-btn-lg">
                    <Flag size={18} />
                    Review reports
                    {open > 0 && (
                        <span className="rounded-full bg-pine-950 px-2 py-0.5 text-xs text-sun-300">{open}</span>
                    )}
                </Link>
                <Link href="/admin/orders" className="ui-btn ui-btn-lg border-2 border-white/35 text-white hover:bg-white/10">
                    <ReceiptText size={18} />
                    Transactions
                </Link>
            </Banner>

            <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Key numbers">
                <Tile
                    icon={Flag}
                    label="Open reports"
                    value={open}
                    hint={`${stats.escalated_reports} escalated · ${stats.transaction_reports} about transactions`}
                    href="/admin/reports"
                    tone={open > 0 ? 'alert' : 'default'}
                />
                <Tile
                    icon={Users}
                    label="Students"
                    value={stats.users}
                    hint={`+${stats.new_users_7d} this week · ${stats.suspended_users} suspended`}
                    href="/admin/users"
                />
                <Tile
                    icon={Package}
                    label="Active listings"
                    value={stats.active_listings}
                    hint={`+${stats.new_listings_7d} this week · ${stats.removed_listings} removed`}
                    href="/admin/listings"
                />
                <Tile
                    icon={BadgeCheck}
                    label="Completed trades"
                    value={stats.completed_orders}
                    hint={`${formatCompactPrice(stats.volume)} traded`}
                    href="/admin/orders"
                />
            </section>

            <div className="mt-6 grid gap-6 xl:grid-cols-5">
                <Panel title="Moderation queue" action={{ label: 'Open all reports', href: '/admin/reports' }} className="xl:col-span-3">
                    {data.queue.length > 0 ? (
                        <ul className="divide-y divide-mist-100">
                            {data.queue.map((r) => {
                                const Icon = kindIcon[r.kind];

                                return (
                                    <li key={r.id} className="flex items-center gap-3.5 py-3.5">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mist-100 text-pine-700">
                                            <Icon size={19} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-bold text-ink">{r.target}</span>
                                            <span className="block truncate text-xs text-ink-3">
                                                {r.reason} · by {r.reporter ?? 'unknown'} · {timeAgo(r.created_at)}
                                            </span>
                                        </span>
                                        <StatusBadge status={r.status} />
                                        <Link
                                            href={`/admin/reports?status=${r.status}`}
                                            className="ui-btn ui-btn-outline ui-btn-sm"
                                        >
                                            Review
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center rounded-xl bg-mist-50 px-4 py-12 text-center">
                            <ShieldCheck className="text-pine-600" size={34} />
                            <p className="mt-2 font-bold text-ink">All clear</p>
                            <p className="text-sm text-ink-2">There are no open reports.</p>
                        </div>
                    )}
                </Panel>

                <div className="space-y-6 xl:col-span-2">
                    {(
                        [
                            ['users', 'New students', 'Registrations in the last 14 days'],
                            ['listings', 'New listings', 'Listings created in the last 14 days'],
                            ['orders', 'Orders placed', 'Orders placed in the last 14 days'],
                        ] as const
                    ).map(([key, title, summary]) => {
                        const total = data.activity[key].reduce((n, d) => n + d.value, 0);

                        return (
                            <section key={key} className="ui-card p-5">
                                <div className="flex items-baseline justify-between">
                                    <h2 className="text-sm font-bold text-ink-2">{title}</h2>
                                    <p className="font-display text-2xl font-extrabold text-pine-950">{total}</p>
                                </div>
                                <Sparkline data={data.activity[key]} summary={summary} />
                                <p className="text-[11px] text-ink-3">Last 14 days</p>
                            </section>
                        );
                    })}
                </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <Panel title="Newest students" action={{ label: 'All users', href: '/admin/users' }}>
                    <ul className="space-y-3">
                        {data.recentUsers.map((u) => (
                            <li key={u.id} className="flex items-center gap-3">
                                <Avatar name={u.name} url={u.avatar_url} size={38} />
                                <span className="min-w-0 flex-1">
                                    <Link href={`/users/${u.id}`} className="block truncate text-sm font-bold text-ink hover:text-pine-700">
                                        {u.name}
                                    </Link>
                                    <span className="block truncate text-xs text-ink-3">{timeAgo(u.created_at)}</span>
                                </span>
                                {u.suspended_at && <StatusBadge status="suspended" />}
                            </li>
                        ))}
                    </ul>
                </Panel>

                <Panel title="Recently removed listings" action={{ label: 'Listings', href: '/admin/listings?visibility=removed' }}>
                    {data.recentRemovals.length > 0 ? (
                        <ul className="space-y-3">
                            {data.recentRemovals.map((l) => (
                                <li key={l.id}>
                                    <p className="truncate text-sm font-bold text-ink">{l.title}</p>
                                    <p className="truncate text-xs text-ink-3">
                                        {l.seller?.name} · {l.removed_reason ?? 'no reason'} · {timeAgo(l.hidden_at)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-ink-2">Nothing has been removed.</p>
                    )}
                </Panel>

                <Panel title="Popular categories">
                    <ul className="space-y-3.5">
                        {data.popularCategories.map((c) => (
                            <li key={c.id}>
                                <div className="mb-1 flex justify-between text-sm">
                                    <span className="font-semibold text-ink">{c.name}</span>
                                    <span className="text-ink-3">{c.listings_count}</span>
                                </div>
                                <div className="h-2 rounded-full bg-mist-100">
                                    <div
                                        className="h-2 rounded-full bg-pine-700"
                                        style={{ width: `${(c.listings_count / maxCat) * 100}%` }}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                </Panel>
            </div>
        </>
    );
}

/* ------------------------------------------------------------------ */

export default function Dashboard(props: Props) {
    const { auth } = usePage<SharedProps>().props;
    const name = auth.user?.name ?? 'there';

    // Quietly keep the numbers fresh without a visible reload.
    useLiveReload(
        props.mode === 'admin'
            ? ['stats', 'queue', 'activity', 'recentUsers', 'recentRemovals']
            : ['stats', 'attention', 'recentOrders', 'recentConversations'],
        20000,
    );

    return (
        <AppLayout>
            <Head title="Dashboard" />

            <Page>
                {props.mode === 'admin' ? (
                    <AdminDashboard data={props} name={name} />
                ) : (
                    <MemberDashboard data={props} name={name} />
                )}
            </Page>
        </AppLayout>
    );
}
