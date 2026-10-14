import { Link } from '@inertiajs/react';
import { Attachment, formatDate } from '../../types/shared';
import Avatar from './Avatar';
import AttachmentGallery from './AttachmentGallery';
import RatingStars from './RatingStars';

export interface ReviewItem {
    id: number;
    /** Seller rating. */
    rating: number;
    /** Product rating (null on reviews written before products could be rated). */
    product_rating?: number | null;
    comment: string | null;
    created_at: string;
    reviewer?: { id: number; name: string; avatar_url?: string | null };
    seller?: { id: number; name: string; avatar_url?: string | null };
    listing?: { id: number; title: string } | null;
    attachments?: Attachment[];
}

/**
 * One review: who wrote it, the product and seller ratings, the comment,
 * and any photos / videos / files they attached.
 */
export default function ReviewCard({
    review,
    /** Whose name to show: the reviewer (default) or the seller being reviewed. */
    perspective = 'reviewer',
    showListing = true,
}: {
    review: ReviewItem;
    perspective?: 'reviewer' | 'seller';
    showListing?: boolean;
}) {
    const person = perspective === 'reviewer' ? review.reviewer : review.seller;

    return (
        <article className="rounded-2xl border border-sand-200 bg-white p-5 shadow-sm">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    {person && (
                        <Avatar
                            name={person.name}
                            url={person.avatar_url}
                            size={40}
                        />
                    )}

                    <div className="min-w-0">
                        {perspective === 'seller' && person ? (
                            <Link
                                href={`/users/${person.id}`}
                                className="block truncate text-sm font-bold text-ink-900 hover:text-brand-700"
                            >
                                Seller: {person.name}
                            </Link>
                        ) : (
                            <p className="truncate text-sm font-bold text-ink-900">
                                {person?.name ?? 'Student'}
                            </p>
                        )}

                        <p className="text-xs text-ink-600">
                            {formatDate(review.created_at)}
                            {showListing && review.listing && (
                                <>
                                    {' · '}
                                    <Link
                                        href={`/listings/${review.listing.id}`}
                                        className="font-medium text-brand-700 hover:underline"
                                    >
                                        {review.listing.title}
                                    </Link>
                                </>
                            )}
                        </p>
                    </div>
                </div>

                <dl className="space-y-1 text-xs">
                    {review.product_rating ? (
                        <div className="flex items-center justify-end gap-2">
                            <dt className="font-semibold text-ink-600">Product</dt>
                            <dd>
                                <RatingStars value={review.product_rating} size={15} />
                            </dd>
                        </div>
                    ) : null}

                    <div className="flex items-center justify-end gap-2">
                        <dt className="font-semibold text-ink-600">Seller</dt>
                        <dd>
                            <RatingStars value={review.rating} size={15} />
                        </dd>
                    </div>
                </dl>
            </header>

            {review.comment && (
                <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-ink-700">
                    {review.comment}
                </p>
            )}

            {review.attachments && review.attachments.length > 0 && (
                <div className="mt-3">
                    <AttachmentGallery attachments={review.attachments} size="sm" />
                </div>
            )}
        </article>
    );
}
