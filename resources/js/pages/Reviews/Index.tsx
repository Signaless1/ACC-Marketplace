import { Head, Link } from '@inertiajs/react';
import { Star } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import Avatar from '../../components/ui/Avatar';
import Pagination from '../../components/ui/Pagination';
import ReviewModal from '../../components/ui/ReviewModal';
import Stars from '../../components/ui/Stars';
import AttachmentList from '../../components/ui/AttachmentList';
import { AttachmentData, formatDate, Paginated } from '../../types/shared';

interface ReceivedReview {
    id: number;
    rating: number;
    comment: string | null;
    product_rating?: number | null;
    attachments?: AttachmentData[];
    created_at: string;
    reviewer: { id: number; name: string };
    listing: { id: number; title: string } | null;
}

interface WrittenReview {
    id: number;
    rating: number;
    comment: string | null;
    product_rating?: number | null;
    attachments?: AttachmentData[];
    created_at: string;
    seller: { id: number; name: string };
    listing: { id: number; title: string } | null;
}

interface PendingOrder {
    id: number;
    listing: { id: number; title: string };
    seller: { id: number; name: string };
}

interface Props {
    received: Paginated<ReceivedReview>;
    written: Paginated<WrittenReview>;
    pending: PendingOrder[];
}

export default function Index({ received, written, pending }: Props) {
    const [tab, setTab] = useState<'received' | 'written'>('received');
    const [reviewing, setReviewing] = useState<PendingOrder | null>(null);

    const tabClass = (active: boolean) =>
        `rounded-lg px-4 py-2 text-sm font-semibold transition ${
            active
                ? 'bg-[#176B4D] text-white'
                : 'text-slate-600 hover:bg-[#EAF4EF]'
        }`;

    return (
        <AppLayout>
            <Head title="Reviews" />

            <div className="min-h-screen bg-[#F7F9F8] px-4 py-8 sm:px-6">
                <div className="mx-auto max-w-3xl space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF4EF] text-[#176B4D]">
                            <Star size={22} />
                        </div>
                        <h1 className="text-2xl font-bold text-[#17352A]">
                            Reviews
                        </h1>
                    </div>

                    {pending.length > 0 && (
                        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                            <h2 className="text-sm font-bold text-amber-900">
                                Waiting for your review ({pending.length})
                            </h2>

                            <ul className="mt-3 space-y-2">
                                {pending.map((order) => (
                                    <li
                                        key={order.id}
                                        className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-800">
                                                {order.listing.title}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Seller: {order.seller.name}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setReviewing(order)}
                                            className="shrink-0 rounded-lg bg-[#176B4D] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#12583F]"
                                        >
                                            Write review
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <div className="flex gap-2 rounded-xl border border-[#E1E9E4] bg-white p-1.5 shadow-sm">
                        <button
                            type="button"
                            className={tabClass(tab === 'received')}
                            onClick={() => setTab('received')}
                        >
                            Received ({received.total})
                        </button>
                        <button
                            type="button"
                            className={tabClass(tab === 'written')}
                            onClick={() => setTab('written')}
                        >
                            Written ({written.total})
                        </button>
                    </div>

                    {tab === 'received' ? (
                        <section>
                            {received.data.length > 0 ? (
                                <div className="space-y-3">
                                    {received.data.map((review) => (
                                        <article
                                            key={review.id}
                                            className="rounded-2xl border border-[#E1E9E4] bg-white p-5 shadow-sm"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <Avatar
                                                        name={review.reviewer.name}
                                                        size={36}
                                                    />
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800">
                                                            {review.reviewer.name}
                                                        </p>
                                                        <p className="text-xs text-slate-400">
                                                            {formatDate(review.created_at)}
                                                            {review.listing &&
                                                                ` · ${review.listing.title}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Stars value={review.rating} />
                                            </div>
                                            {review.comment && (
                                                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                                                    {review.comment}
                                                </p>
                                            )}
                                            <AttachmentList attachments={review.attachments ?? []} />
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <p className="rounded-2xl border border-dashed border-[#DDE6E0] bg-white px-6 py-12 text-center text-sm text-slate-500">
                                    You haven't received any reviews yet.
                                    Complete a sale to get your first one.
                                </p>
                            )}
                            <Pagination links={received.links} />
                        </section>
                    ) : (
                        <section>
                            {written.data.length > 0 ? (
                                <div className="space-y-3">
                                    {written.data.map((review) => (
                                        <article
                                            key={review.id}
                                            className="rounded-2xl border border-[#E1E9E4] bg-white p-5 shadow-sm"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <Link
                                                        href={`/users/${review.seller.id}`}
                                                        className="text-sm font-semibold text-slate-800 hover:text-[#176B4D]"
                                                    >
                                                        {review.seller.name}
                                                    </Link>
                                                    <p className="text-xs text-slate-400">
                                                        {formatDate(review.created_at)}
                                                        {review.listing &&
                                                            ` · ${review.listing.title}`}
                                                    </p>
                                                </div>
                                                <Stars value={review.rating} />
                                            </div>
                                            {review.comment && (
                                                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                                                    {review.comment}
                                                </p>
                                            )}
                                            <AttachmentList attachments={review.attachments ?? []} />
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <p className="rounded-2xl border border-dashed border-[#DDE6E0] bg-white px-6 py-12 text-center text-sm text-slate-500">
                                    You haven't written any reviews yet.
                                </p>
                            )}
                            <Pagination links={written.links} />
                        </section>
                    )}
                </div>
            </div>

            {reviewing && (
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
