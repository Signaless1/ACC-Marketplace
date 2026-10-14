import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    BadgeCheck,
    ChevronLeft,
    ChevronRight,
    Eye,
    Flag,
    Heart,
    Link2,
    MapPin,
    Maximize2,
    MessageCircle,
    Minus,
    Package,
    Pencil,
    Plus,
    ShieldCheck,
    ShoppingBag,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import Avatar from '../../components/ui/Avatar';
import { AttachmentGrid, Lightbox } from '../../components/ui/Attachments';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ListingCard, { CardListing } from '../../components/ui/ListingCard';
import { Page } from '../../components/ui/PageHeader';
import ReportModal from '../../components/ui/ReportModal';
import ReviewModal from '../../components/ui/ReviewModal';
import Stars from '../../components/ui/Stars';
import StatusBadge from '../../components/ui/StatusBadge';
import { Attachment, formatDate, formatPrice, timeAgo } from '../../types/shared';

interface Review {
    id: number;
    rating: number;
    product_rating: number;
    comment: string | null;
    created_at: string;
    reviewer: { id: number; name: string; avatar_url: string | null };
    attachments: Attachment[];
}

interface Listing {
    id: number;
    user_id: number;
    title: string;
    description: string;
    price: string;
    quantity: number;
    type: 'item' | 'service';
    condition: string | null;
    status: 'available' | 'reserved' | 'sold';
    views_count: number;
    created_at: string;
    hidden_at: string | null;
    removed_reason: string | null;
    removed_reason_label: string | null;
    removed_note: string | null;
    rating_avg: number | string | null;
    rating_count: number;
    favorites_count: number;
    seller: { id: number; name: string; avatar_url: string | null; created_at: string };
    category: { id: number; name: string };
    images: { id: number; path: string }[];
}

interface Props {
    listing: Listing;
    canEdit: boolean;
    isFavorited: boolean;
    soldUnits: number;
    sellerRating: { average: number | null; count: number };
    ratingBreakdown: Record<string, number>;
    reviews: Review[];
    reviewableOrder: { id: number } | null;
    sellerOtherListings: CardListing[];
    similarListings: CardListing[];
    featuredListings: CardListing[];
    reportReasons: Record<string, string>;
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="mt-12">
            <h2 className="mb-4 font-display text-xl font-extrabold text-pine-950">{title}</h2>
            {children}
        </section>
    );
}

