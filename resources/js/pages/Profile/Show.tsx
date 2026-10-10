import { Head, Link } from '@inertiajs/react';
import { CalendarDays, Flag, Package, Settings, Star } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import Avatar from '../../components/ui/Avatar';
import ListingCard, { CardListing } from '../../components/ui/ListingCard';
import Pagination from '../../components/ui/Pagination';
import ReportModal from '../../components/ui/ReportModal';
import RatingStars from '../../components/ui/RatingStars';
import RatingSummary from '../../components/ui/RatingSummary';
import ReviewForm, { ReviewableOrder } from '../../components/ui/ReviewForm';
import AttachmentList from '../../components/ui/AttachmentList';
import { AttachmentData, formatDate, Paginated } from '../../types/shared';

interface Review {
    id: number;
    rating: number;
    comment: string | null;
    product_rating?: number | null;
    attachments?: AttachmentData[];
    created_at: string;
    reviewer: { id: number; name: string; avatar_url: string | null };
    listing: { id: number; title: string } | null;
}

interface Props {
    profile: {
        id: number;
        name: string;
        bio: string | null;
        avatar_url: string | null;
        created_at: string;
        is_suspended: boolean;
    };
    stats: {
        rating: number | null;
        reviews_count: number;
        distribution: Record<string, number>;
        active_listings: number;
        completed_sales: number;
    };
    listings: CardListing[];
    reviews: Paginated<Review>;
    reviewableOrders: ReviewableOrder[];
    isOwnProfile: boolean;
}

const REPORT_REASONS: Record<string, string> = {
    scam: 'Scam or fraud',
    spam: 'Spam',
    harassment: 'Harassment or abusive behavior',
    inappropriate: 'Inappropriate content',
    other: 'Other',
};

