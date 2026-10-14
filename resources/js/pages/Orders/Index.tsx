import { Head, Link, router } from '@inertiajs/react';
import {
    Check,
    CircleDot,
    Flag,
    MessageCircle,
    Package,
    ReceiptText,
    ShoppingBag,
    Star,
    Store,
    X,
} from 'lucide-react';
import { useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import Avatar from '../../components/ui/Avatar';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader, { Page } from '../../components/ui/PageHeader';
import ReviewModal from '../../components/ui/ReviewModal';
import StatusBadge from '../../components/ui/StatusBadge';
import { useLiveReload } from '../../lib/live';
import { formatDateTime, formatPrice, timeAgo } from '../../types/shared';

interface Person {
    id: number;
    name: string;
    avatar_url: string | null;
}

interface Order {
    id: number;
    reference: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    quantity: number;
    price: string;
    total: string;
    created_at: string;
    confirmed_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
    cancelled_by: number | null;
    cancel_reason: string | null;
    listing: { id: number; title: string; images: { id: number; path: string }[]; category: { name: string } };
    seller?: Person;
    buyer?: Person;
    review?: { id: number; rating: number; product_rating: number | null } | null;
}

interface Props {
    buyingOrders: Order[];
    sellingOrders: Order[];
}

type DialogState =
    | { kind: 'cancel'; order: Order; selling: boolean }
    | { kind: 'complete'; order: Order; selling: boolean }
    | null;

function Steps({ order }: { order: Order }) {
    const cancelled = order.status === 'cancelled';

    const steps = [
        { label: 'Placed', at: order.created_at, done: true },
        { label: 'Confirmed', at: order.confirmed_at, done: Boolean(order.confirmed_at) },
        cancelled
            ? { label: 'Cancelled', at: order.cancelled_at, done: true, bad: true }
            : { label: 'Completed', at: order.completed_at, done: Boolean(order.completed_at) },
    ];

    return (
        <ol className="flex items-start" aria-label="Order progress">
            {steps.map((step, i) => (
                <li key={step.label} className="relative flex flex-1 flex-col items-center text-center">
                    {i > 0 && (
                        <span
                            aria-hidden="true"
                            className={`absolute right-1/2 top-[11px] h-0.5 w-full ${
                                step.done ? ('bad' in step && step.bad ? 'bg-red-300' : 'bg-pine-600') : 'bg-mist-200'
                            }`}
                        />
                    )}
                    <span
                        className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-white ${
                            step.done ? ('bad' in step && step.bad ? 'bg-red-500' : 'bg-pine-700') : 'bg-mist-200'
                        }`}
                    >
                        {step.done ? (
                            'bad' in step && step.bad ? <X size={13} strokeWidth={3} /> : <Check size={13} strokeWidth={3} />
                        ) : (
                            <CircleDot size={12} className="text-white" />
                        )}
                    </span>
                    <span className={`mt-1.5 text-[11px] font-bold ${step.done ? 'text-ink' : 'text-ink-3'}`}>
                        {step.label}
                    </span>
                    <span className="text-[10px] text-ink-3">{step.at ? timeAgo(step.at) : '—'}</span>
                </li>
            ))}
        </ol>
    );
}

export default function Index({ buyingOrders, sellingOrders }: Props) {
    const [tab, setTab] = useState<'buying' | 'selling'>(
        sellingOrders.some((o) => o.status === 'pending') ? 'selling' : 'buying',
    );
    const [dialog, setDialog] = useState<DialogState>(null);
    const [reviewing, setReviewing] = useState<Order | null>(null);
    const [busy, setBusy] = useState(false);

    // Order status changes from the other person show up on their own.
    useLiveReload(['buyingOrders', 'sellingOrders'], 8000);

    const orders = tab === 'buying' ? buyingOrders : sellingOrders;
    const selling = tab === 'selling';
    const pendingToConfirm = sellingOrders.filter((o) => o.status === 'pending').length;

    const act = (path: string, data: Record<string, string> = {}) =>
        router.post(path, data, {
            preserveScroll: true,
            onStart: () => setBusy(true),
            onFinish: () => {
                setBusy(false);
                setDialog(null);
            },
        });

    return (
        <AppLayout>
            <Head title="My orders" />

            <Page>
                <PageHeader
                    icon={ShoppingBag}
                    title="My orders"
                    subtitle="Track what you are buying and selling"
                />

                <div className="mb-6 inline-flex gap-1.5 rounded-2xl bg-white p-1.5 ring-1 ring-mist-200" role="tablist">
                    {(
                        [
                            ['buying', 'Buying', buyingOrders.length, ShoppingBag],
                            ['selling', 'Selling', sellingOrders.length, Store],
                        ] as const
                    ).map(([value, label, count, Icon]) => (
                        <button
                            key={value}
                            type="button"
                            role="tab"
                            aria-selected={tab === value}
                            onClick={() => setTab(value)}
                            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                                tab === value ? 'bg-pine-800 text-white' : 'text-ink-2 hover:bg-mist-100'
                            }`}
                        >
                            <Icon size={16} />
                            {label}
                            <span
                                className={`rounded-full px-2 py-0.5 text-[11px] ${
                                    tab === value ? 'bg-white/20' : 'bg-mist-100 text-ink-2'
                                }`}
                            >
                                {count}
                            </span>
                            {value === 'selling' && pendingToConfirm > 0 && (
                                <span className="h-2.5 w-2.5 rounded-full bg-sun-400 ring-2 ring-white" title="Orders to confirm" />
                            )}
                        </button>
                    ))}
                </div>

                {orders.length === 0 ? (
                    <EmptyState
                        icon={selling ? Store : ShoppingBag}
                        title={selling ? 'No sales yet' : 'No purchases yet'}
                        text={
                            selling
                                ? 'When someone orders one of your listings it will appear here for you to confirm.'
                                : 'Find something you like and tap “Order now”. The seller will confirm it.'
                        }
                        action={
                            selling
                                ? { label: 'Create a listing', href: '/listings/create' }
                                : { label: 'Browse the marketplace', href: '/marketplace' }
                        }
                    />
                ) : (
                    <ul className="space-y-4">
                        {orders.map((order) => {
                            const other = selling ? order.buyer : order.seller;
                            const open = order.status === 'pending' || order.status === 'confirmed';

                            return (
                                <li key={order.id} className="ui-card overflow-hidden">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mist-100 bg-mist-50 px-5 py-3">
                                        <div className="flex items-center gap-3 text-[13px] text-ink-2">
                                            <span className="font-extrabold text-ink">{order.reference}</span>
                                            <span>Placed {formatDateTime(order.created_at)}</span>
                                        </div>
                                        <StatusBadge status={order.status} />
                                    </div>

                                    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                                        <div className="flex gap-4">
                                            <Link
                                                href={`/listings/${order.listing.id}`}
                                                className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-mist-100"
                                            >
                                                {order.listing.images[0] ? (
                                                    <img
                                                        src={`/storage/${order.listing.images[0].path}`}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="flex h-full items-center justify-center text-mist-300">
                                                        <Package size={30} />
                                                    </span>
                                                )}
                                            </Link>

                                            <div className="min-w-0 flex-1">
                                                <Link
                                                    href={`/listings/${order.listing.id}`}
                                                    className="block truncate font-display text-lg font-extrabold text-pine-950 hover:text-pine-700"
                                                >
                                                    {order.listing.title}
                                                </Link>
                                                <p className="mt-0.5 text-sm text-ink-2">
                                                    {order.quantity} × {formatPrice(order.price)}
                                                </p>
                                                <p className="font-display text-xl font-extrabold text-pine-900">
                                                    {formatPrice(order.total)}
                                                </p>
                                                {other && (
                                                    <Link
                                                        href={`/users/${other.id}`}
                                                        className="mt-2 inline-flex items-center gap-2 text-[13px] font-semibold text-ink-2 hover:text-pine-700"
                                                    >
                                                        <Avatar name={other.name} url={other.avatar_url} size={24} />
                                                        {selling ? 'Buyer' : 'Seller'}: {other.name}
                                                    </Link>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl bg-mist-50 p-4 ring-1 ring-mist-200">
                                            <Steps order={order} />
                                            {order.status === 'cancelled' && order.cancel_reason && (
                                                <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-ink-2 ring-1 ring-mist-200">
                                                    <strong className="text-ink">Reason:</strong> {order.cancel_reason}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 border-t border-mist-100 px-5 py-3.5">
                                        {selling && order.status === 'pending' && (
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => act(`/orders/${order.id}/confirm`)}
                                                className="ui-btn ui-btn-primary ui-btn-sm"
                                            >
                                                <Check size={15} strokeWidth={3} /> Confirm order
                                            </button>
                                        )}

                                        {order.status === 'confirmed' && (
                                            <button
                                                type="button"
                                                onClick={() => setDialog({ kind: 'complete', order, selling })}
                                                className="ui-btn ui-btn-primary ui-btn-sm"
                                            >
                                                <Check size={15} strokeWidth={3} />
                                                {selling ? 'Mark as handed over' : 'Mark as received'}
                                            </button>
                                        )}

                                        {!selling && order.status === 'completed' &&
                                            (order.review ? (
                                                <span className="ui-chip bg-sun-300/45 text-sun-800">
                                                    <Star size={13} className="fill-sun-500 text-sun-500" />
                                                    You rated {order.review.product_rating ?? order.review.rating}/5
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setReviewing(order)}
                                                    className="ui-btn ui-btn-gold ui-btn-sm"
                                                >
                                                    <Star size={15} /> Leave a review
                                                </button>
                                            ))}

                                        {open && (
                                            <button
                                                type="button"
                                                onClick={() => setDialog({ kind: 'cancel', order, selling })}
                                                className="ui-btn ui-btn-danger-outline ui-btn-sm"
                                            >
                                                {selling && order.status === 'pending' ? 'Decline' : 'Cancel order'}
                                            </button>
                                        )}

                                        <div className="ml-auto flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => router.post(`/orders/${order.id}/message`)}
                                                className="ui-btn ui-btn-outline ui-btn-sm"
                                            >
                                                <MessageCircle size={15} /> Message
                                            </button>
                                            <Link
                                                href={`/orders/${order.id}/report`}
                                                className="ui-btn ui-btn-ghost ui-btn-sm"
                                                title="Compile this transaction and report a problem"
                                            >
                                                <Flag size={15} /> Report transaction
                                            </Link>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-ink-3">
                    <ReceiptText size={14} className="mt-0.5 shrink-0" />
                    There is no online payment. Pay and hand over in person on campus. If something goes wrong, use
                    “Report transaction” to compile the chat and details for the marketplace admins.
                </p>
            </Page>

            {dialog?.kind === 'cancel' && (
                <ConfirmDialog
                    title={dialog.selling && dialog.order.status === 'pending' ? 'Decline this order?' : 'Cancel this order?'}
                    message="The item becomes available again for other buyers. The other person will see that the order was cancelled."
                    confirmLabel={dialog.selling && dialog.order.status === 'pending' ? 'Decline order' : 'Cancel order'}
                    askReason="Why are you cancelling?"
                    processing={busy}
                    onConfirm={(reason) => act(`/orders/${dialog.order.id}/cancel`, { reason })}
                    onClose={() => setDialog(null)}
                />
            )}

            {dialog?.kind === 'complete' && (
                <ConfirmDialog
                    tone="primary"
                    title="Complete this order?"
                    message={
                        dialog.selling
                            ? 'Only continue once the buyer has the item (or the service is done) and you have been paid. This cannot be undone.'
                            : 'Only continue once you have received the item (or the service is done). This cannot be undone and lets you review the seller.'
                    }
                    confirmLabel="Yes, it is done"
                    processing={busy}
                    onConfirm={() => act(`/orders/${dialog.order.id}/complete`)}
                    onClose={() => setDialog(null)}
                />
            )}

            {reviewing && reviewing.seller && (
                <ReviewModal
                    orderId={reviewing.id}
                    sellerName={reviewing.seller.name}
                    listingTitle={reviewing.listing.title}
                    onClose={() => setReviewing(null)}
                />
            )}
        </AppLayout>
    );
}