export default function Show({
    listing,
    canEdit,
    isFavorited,
    soldUnits,
    sellerRating,
    ratingBreakdown,
    reviews,
    reviewableOrder,
    sellerOtherListings,
    similarListings,
    featuredListings,
    reportReasons,
}: Props) {
    const [active, setActive] = useState(0);
    const [zoom, setZoom] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [dialog, setDialog] = useState<'order' | 'delete' | null>(null);
    const [reporting, setReporting] = useState(false);
    const [reviewing, setReviewing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [busy, setBusy] = useState(false);

    const images = listing.images;
    const main = images[active] ?? images[0];
    const lightboxImages: Attachment[] = images.map((image) => ({
        id: image.id,
        url: `/storage/${image.path}`,
        original_name: listing.title,
        mime: 'image/jpeg',
        size: 0,
        human_size: '',
        kind: 'image',
    }));

    const avg = listing.rating_avg === null ? null : Number(listing.rating_avg);
    const available = listing.status === 'available' && listing.quantity > 0 && !listing.hidden_at;
    const maxQty = Math.max(1, Math.min(listing.quantity, 99));
    const safeQty = Math.min(Math.max(1, quantity), maxQty);
    const total = Number(listing.price) * safeQty;
    const totalReviews = Object.values(ratingBreakdown).reduce((a, b) => a + b, 0);

    const go = (delta: number) => setActive((i) => (i + delta + images.length) % images.length);

    const toggleFavorite = () =>
        router.post(`/listings/${listing.id}/favorite`, {}, { preserveScroll: true });

    const messageSeller = () => router.post(`/listings/${listing.id}/message`);

    const placeOrder = () =>
        router.post(
            `/listings/${listing.id}/order`,
            { quantity: safeQty },
            {
                onStart: () => setBusy(true),
                onFinish: () => {
                    setBusy(false);
                    setDialog(null);
                },
            },
        );

    const deleteListing = () =>
        router.delete(`/listings/${listing.id}`, {
            onStart: () => setBusy(true),
            onFinish: () => {
                setBusy(false);
                setDialog(null);
            },
        });

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            window.prompt('Copy this link:', window.location.href);
        }
    };

    const stockLabel =
        listing.hidden_at
            ? 'Removed'
            : listing.status === 'sold'
              ? 'Sold out'
              : listing.status === 'reserved'
                ? 'Reserved for a buyer'
                : listing.quantity <= 3
                  ? `Only ${listing.quantity} left`
                  : `${listing.quantity} available`;

    return (
        <AppLayout>
            <Head title={listing.title} />

            <Page>
                {/* Breadcrumb */}
                <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-3">
                    <Link href="/marketplace" className="font-semibold hover:text-pine-700">Marketplace</Link>
                    <ChevronRight size={14} />
                    <Link
                        href={`/marketplace?category=${listing.category.id}`}
                        className="font-semibold hover:text-pine-700"
                    >
                        {listing.category.name}
                    </Link>
                    <ChevronRight size={14} />
                    <span className="max-w-[16rem] truncate font-semibold text-ink-2">{listing.title}</span>
                </nav>

                {/* Moderation notice for the seller (or an admin looking at it) */}
                {listing.hidden_at && (
                    <div role="alert" className="mb-6 flex gap-4 rounded-2xl border border-red-200 bg-red-50 p-5">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                            <AlertTriangle size={20} />
                        </span>
                        <div>
                            <p className="font-display text-base font-extrabold text-red-900">
                                A moderator removed this listing
                            </p>
                            <p className="mt-1 text-sm text-red-900/90">
                                <strong>Reason:</strong> {listing.removed_reason_label ?? 'No reason recorded'}
                                {listing.removed_note && <> — {listing.removed_note}</>}
                            </p>
                            <p className="mt-2 text-[13px] text-red-900/80">
                                Buyers cannot see it. If you think this was a mistake, contact the marketplace
                                administrators. You can still delete it.
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                    {/* Gallery */}
                    <div>
                        <div className="group relative aspect-[4/3] overflow-hidden rounded-3xl bg-mist-100 ring-1 ring-mist-200">
                            {main ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setZoom(true)}
                                        aria-label="Zoom image"
                                        className="absolute inset-0 cursor-zoom-in"
                                    >
                                        <img
                                            src={`/storage/${main.path}`}
                                            alt={listing.title}
                                            className="h-full w-full object-contain"
                                        />
                                    </button>

                                    <span className="pointer-events-none absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink-2 opacity-0 shadow-sm transition group-hover:opacity-100">
                                        <Maximize2 size={16} />
                                    </span>

                                    {images.length > 1 && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => go(-1)}
                                                aria-label="Previous photo"
                                                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-md transition hover:bg-white"
                                            >
                                                <ChevronLeft size={20} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => go(1)}
                                                aria-label="Next photo"
                                                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-md transition hover:bg-white"
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                            <span className="absolute bottom-3 right-3 rounded-full bg-pine-950/70 px-3 py-1 text-xs font-semibold text-white">
                                                {active + 1} / {images.length}
                                            </span>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-3">
                                    <Package size={56} strokeWidth={1.3} />
                                    <span className="text-sm font-medium">The seller has not added photos</span>
                                </div>
                            )}

                            {!available && !listing.hidden_at && (
                                <span className="absolute left-4 top-4 rounded-full bg-pine-950/85 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
                                    {listing.status === 'reserved' ? 'Reserved' : 'Sold out'}
                                </span>
                            )}
                        </div>

                        {images.length > 1 && (
                            <ul className="mt-3 grid grid-cols-5 gap-2.5 sm:grid-cols-6">
                                {images.map((image, index) => (
                                    <li key={image.id}>
                                        <button
                                            type="button"
                                            onClick={() => setActive(index)}
                                            aria-label={`Show photo ${index + 1}`}
                                            aria-pressed={index === active}
                                            className={`aspect-square w-full overflow-hidden rounded-xl bg-mist-100 ring-2 transition ${
                                                index === active ? 'ring-pine-700' : 'ring-transparent hover:ring-mist-300'
                                            }`}
                                        >
                                            <img
                                                src={`/storage/${image.path}`}
                                                alt=""
                                                loading="lazy"
                                                className="h-full w-full object-cover"
                                            />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Buy box */}
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="ui-chip bg-mist-100 text-pine-800">{listing.category.name}</span>
                            <span className="ui-chip bg-mist-100 text-pine-800">
                                {listing.type === 'service' ? 'Service' : 'Item'}
                            </span>
                            {listing.condition && listing.type === 'item' && (
                                <span className="ui-chip bg-sun-300/45 text-sun-800">{listing.condition}</span>
                            )}
                        </div>

                        <h1 className="mt-3 font-display text-[1.9rem] font-extrabold leading-tight text-pine-950 sm:text-4xl">
                            {listing.title}
                        </h1>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-2">
                            {avg !== null && listing.rating_count > 0 ? (
                                <a href="#reviews" className="inline-flex items-center gap-2 font-semibold hover:text-pine-700">
                                    <Stars value={avg} size={17} />
                                    <span>{avg.toFixed(1)}</span>
                                    <span className="text-ink-3">
                                        ({listing.rating_count} review{listing.rating_count === 1 ? '' : 's'})
                                    </span>
                                </a>
                            ) : (
                                <span className="text-ink-3">No reviews yet</span>
                            )}
                            {soldUnits > 0 && <span>{soldUnits} sold</span>}
                            <span className="inline-flex items-center gap-1"><Eye size={15} />{listing.views_count} views</span>
                            <span className="inline-flex items-center gap-1"><Heart size={15} />{listing.favorites_count} saved</span>
                        </div>

                        <p className="mt-5 font-display text-[2.4rem] font-extrabold leading-none text-pine-900">
                            {formatPrice(listing.price)}
                            {listing.quantity > 1 && listing.type === 'item' && (
                                <span className="ml-2 text-sm font-semibold text-ink-3">each</span>
                            )}
                        </p>

                        <p
                            className={`mt-3 inline-flex items-center gap-2 text-sm font-bold ${
                                available ? (listing.quantity <= 3 ? 'text-sun-800' : 'text-pine-700') : 'text-ink-3'
                            }`}
                        >
                            <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                    available ? (listing.quantity <= 3 ? 'bg-sun-500' : 'bg-pine-600') : 'bg-mist-300'
                                }`}
                            />
                            {stockLabel}
                        </p>

                        {/* Actions */}
                        {canEdit ? (
                            <div className="mt-6 ui-card p-5">
                                <p className="text-sm font-bold text-ink">This is your listing</p>
                                <div className="mt-3 flex flex-wrap gap-2.5">
                                    <Link href={`/listings/${listing.id}/edit`} className="ui-btn ui-btn-primary">
                                        <Pencil size={16} /> Edit listing
                                    </Link>
                                    <button type="button" onClick={() => setDialog('delete')} className="ui-btn ui-btn-danger-outline">
                                        <Trash2 size={16} /> Delete
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-6 space-y-4">
                                {available && (
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-bold text-ink">Quantity</span>
                                        <div className="flex items-center overflow-hidden rounded-xl border border-pine-900/20 bg-white">
                                            <button
                                                type="button"
                                                onClick={() => setQuantity(Math.max(1, safeQty - 1))}
                                                disabled={safeQty <= 1}
                                                aria-label="Decrease quantity"
                                                className="flex h-11 w-11 items-center justify-center text-ink-2 transition hover:bg-mist-100 disabled:opacity-40"
                                            >
                                                <Minus size={16} />
                                            </button>
                                            <span className="w-12 text-center text-[15px] font-extrabold" aria-live="polite">
                                                {safeQty}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setQuantity(Math.min(maxQty, safeQty + 1))}
                                                disabled={safeQty >= maxQty}
                                                aria-label="Increase quantity"
                                                className="flex h-11 w-11 items-center justify-center text-ink-2 transition hover:bg-mist-100 disabled:opacity-40"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                        {safeQty > 1 && (
                                            <span className="text-sm text-ink-2">
                                                Total <strong className="text-ink">{formatPrice(total)}</strong>
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2.5">
                                    <button
                                        type="button"
                                        disabled={!available}
                                        onClick={() => setDialog('order')}
                                        className="ui-btn ui-btn-primary ui-btn-lg min-w-[11rem] flex-1"
                                    >
                                        <ShoppingBag size={18} />
                                        {available ? 'Order now' : listing.status === 'reserved' ? 'Reserved' : 'Unavailable'}
                                    </button>
                                    <button type="button" onClick={messageSeller} className="ui-btn ui-btn-outline ui-btn-lg flex-1">
                                        <MessageCircle size={18} />
                                        Message seller
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={toggleFavorite}
                                        aria-pressed={isFavorited}
                                        className="ui-btn ui-btn-ghost ui-btn-sm"
                                    >
                                        <Heart size={16} className={isFavorited ? 'fill-red-500 text-red-500' : ''} />
                                        {isFavorited ? 'Saved' : 'Save'}
                                    </button>
                                    <button type="button" onClick={copyLink} className="ui-btn ui-btn-ghost ui-btn-sm">
                                        <Link2 size={16} />
                                        {copied ? 'Link copied!' : 'Share'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReporting(true)}
                                        className="ui-btn ui-btn-sm ml-auto text-ink-3 hover:bg-red-50 hover:text-red-700"
                                    >
                                        <Flag size={15} />
                                        Report
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Seller */}
                        <section className="mt-6 ui-card p-5" aria-label="Seller">
                            <div className="flex items-center gap-4">
                                <Avatar name={listing.seller.name} url={listing.seller.avatar_url} size={56} />
                                <div className="min-w-0 flex-1">
                                    <Link
                                        href={`/users/${listing.seller.id}`}
                                        className="block truncate font-display text-lg font-extrabold text-pine-950 hover:text-pine-700"
                                    >
                                        {listing.seller.name}
                                    </Link>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-ink-2">
                                        {sellerRating.average !== null ? (
                                            <>
                                                <Stars value={sellerRating.average} size={14} />
                                                <span className="font-semibold">{sellerRating.average.toFixed(1)}</span>
                                                <span className="text-ink-3">({sellerRating.count})</span>
                                            </>
                                        ) : (
                                            <span className="text-ink-3">New seller</span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 text-xs text-ink-3">
                                        Member since {formatDate(listing.seller.created_at)}
                                    </p>
                                </div>
                                <Link href={`/users/${listing.seller.id}`} className="ui-btn ui-btn-outline ui-btn-sm">
                                    View profile
                                </Link>
                            </div>
                        </section>

                        <div className="mt-4 flex gap-3 rounded-2xl bg-mist-100 p-4 text-[13px] leading-relaxed text-ink-2">
                            <ShieldCheck className="mt-0.5 shrink-0 text-pine-700" size={20} />
                            <p>
                                <strong className="text-ink">Trade safely.</strong> Meet on campus during the day,
                                check the item before you pay, and keep the conversation in the app.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Description + details */}
                <div className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                    <section className="ui-card p-6">
                        <h2 className="font-display text-xl font-extrabold text-pine-950">About this {listing.type}</h2>
                        <p className="mt-3 whitespace-pre-line break-words text-[15px] leading-7 text-ink-2">
                            {listing.description}
                        </p>
                    </section>

                    <section className="ui-card p-6">
                        <h2 className="font-display text-xl font-extrabold text-pine-950">Details</h2>
                        <dl className="mt-3 divide-y divide-mist-100 text-sm">
                            {[
                                ['Category', listing.category.name],
                                ['Type', listing.type === 'service' ? 'Service' : 'Item'],
                                ...(listing.type === 'item' && listing.condition ? [['Condition', listing.condition]] : []),
                                ['Stock', stockLabel],
                                ['Posted', `${formatDate(listing.created_at)} (${timeAgo(listing.created_at)})`],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between gap-4 py-2.5">
                                    <dt className="text-ink-3">{label}</dt>
                                    <dd className="text-right font-semibold text-ink">{value}</dd>
                                </div>
                            ))}
                            <div className="flex items-center justify-between gap-4 py-2.5">
                                <dt className="text-ink-3">Status</dt>
                                <dd><StatusBadge status={listing.hidden_at ? 'removed' : listing.status} /></dd>
                            </div>
                        </dl>
                        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-3">
                            <MapPin size={14} className="mt-0.5 shrink-0" />
                            Pick-up is arranged in Messages. Payment is made in person.
                        </p>
                    </section>
                </div>

                {/* Reviews */}
                <section id="reviews" className="mt-12 scroll-mt-24">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="font-display text-xl font-extrabold text-pine-950">Ratings &amp; reviews</h2>
                        {reviewableOrder && (
                            <button type="button" onClick={() => setReviewing(true)} className="ui-btn ui-btn-gold ui-btn-sm">
                                Write a review
                            </button>
                        )}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
                        <div className="ui-card p-6">
                            {avg !== null && listing.rating_count > 0 ? (
                                <>
                                    <p className="font-display text-5xl font-extrabold text-pine-950">{avg.toFixed(1)}</p>
                                    <div className="mt-1.5"><Stars value={avg} size={20} /></div>
                                    <p className="mt-1 text-sm text-ink-2">
                                        Based on {listing.rating_count} review{listing.rating_count === 1 ? '' : 's'}
                                    </p>

                                    <ul className="mt-5 space-y-2">
                                        {[5, 4, 3, 2, 1].map((n) => {
                                            const count = ratingBreakdown[n] ?? 0;

                                            return (
                                                <li key={n} className="flex items-center gap-3 text-xs font-semibold text-ink-2">
                                                    <span className="w-3 text-right">{n}</span>
                                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist-100">
                                                        <div
                                                            className="h-2 rounded-full bg-sun-500"
                                                            style={{ width: `${totalReviews ? (count / totalReviews) * 100 : 0}%` }}
                                                        />
                                                    </div>
                                                    <span className="w-5 text-ink-3">{count}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </>
                            ) : (
                                <div className="py-6 text-center">
                                    <p className="font-display text-lg font-extrabold text-pine-950">No reviews yet</p>
                                    <p className="mt-1 text-sm text-ink-2">
                                        Reviews appear after a buyer completes an order for this listing.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            {reviews.map((review) => (
                                <article key={review.id} className="ui-card p-5">
                                    <div className="flex items-start gap-3.5">
                                        <Avatar name={review.reviewer.name} url={review.reviewer.avatar_url} size={42} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                <span className="text-sm font-bold text-ink">{review.reviewer.name}</span>
                                                <span className="ui-chip bg-mist-100 text-pine-700">
                                                    <BadgeCheck size={13} /> Verified purchase
                                                </span>
                                                <span className="text-xs text-ink-3">{timeAgo(review.created_at)}</span>
                                            </div>
                                            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                                                <Stars value={review.product_rating} size={15} />
                                                <span className="text-xs text-ink-3">
                                                    Seller: {review.rating}/5
                                                </span>
                                            </div>

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
                            ))}
                        </div>
                    </div>
                </section>

                {sellerOtherListings.length > 0 && (
                    <Row title={`More from ${listing.seller.name}`}>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                            {sellerOtherListings.map((l) => <ListingCard key={l.id} listing={l} />)}
                        </div>
                    </Row>
                )}

                {similarListings.length > 0 && (
                    <Row title={`More in ${listing.category.name}`}>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                            {similarListings.slice(0, 8).map((l) => <ListingCard key={l.id} listing={l} />)}
                        </div>
                    </Row>
                )}

                {featuredListings.length > 0 && (
                    <Row title="Trending on campus">
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                            {featuredListings.slice(0, 8).map((l) => <ListingCard key={l.id} listing={l} />)}
                        </div>
                        <div className="mt-6 text-center">
                            <Link href="/marketplace" className="ui-btn ui-btn-outline">Keep browsing the marketplace</Link>
                        </div>
                    </Row>
                )}
            </Page>

            {zoom && images.length > 0 && (
                <Lightbox images={lightboxImages} start={active} onClose={() => setZoom(false)} />
            )}

            {dialog === 'order' && (
                <ConfirmDialog
                    tone="primary"
                    title="Confirm your order"
                    message={`You are ordering ${safeQty} × “${listing.title}” for ${formatPrice(total)}. The seller must confirm it, then you meet on campus and pay in person.`}
                    confirmLabel="Place order"
                    processing={busy}
                    onConfirm={placeOrder}
                    onClose={() => setDialog(null)}
                />
            )}

            {dialog === 'delete' && (
                <ConfirmDialog
                    title="Delete this listing?"
                    message="This permanently removes the listing and its photos. Listings with open orders cannot be deleted."
                    confirmLabel="Delete listing"
                    processing={busy}
                    onConfirm={deleteListing}
                    onClose={() => setDialog(null)}
                />
            )}

            {reporting && (
                <ReportModal
                    action={`/listings/${listing.id}/report`}
                    title="Report this listing"
                    reasons={reportReasons}
                    onClose={() => setReporting(false)}
                />
            )}

            {reviewing && reviewableOrder && (
                <ReviewModal
                    orderId={reviewableOrder.id}
                    sellerName={listing.seller.name}
                    listingTitle={listing.title}
                    onClose={() => setReviewing(false)}
                />
            )}
        </AppLayout>
    );
}
