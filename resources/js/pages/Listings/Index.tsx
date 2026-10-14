import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, Eye, Heart, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader, { Page } from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import { RatingBadge } from '../../components/ui/Stars';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatPrice, Paginated, timeAgo } from '../../types/shared';

interface Row {
    id: number;
    title: string;
    price: string;
    quantity: number;
    type: 'item' | 'service';
    status: 'available' | 'reserved' | 'sold';
    views_count: number;
    created_at: string;
    hidden_at: string | null;
    removed_reason_label: string | null;
    removed_note: string | null;
    favorites_count: number;
    open_orders_count: number;
    rating_avg: number | string | null;
    rating_count: number;
    category: { name: string };
    images: { id: number; path: string }[];
}

export default function Index({ listings }: { listings: Paginated<Row> }) {
    const [deleting, setDeleting] = useState<Row | null>(null);
    const [busy, setBusy] = useState(false);

    const remove = () => {
        if (!deleting) return;

        router.delete(`/listings/${deleting.id}`, {
            preserveScroll: true,
            onStart: () => setBusy(true),
            onFinish: () => {
                setBusy(false);
                setDeleting(null);
            },
        });
    };

    return (
        <AppLayout>
            <Head title="My listings" />

            <Page>
                <PageHeader
                    icon={Package}
                    title="My listings"
                    subtitle={`${listings.total} listing${listings.total === 1 ? '' : 's'}`}
                    actions={
                        <Link href="/listings/create" className="ui-btn ui-btn-gold">
                            <Plus size={17} strokeWidth={2.6} />
                            New listing
                        </Link>
                    }
                />

                {listings.data.length > 0 ? (
                    <ul className="space-y-4">
                        {listings.data.map((l) => (
                            <li key={l.id} className="ui-card overflow-hidden">
                                {l.hidden_at && (
                                    <div className="flex items-start gap-3 border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-900">
                                        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
                                        <p>
                                            <strong>Removed by a moderator:</strong>{' '}
                                            {l.removed_reason_label ?? 'no reason recorded'}
                                            {l.removed_note && <> — {l.removed_note}</>}
                                        </p>
                                    </div>
                                )}

                                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                                    <Link
                                        href={`/listings/${l.id}`}
                                        className="h-28 w-full shrink-0 overflow-hidden rounded-xl bg-mist-100 sm:h-24 sm:w-32"
                                    >
                                        {l.images[0] ? (
                                            <img
                                                src={`/storage/${l.images[0].path}`}
                                                alt=""
                                                className={`h-full w-full object-cover ${l.hidden_at ? 'grayscale' : ''}`}
                                            />
                                        ) : (
                                            <span className="flex h-full items-center justify-center text-mist-300">
                                                <Package size={32} />
                                            </span>
                                        )}
                                    </Link>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <StatusBadge status={l.hidden_at ? 'removed' : l.status} />
                                            <span className="text-xs text-ink-3">
                                                {l.category.name} · listed {timeAgo(l.created_at)}
                                            </span>
                                        </div>
                                        <Link
                                            href={`/listings/${l.id}`}
                                            className="mt-1 block truncate font-display text-lg font-extrabold text-pine-950 hover:text-pine-700"
                                        >
                                            {l.title}
                                        </Link>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-ink-2">
                                            <span className="font-extrabold text-pine-900">{formatPrice(l.price)}</span>
                                            <span><strong>{l.quantity}</strong> in stock</span>
                                            <span className="inline-flex items-center gap-1"><Eye size={14} />{l.views_count}</span>
                                            <span className="inline-flex items-center gap-1"><Heart size={14} />{l.favorites_count}</span>
                                            <RatingBadge average={l.rating_avg} count={l.rating_count} emptyLabel="No reviews" />
                                            {l.open_orders_count > 0 && (
                                                <Link href="/orders" className="font-bold text-sun-800 underline decoration-sun-500 underline-offset-4">
                                                    {l.open_orders_count} open order{l.open_orders_count === 1 ? '' : 's'}
                                                </Link>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 gap-2">
                                        <Link href={`/listings/${l.id}/edit`} className="ui-btn ui-btn-outline ui-btn-sm">
                                            <Pencil size={14} /> Edit
                                        </Link>
                                        <button type="button" onClick={() => setDeleting(l)} className="ui-btn ui-btn-danger-outline ui-btn-sm">
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyState
                        icon={Package}
                        title="You have not listed anything yet"
                        text="Got textbooks, a uniform or a skill other students need? List it in a couple of minutes."
                        action={{ label: 'Create your first listing', href: '/listings/create' }}
                    />
                )}

                <Pagination links={listings.links} />
            </Page>

            {deleting && (
                <ConfirmDialog
                    title="Delete this listing?"
                    message={`“${deleting.title}” and its photos will be permanently removed. Listings with open orders cannot be deleted.`}
                    confirmLabel="Delete listing"
                    processing={busy}
                    onConfirm={remove}
                    onClose={() => setDeleting(null)}
                />
            )}
        </AppLayout>
    );
}