export default function Show({
    profile,
    stats,
    listings,
    reviews,
    reviewableOrders,
    isOwnProfile,
}: Props) {
    const [reporting, setReporting] = useState(false);
    const initialOrderId = Number(
        new URLSearchParams(window.location.search).get('order'),
    );

    return (
        <AppLayout>
            <Head title={profile.name} />

            <div className="min-h-screen bg-[#F7F9F8] px-4 py-8 sm:px-6">
                <div className="mx-auto max-w-5xl space-y-8">
                    <section className="rounded-2xl border border-[#E1E9E4] bg-white p-6 shadow-sm sm:p-8">
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                            <Avatar
                                name={profile.name}
                                url={profile.avatar_url}
                                size={96}
                            />

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h1 className="text-2xl font-bold text-[#17352A]">
                                            {profile.name}
                                        </h1>

                                        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                                            <CalendarDays size={15} />
                                            Joined{' '}
                                            {formatDate(profile.created_at)}
                                        </p>
                                    </div>

                                    {isOwnProfile ? (
                                        <Link
                                            href="/settings"
                                            className="inline-flex items-center gap-2 rounded-xl border border-[#176B4D] px-4 py-2 text-sm font-semibold text-[#176B4D] transition hover:bg-[#EAF4EF]"
                                        >
                                            <Settings size={16} />
                                            Edit profile
                                        </Link>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setReporting(true)}
                                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                        >
                                            <Flag size={15} />
                                            Report user
                                        </button>
                                    )}
                                </div>

                                {profile.is_suspended && (
                                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                                        This account is suspended.
                                    </p>
                                )}

                                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                                    {profile.bio ||
                                        (isOwnProfile
                                            ? 'Add a short bio in Settings to tell buyers about yourself.'
                                            : 'This user has not added a bio yet.')}
                                </p>
                            </div>
                        </div>

                        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-4">
                            <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                    Rating
                                </dt>
                                <dd className="mt-1 flex items-center gap-2">
                                    {stats.rating !== null ? (
                                        <>
                                            <span className="text-xl font-bold text-slate-900">
                                                {stats.rating.toFixed(1)}
                                            </span>
                                            <RatingStars value={stats.rating} />
                                        </>
                                    ) : (
                                        <span className="text-sm text-slate-400">
                                            No reviews yet
                                        </span>
                                    )}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                    Reviews
                                </dt>
                                <dd className="mt-1 text-xl font-bold text-slate-900">
                                    {stats.reviews_count}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                    Active listings
                                </dt>
                                <dd className="mt-1 text-xl font-bold text-slate-900">
                                    {stats.active_listings}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                    Completed sales
                                </dt>
                                <dd className="mt-1 text-xl font-bold text-slate-900">
                                    {stats.completed_sales}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    <section>
                        <h2 className="mb-4 text-lg font-bold text-[#17352A]">
                            Active listings
                        </h2>

                        {listings.length > 0 ? (
                            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {listings.map((listing) => (
                                    <ListingCard
                                        key={listing.id}
                                        listing={listing}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-[#DDE6E0] bg-white px-6 py-12 text-center text-sm text-slate-500">
                                <Package
                                    size={30}
                                    className="mx-auto mb-3 text-slate-300"
                                />
                                No active listings right now.
                            </div>
                        )}
                    </section>

                    {reviewableOrders.length > 0 && (
                        <section id="leave-review" className="scroll-mt-24">
                            <h2 className="mb-1 text-lg font-bold text-[#17352A]">
                                Leave a review
                            </h2>
                            <p className="mb-4 text-sm text-slate-500">
                                You completed{' '}
                                {reviewableOrders.length === 1
                                    ? 'an order'
                                    : `${reviewableOrders.length} orders`}{' '}
                                with {profile.name}.
                            </p>
                            <ReviewForm
                                sellerName={profile.name}
                                orders={reviewableOrders}
                                initialOrderId={initialOrderId || null}
                            />
                        </section>
                    )}

                    <section>
                        <h2 className="mb-4 text-lg font-bold text-[#17352A]">
                            Reviews
                        </h2>

                        {stats.rating !== null && (
                            <div className="mb-4">
                                <RatingSummary
                                    average={stats.rating}
                                    count={stats.reviews_count}
                                    distribution={stats.distribution}
                                />
                            </div>
                        )}

                        {reviews.data.length > 0 ? (
                            <div className="space-y-3">
                                {reviews.data.map((review) => (
                                    <article
                                        key={review.id}
                                        className="rounded-2xl border border-[#E1E9E4] bg-white p-5 shadow-sm"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    name={review.reviewer.name}
                                                    url={review.reviewer.avatar_url}
                                                    size={36}
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">
                                                        {review.reviewer.name}
                                                    </p>
                                                    <p className="text-xs text-slate-400">
                                                        {formatDate(
                                                            review.created_at,
                                                        )}
                                                        {review.listing &&
                                                            ` · ${review.listing.title}`}
                                                    </p>
                                                </div>
                                            </div>

                                            <RatingStars value={review.rating} />
                                        </div>

                                        {review.comment && (
                                            <p className="mt-3 line-clamp-6 whitespace-pre-line break-words text-sm leading-6 text-slate-600">
                                                {review.comment}
                                            </p>
                                        )}
                                        <AttachmentList attachments={review.attachments ?? []} />
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-[#DDE6E0] bg-white px-6 py-12 text-center">
                                <Star
                                    size={30}
                                    className="mx-auto mb-3 text-slate-300"
                                />
                                <p className="font-semibold text-slate-700">
                                    No reviews yet
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    Reviews from completed transactions will
                                    appear here.
                                </p>
                            </div>
                        )}

                        <Pagination links={reviews.links} />
                    </section>
                </div>
            </div>

            {reporting && (
                <ReportModal
                    action={`/users/${profile.id}/report`}
                    title={`Report ${profile.name}`}
                    reasons={REPORT_REASONS}
                    onClose={() => setReporting(false)}
                />
            )}
        </AppLayout>
    );
}
