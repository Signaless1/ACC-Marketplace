import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    Check,
    CheckCircle2,
    FileText,
    Flag,
    CircleUserRound,
    Clock3,
    MessageCircle,
    Package,
    ShoppingBag,
    Star,
    Store,
    X,
} from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import ReviewModal from '../../components/ui/ReviewModal';
import ReportModal from '../../components/ui/ReportModal';
import { Link } from '@inertiajs/react';

interface UserData {
    id: number;
    name: string;
}

interface Category {
    id: number;
    name: string;
}

interface ListingImage {
    id: number;
    path: string;
    sort_order: number;
}

interface Listing {
    id: number;
    title: string;
    price: number;
    type: 'item' | 'service';
    status: 'available' | 'reserved' | 'sold';
    category: Category;
    images: ListingImage[];
}

interface Order {
    id: number;
    price: string | number;
    quantity: number;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    created_at: string;
    listing: Listing;
    buyer?: UserData;
    seller?: UserData;
    review?: { id: number; rating: number } | null;
    reports?: { id: number; status: string }[];
}

interface Props {
    buyingOrders: Order[];
    sellingOrders: Order[];
    transactionReasons: Record<string, string>;
}

export default function Index({
    buyingOrders,
    sellingOrders,
    transactionReasons,
}: Props) {
    const [reporting, setReporting] = useState<Order | null>(null);
    const formatPrice = (price: string | number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(Number(price));
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getStatusStyles = (status: Order['status']) => {
        switch (status) {
            case 'pending':
                return {
                    label: 'Pending',
                    className:
                        'bg-amber-50 text-amber-700 border-amber-200',
                    icon: Clock3,
                };

            case 'confirmed':
                return {
                    label: 'Confirmed',
                    className:
                        'bg-blue-50 text-blue-700 border-blue-200',
                    icon: Check,
                };

            case 'completed':
                return {
                    label: 'Completed',
                    className:
                        'bg-emerald-50 text-emerald-700 border-emerald-200',
                    icon: CheckCircle2,
                };

            case 'cancelled':
                return {
                    label: 'Cancelled',
                    className:
                        'bg-red-50 text-red-700 border-red-200',
                    icon: X,
                };
        }
    };

    const cancelOrder = (orderId: number) => {
        if (
            !window.confirm(
                'Are you sure you want to cancel this order?',
            )
        ) {
            return;
        }

        router.post(`/orders/${orderId}/cancel`);
    };

    const confirmOrder = (orderId: number) => {
        if (
            !window.confirm(
                'Are you sure you want to confirm this order?',
            )
        ) {
            return;
        }

        router.post(`/orders/${orderId}/confirm`);
    };

    const completeOrder = (orderId: number) => {
        if (
            !window.confirm(
                'Mark this order as completed?',
            )
        ) {
            return;
        }

        router.post(`/orders/${orderId}/complete`);
    };

    const [reviewing, setReviewing] = useState<Order | null>(null);

    const messageUser = (orderId: number) => {
        router.post(`/orders/${orderId}/message`);
    };

    const OrderCard = ({
        order,
        selling,
    }: {
        order: Order;
        selling: boolean;
    }) => {
        const status = getStatusStyles(order.status);
        const StatusIcon = status.icon;

        const otherUser = selling
            ? order.buyer
            : order.seller;

        const image = order.listing.images?.[0];

        return (
            <div className="rounded-2xl border border-[#E1E9E4] bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex flex-col gap-5 sm:flex-row">
                    <div className="h-28 w-full shrink-0 overflow-hidden rounded-xl bg-[#F1F5F2] sm:h-28 sm:w-28">
                        {image ? (
                            <img
                                src={`/storage/${image.path}`}
                                alt={order.listing.title}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-300">
                                <Package size={30} />
                            </div>
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <h3 className="truncate text-base font-bold text-slate-900">
                                    {order.listing.title}
                                </h3>

                                <p className="mt-1 text-xs text-slate-500">
                                    Order #{order.id}
                                </p>
                            </div>

                            <span
                                className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.className}`}
                            >
                                <StatusIcon size={13} />
                                {status.label}
                            </span>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                            <span className="font-medium text-slate-700">
                                {formatPrice(order.price)}
                                {order.quantity > 1 ? ' each' : ''}
                            </span>

                            <span>
                                Quantity: {order.quantity}
                            </span>

                            <span className="font-bold text-[#176B4D]">
                                Total {formatPrice(Number(order.price) * order.quantity)}
                            </span>

                            <span>
                                {formatDate(order.created_at)}
                            </span>
                        </div>

                        {otherUser && (
                            <div className="mt-4 flex items-center gap-2">
                                <CircleUserRound
                                    size={16}
                                    className="text-slate-400"
                                />

                                <span className="text-xs text-slate-500">
                                    {selling
                                        ? 'Buyer:'
                                        : 'Seller:'}
                                </span>

                                <span className="text-xs font-semibold text-slate-700">
                                    {otherUser.name}
                                </span>
                            </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                            <a
                                href={`/listings/${order.listing.id}`}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                                View Listing
                            </a>

                            <button
                                type="button"
                                onClick={() =>
                                    messageUser(order.id)
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#176B4D] px-3 py-2 text-xs font-semibold text-[#176B4D] transition hover:bg-[#EAF4EF]"
                            >
                                <MessageCircle size={14} />
                                {selling
                                    ? 'Message Buyer'
                                    : 'Message Seller'}
                            </button>

                            {selling &&
                                order.status === 'pending' && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            confirmOrder(
                                                order.id,
                                            )
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#176B4D] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#12583F]"
                                    >
                                        <Check size={14} />
                                        Confirm
                                    </button>
                                )}

                            {(order.status === 'pending' ||
                                order.status ===
                                    'confirmed') && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        cancelOrder(order.id)
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                                >
                                    <X size={14} />
                                    Cancel
                                </button>
                            )}

                            {!selling &&
                                order.status ===
                                    'confirmed' && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            completeOrder(
                                                order.id,
                                            )
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#176B4D] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#12583F]"
                                    >
                                        <CheckCircle2
                                            size={14}
                                        />
                                        Mark Completed
                                    </button>
                                )}

                            {!selling &&
                                order.status === 'completed' &&
                                (order.review ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                                        <Star
                                            size={14}
                                            className="fill-amber-400 text-amber-400"
                                        />
                                        You rated {order.review.rating}/5
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setReviewing(order)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600"
                                    >
                                        <Star size={14} />
                                        Leave a Review
                                    </button>
                                ))}

                            {(() => {
                                const filed = order.reports?.[0];

                                return filed ? (
                                    <Link
                                        href={`/reports/${filed.id}`}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4623a]/40 bg-[#fcebe3] px-3 py-2 text-xs font-semibold text-[#8f3a1b] transition hover:bg-[#f9dccf]"
                                    >
                                        <FileText size={14} />
                                        View report ({filed.status})
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setReporting(order)}
                                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#566860] transition hover:bg-red-50 hover:text-red-700"
                                    >
                                        <Flag size={14} />
                                        Report transaction
                                    </button>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AppLayout>
            <Head title="My Orders" />

            <div className="min-h-screen bg-[#F7FAF7] px-4 py-6 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-8">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF4EF] text-[#176B4D]">
                                <ShoppingBag size={22} />
                            </div>

                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                    My Orders
                                </h1>

                                <p className="text-sm text-slate-500">
                                    Manage your purchases and sales
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <section>
                            <div className="mb-4 flex items-center gap-2">
                                <ShoppingBag
                                    size={18}
                                    className="text-[#176B4D]"
                                />

                                <h2 className="text-lg font-bold text-slate-900">
                                    Buying
                                </h2>

                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                    {buyingOrders.length}
                                </span>
                            </div>

                            {buyingOrders.length === 0 ? (
                                <div className="rounded-2xl border border-[#E1E9E4] bg-white px-6 py-12 text-center shadow-sm">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF4EF] text-[#176B4D]">
                                        <ShoppingBag size={26} />
                                    </div>

                                    <h3 className="mt-4 text-base font-bold text-slate-800">
                                        No purchases yet
                                    </h3>

                                    <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                                        When you place an order for a
                                        listing, it will appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {buyingOrders.map(
                                        (order) => (
                                            <OrderCard
                                                key={order.id}
                                                order={order}
                                                selling={false}
                                            />
                                        ),
                                    )}
                                </div>
                            )}
                        </section>

                        <section>
                            <div className="mb-4 flex items-center gap-2">
                                <Store
                                    size={18}
                                    className="text-[#176B4D]"
                                />

                                <h2 className="text-lg font-bold text-slate-900">
                                    Selling
                                </h2>

                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                    {sellingOrders.length}
                                </span>
                            </div>

                            {sellingOrders.length === 0 ? (
                                <div className="rounded-2xl border border-[#E1E9E4] bg-white px-6 py-12 text-center shadow-sm">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF4EF] text-[#176B4D]">
                                        <Store size={26} />
                                    </div>

                                    <h3 className="mt-4 text-base font-bold text-slate-800">
                                        No sales yet
                                    </h3>

                                    <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                                        Orders from buyers for your
                                        listings will appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {sellingOrders.map(
                                        (order) => (
                                            <OrderCard
                                                key={order.id}
                                                order={order}
                                                selling={true}
                                            />
                                        ),
                                    )}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>

            {reporting && (
                <ReportModal
                    action={`/orders/${reporting.id}/report`}
                    title={`Report order #${reporting.id}`}
                    reasons={transactionReasons}
                    onClose={() => setReporting(null)}
                    note="We compile this order, your conversation and the details you give into a case file that can be handed to the school's authorities."
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