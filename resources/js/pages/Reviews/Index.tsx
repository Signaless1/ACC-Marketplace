import { Head, Link } from '@inertiajs/react';
import { Star } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import Avatar from '../../components/ui/Avatar';
import { AttachmentGrid } from '../../components/ui/Attachments';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader, { Page } from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import ReviewModal from '../../components/ui/ReviewModal';
import Stars from '../../components/ui/Stars';
import { Attachment, Paginated, timeAgo } from '../../types/shared';

interface Person {
    id: number;
    name: string;
    avatar_url: string | null;
}

interface ReviewRow {
    id: number;
    rating: number;
    product_rating: number | null;
    comment: string | null;
    created_at: string;
    reviewer?: Person;
    seller?: Person;
    listing: { id: number; title: string } | null;
    attachments: Attachment[];
}

interface PendingOrder {
    id: number;
    listing: { id: number; title: string };
    seller: { id: number; name: string };
}

interface Props {
    received: Paginated<ReviewRow>;
    written: Paginated<ReviewRow>;
    pending: PendingOrder[];
}

function ReviewCard({ review, perspective }: { review: ReviewRow; perspective: 'received' | 'written' }) {
    const person = perspective === 'received' ? review.reviewer : review.seller;

    return (
        <article className="ui-card p-5">
            <div className="flex items-start gap-3.5">
                {person && <Avatar name={person.name} url={person.avatar_url} size={42} />}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            {person && (
                                <Link href={`/users/${person.id}`} className="text-sm font-bold text-ink hover:text-pine-700">
                                    {perspective === 'written' && <span className="font-medium text-ink-3">Seller: </span>}
                                    {person.name}
                                </Link>
                            )}
                            <p className="text-xs text-ink-3">
                                {timeAgo(review.created_at)}
                                {review.listing && (
                                    <>
                                        {' · '}
                                        <Link href={`/listings/${review.listing.id}`} className="font-semibold hover:text-pine-700">
                                            {review.listing.title}
                                        </Link>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    <dl className="mt-2.5 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-ink-2">
                        {review.product_rating !== null && (
                            <div className="flex items-center gap-2">
                                <dt className="font-semibold">Product</dt>
                                <dd><Stars value={review.product_rating} size={14} /></dd>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <dt className="font-semibold">Seller</dt>
                            <dd><Stars value={review.rating} size={14} /></dd>
                        </div>
                    </dl>

                    {review.comment && (
                        <p className="mt-3 whitespace-pre-line break-words text-[15px] leading-relaxed text-ink-2">
                            {review.comment}
                        </p>
                    )}

                    {review.attachments.length > 0 && (
                        <div className="mt-3">
                            <AttachmentGrid attachments={review.attachments} />
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}

export default function Index({ received, written, pending }: Props) {
    const [tab, setTab] = useState<'received' | 'written'>('received');
    const [reviewing, setReviewing] = useState<PendingOrder | null>(null);

    const list = tab === 'received' ? received : written;

    return (
        <AppLayout>
            <Head title="Reviews" />

            <Page>
                <PageHeader icon={Star} title="Reviews" subtitle="What buyers say about you, and what you have said about sellers" />

                <div className="mx-auto max-w-3xl space-y-6">
                    {pending.length > 0 && (
                        <section className="rounded-2xl border border-sun-400/60 bg-sun-300/25 p-5">
                            <h2 className="font-display text-base font-extrabold text-pine-950">
                                Waiting for your review ({pending.length})
                            </h2>
                            <ul className="mt-3 space-y-2">
                                {pending.map((order) => (
                                    <li key={order.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-mist-200">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-ink">{order.listing.title}</p>
                                            <p className="text-xs text-ink-3">Seller: {order.seller.name}</p>
                                        </div>
                                        <button type="button" onClick={() => setReviewing(order)} className="ui-btn ui-btn-gold ui-btn-sm shrink-0">
                                            <Star size={14} /> Write review
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <div className="inline-flex gap-1.5 rounded-2xl bg-white p-1.5 ring-1 ring-mist-200" role="tablist">
                        {(
                            [
                                ['received', 'Received', received.total],
                                ['written', 'Written', written.total],
                            ] as const
                        ).map(([value, label, count]) => (
                            <button
                                key={value}
                                type="button"
                                role="tab"
                                aria-selected={tab === value}
                                onClick={() => setTab(value)}
                                className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                                    tab === value ? 'bg-pine-800 text-white' : 'text-ink-2 hover:bg-mist-100'
                                }`}
                            >
                                {label} ({count})
                            </button>
                        ))}
                    </div>

                    {list.data.length > 0 ? (
                        <div className="space-y-3">
                            {list.data.map((review) => (
                                <ReviewCard key={review.id} review={review} perspective={tab} />
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={Star}
                            title={tab === 'received' ? 'No reviews yet' : 'You have not written any reviews'}
                            text={
                                tab === 'received'
                                    ? 'Complete a sale and your buyer can rate you here.'
                                    : 'After an order is completed you can rate the product and the seller.'
                            }
                        />
                    )}

                    <Pagination links={list.links} />
                </div>
            </Page>

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
