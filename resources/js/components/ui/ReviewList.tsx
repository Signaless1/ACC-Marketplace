import { router } from '@inertiajs/react';
import { CornerDownRight, MessageSquareText } from 'lucide-react';
import { useState } from 'react';
import { AttachmentData, formatDate } from '../../types/shared';
import AttachmentList from './AttachmentList';
import Avatar from './Avatar';
import RatingStars from './RatingStars';

export interface ReviewItem {
    id: number;
    rating: number;
    product_rating: number | null;
    comment: string | null;
    created_at: string;
    seller_reply: string | null;
    seller_replied_at: string | null;
    reviewer: { id: number; name: string; avatar_url: string | null };
    attachments: AttachmentData[];
}

function ReplyBox({ reviewId, existing }: { reviewId: number; existing: string | null }) {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState(existing ?? '');
    const [busy, setBusy] = useState(false);

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#176B4D] hover:underline"
            >
                <CornerDownRight size={13} />
                {existing ? 'Edit your reply' : 'Reply as seller'}
            </button>
        );
    }

    return (
        <div className="mt-3 space-y-2">
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                maxLength={500}
                aria-label="Your reply"
                className="w-full rounded-xl border border-[#cfdcd4] px-3 py-2 text-sm outline-none focus:border-[#176B4D]"
            />
            <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-[#43554c]">
                    Cancel
                </button>
                <button
                    type="button"
                    disabled={busy || text.trim().length < 2}
                    onClick={() =>
                        router.post(`/reviews/${reviewId}/reply`, { reply: text }, {
                            preserveScroll: true,
                            onStart: () => setBusy(true),
                            onFinish: () => setBusy(false),
                            onSuccess: () => setOpen(false),
                        })
                    }
                    className="rounded-lg bg-[#176B4D] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                    {busy ? 'Posting…' : 'Post reply'}
                </button>
            </div>
        </div>
    );
}

/** Customer reviews as a comment thread, with photos and seller replies. */
export default function ReviewList({
    reviews,
    canReply = false,
}: {
    reviews: ReviewItem[];
    canReply?: boolean;
}) {
    if (reviews.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-[#c9d9cf] bg-[#FAFCFB] px-6 py-10 text-center">
                <MessageSquareText className="mx-auto text-[#5f7a6c]" size={30} />
                <p className="mt-3 font-sans text-sm font-bold text-[#12291f]">No reviews yet</p>
                <p className="mt-1 text-sm text-[#43554c]">
                    Reviews from verified buyers will show up here.
                </p>
            </div>
        );
    }

    return (
        <ul className="divide-y divide-[#E7EEE9]">
            {reviews.map((review) => (
                <li key={review.id} className="py-5 first:pt-0">
                    <div className="flex items-start gap-3">
                        <Avatar name={review.reviewer.name} url={review.reviewer.avatar_url} size={40} />

                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-x-3">
                                <p className="text-sm font-bold text-[#12291f]">{review.reviewer.name}</p>
                                <span className="text-xs text-[#566860]">{formatDate(review.created_at)}</span>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                                {review.product_rating !== null && (
                                    <span className="inline-flex items-center gap-1.5 text-xs text-[#43554c]">
                                        <RatingStars value={review.product_rating} size={14} />
                                        Product
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1.5 text-xs text-[#43554c]">
                                    <RatingStars value={review.rating} size={14} />
                                    Seller
                                </span>
                                <span className="rounded-full bg-[#EAF4EF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#12583F]">
                                    Verified purchase
                                </span>
                            </div>

                            {review.comment && (
                                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#2f4a3d]">
                                    {review.comment}
                                </p>
                            )}

                            <AttachmentList attachments={review.attachments} />

                            {review.seller_reply && (
                                <div className="mt-3 rounded-xl border-l-4 border-[#d9a441] bg-[#FBF6E8] px-4 py-3">
                                    <p className="text-xs font-bold text-[#7a5a12]">Seller's reply</p>
                                    <p className="mt-1 whitespace-pre-line text-sm text-[#2f4a3d]">
                                        {review.seller_reply}
                                    </p>
                                </div>
                            )}

                            {canReply && <ReplyBox reviewId={review.id} existing={review.seller_reply} />}
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
}
