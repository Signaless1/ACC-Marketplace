import { Head, Link } from '@inertiajs/react';
import { BadgeCheck, CalendarDays, Flag, Package, Settings, ShoppingBag, Star } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import Avatar from '../../components/ui/Avatar';
import { AttachmentGrid } from '../../components/ui/Attachments';
import ListingCard, { CardListing } from '../../components/ui/ListingCard';
import { Page } from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import ReportModal from '../../components/ui/ReportModal';
import Stars from '../../components/ui/Stars';
import { Attachment, formatDate, Paginated, timeAgo } from '../../types/shared';

interface Review {
    id: number;
    rating: number;
    product_rating: number | null;
    comment: string | null;
    created_at: string;
    reviewer: { id: number; name: string; avatar_url: string | null };
    listing: { id: number; title: string } | null;
    attachments: Attachment[];
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
        active_listings: number;
        completed_sales: number;
    };
    listings: CardListing[];
    reviews: Paginated<Review>;
    isOwnProfile: boolean;
}

const REPORT_REASONS: Record<string, string> = {
    scam: 'Scam or fraud',
    spam: 'Spam',
    harassment: 'Harassment or abusive behavior',
    inappropriate: 'Inappropriate content',
    other: 'Other',
};

export default function Show({ profile, stats, listings, reviews, isOwnProfile }: Props) {
    const [reporting, setReporting] = useState(false);

    return (
        <AppLayout>
            <Head title={profile.name} />

            <Page>
                <section className="ui-card overflow-hidden">
                    <div className="h-28 bg-gradient-to-r from-pine-900 via-pine-800 to-pine-700 sm:h-36" />

                    <div className="px-6 pb-6 sm:px-8">
                        <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
                            <span className="rounded-full bg-white p-1.5 shadow-md">
                                <Avatar name={profile.name} url={profile.avatar_url} size={104} />
                            </span>

                            <div className="pb-1">
                                {isOwnProfile ? (
                                    <Link href="/settings" className="ui-btn ui-btn-outline ui-btn-sm">
                                        <Settings size={15} /> Edit profile
                                    </Link>
                                ) : (
                                    <button type="button" onClick={() => setReporting(true)} className="ui-btn ui-btn-sm text-ink-3 hover:bg-red-50 hover:text-red-700">
                                        <Flag size={15} /> Report user
                                    </button>
                                )}
                            </div>
                        </div>

                        <h1 className="mt-4 flex flex-wrap items-center gap-2 font-display text-3xl font-extrabold text-pine-950">
                            {profile.name}
                            {stats.completed_sales >= 5 && (
                                <span className="ui-chip bg-mist-100 text-pine-700" title="5 or more completed sales">
                                    <BadgeCheck size={14} /> Trusted seller
                                </span>
                            )}
                        </h1>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-2">
                            <CalendarDays size={15} /> Joined {formatDate(profile.created_at)}
                        </p>

                        {profile.is_suspended && (
                            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                                This account is suspended.
                            </p>
                        )}

                        <p className="mt-4 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-ink-2">
                            {profile.bio ||
                                (isOwnProfile
                                    ? 'Add a short bio in Settings to tell buyers about yourself.'
                                    : 'This user has not added a bio yet.')}
                        </p>

                        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {[
                                [
                                    'Rating',
                                    stats.rating !== null ? (
                                        <span className="flex items-center gap-2">
                                            {stats.rating.toFixed(1)} <Stars value={stats.rating} size={15} />
                                        </span>
                                    ) : (
                                        <span className="text-base font-semibold text-ink-3">No ratings yet</span>
                                    ),
                                ],
                                ['Reviews', stats.reviews_count],
                                ['Active listings', stats.active_listings],
                                ['Completed sales', stats.completed_sales],
                            ].map(([label, value]) => (
                                <div key={label as string} className="rounded-2xl bg-mist-50 p-4 ring-1 ring-mist-200">
                                    <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-3">{label as string}</dt>
                                    <dd className="mt-1 font-display text-2xl font-extrabold text-pine-950">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>

                <section className="mt-10">
                    <h2 className="mb-4 font-display text-xl font-extrabold text-pine-950">Active listings</h2>
                    {listings.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                            {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-mist-300 bg-white px-6 py-12 text-center text-sm text-ink-2">
                            <Package size={30} className="mx-auto mb-3 text-mist-300" />
                            No active listings right now.
                        </div>
                    )}
                </section>

                <section className="mt-10">
                    <h2 className="mb-4 font-display text-xl font-extrabold text-pine-950">Reviews</h2>

                    {reviews.data.length > 0 ? (
                        <div className="grid gap-3 lg:grid-cols-2">
                            {reviews.data.map((review) => (
                                <article key={review.id} className="ui-card p-5">
                                    <div className="flex items-start gap-3.5">
                                        <Avatar name={review.reviewer.name} url={review.reviewer.avatar_url} size={40} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="text-sm font-bold text-ink">{review.reviewer.name}</p>
                                                <Stars value={review.rating} size={15} />
                                            </div>
                                            <p className="text-xs text-ink-3">
                                                {timeAgo(review.created_at)}
                                                {review.listing && (
                                                    <>
                                                        {' · '}
                                                        <Link href={`/listings/${review.listing.id}`} className="font-semibold hover:text-pine-700">
                                                            <ShoppingBag size={11} className="mr-0.5 inline" />
                                                            {review.listing.title}
                                                        </Link>
                                                    </>
                                                )}
                                            </p>
                                            {review.comment && (
                                                <p className="mt-2.5 whitespace-pre-line break-words text-[15px] leading-relaxed text-ink-2">
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
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-mist-300 bg-white px-6 py-12 text-center text-sm text-ink-2">
                            <Star size={30} className="mx-auto mb-3 text-mist-300" />
                            No reviews yet.
                        </div>
                    )}

                    <Pagination links={reviews.links} />
                </section>
            </Page>

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
