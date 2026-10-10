import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Flag,
    Heart,
    MapPin,
    MessageCircle,
    Minus,
    Plus,
    Share2,
    ShieldCheck,
    ShoppingBag,
    Star,
    Store,
} from 'lucide-react';
import { useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import Avatar from '../../components/ui/Avatar';
import ImagePlaceholder from '../../components/ui/ImagePlaceholder';
import ListingCard, { CardListing } from '../../components/ui/ListingCard';
import Modal from '../../components/ui/Modal';
import RatingStars from '../../components/ui/RatingStars';
import RatingSummary from '../../components/ui/RatingSummary';
import ReportModal from '../../components/ui/ReportModal';
import ReviewForm from '../../components/ui/ReviewForm';
import ReviewList, { ReviewItem } from '../../components/ui/ReviewList';
import { formatDate, formatPrice } from '../../types/shared';

interface Listing {
    id: number;
    title: string;
    description: string;
    price: number | string;
    quantity: number;
    type: 'item' | 'service';
    status: 'available' | 'reserved' | 'sold';
    condition: string | null;
    hidden_at: string | null;
    removed_reason: string | null;
    removed_note: string | null;
    views_count: number;
    category: { id: number; name: string };
    seller: { id: number; name: string; avatar_url: string | null; created_at: string };
    images: { id: number; path: string; sort_order: number }[];
    created_at: string;
}

interface Props {
    listing: Listing;
    canEdit: boolean;
    isFavorited: boolean;
    sellerRating: { average: number | null; count: number };
    sellerStats: { active_listings: number; completed_sales: number };
    productRating: { average: number | null; count: number; distribution: Record<string, number> };
    reviews: ReviewItem[];
    reviewableOrderId: number | null;
    listingReviewOrderId: number | null;
    fromSeller: CardListing[];
    similar: CardListing[];
    discover: CardListing[];
    favoriteIds: number[];
    reportReasons: Record<string, string>;
    removalReasons?: Record<string, string>;
}

function Row({
    title,
    subtitle,
    items,
    favoriteIds,
    action,
}: {
    title: string;
    subtitle?: string;
    items: CardListing[];
    favoriteIds: number[];
    action?: { href: string; label: string };
}) {
    if (items.length === 0) return null;

    return (
        <section className="mt-12">
            <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                    <h2 className="font-sans text-xl font-bold text-[#12291f]">{title}</h2>
                    {subtitle && <p className="mt-0.5 text-sm text-[#43554c]">{subtitle}</p>}
                </div>
                {action && (
                    <Link
                        href={action.href}
                        className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#176B4D] hover:underline"
                    >
                        {action.label}
                        <ChevronRight size={16} />
                    </Link>
                )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {items.slice(0, 4).map((item) => (
                    <ListingCard key={item.id} listing={item} favorited={favoriteIds.includes(item.id)} />
                ))}
            </div>
        </section>
    );
}

export default function Show({
    listing,
    canEdit,
    isFavorited,
    sellerRating,
    sellerStats,
    productRating,
    reviews,
    reviewableOrderId,
    listingReviewOrderId,
    fromSeller,
    similar,
    discover,
    favoriteIds,
    reportReasons,
}: Props) {
    const [activeImage, setActiveImage] = useState(0);
    const [reporting, setReporting] = useState(false);
    const [ordering, setOrdering] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [placing, setPlacing] = useState(false);
    const [copied, setCopied] = useState(false);

    const mainImage = listing.images[activeImage] ?? listing.images[0];
    const maxQty = Math.max(1, listing.quantity);
    const total = Number(listing.price) * quantity;
    const sellerFirst = listing.seller.name.split(' ')[0];

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            window.prompt('Copy this link:', window.location.href);
        }
    };

    const placeOrder = () => {
        router.post(
            `/listings/${listing.id}/order`,
            { quantity },
            {
                onStart: () => setPlacing(true),
                onFinish: () => {
                    setPlacing(false);
                    setOrdering(false);
                },
            },
        );
    };

    const handleDelete = () => {
        if (window.confirm('Delete this listing? This cannot be undone.')) {
            router.delete(`/listings/${listing.id}`);
        }
    };

    const stock =
        listing.status !== 'available' ? null : listing.quantity <= 3 ? (
            <span className="rounded-full bg-[#fcebe3] px-2.5 py-1 text-xs font-bold text-[#b44a27]">
                Only {listing.quantity} left
            </span>
        ) : (
            <span className="rounded-full bg-[#EAF4EF] px-2.5 py-1 text-xs font-bold text-[#12583F]">
                {listing.quantity} in stock
            </span>
        );

    return (
        <AppLayout>
            <Head title={listing.title} />

            <div className="mx-auto max-w-6xl">
                <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-[#43554c]">
                    <Link href="/marketplace" className="font-semibold hover:text-[#176B4D]">
                        Marketplace
                    </Link>
                    <ChevronRight size={14} />
                    <Link
                        href={`/marketplace?category=${listing.category.id}`}
                        className="font-semibold hover:text-[#176B4D]"
                    >
                        {listing.category.name}
                    </Link>
                    <ChevronRight size={14} />
                    <span className="line-clamp-1 text-[#12291f]">{listing.title}</span>
                </nav>

                {listing.hidden_at && canEdit && (
                    <div className="mb-5 flex gap-3 rounded-2xl border border-[#f0c4b2] bg-[#fcebe3] p-4 text-sm text-[#7d2f14]">
                        <AlertTriangle className="mt-0.5 shrink-0" size={20} />
                        <div>
                            <p className="font-bold">This listing was removed by a moderator</p>
                            <p className="mt-0.5">
                                Reason:{' '}
                                <strong>
                                    {listing.removed_reason ? humanize(listing.removed_reason) : 'Not specified'}
                                </strong>
                                . Only you and moderators can see it.
                            </p>
                            {listing.removed_note && <p className="mt-1">“{listing.removed_note}”</p>}
                        </div>
                    </div>
                )}

                <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                    {/* Gallery */}
                    <div>
                        <div className="aspect-[4/3] overflow-hidden rounded-3xl border border-[#E1E9E4] bg-white shadow-sm">
                            {mainImage ? (
                                <img
                                    src={`/storage/${mainImage.path}`}
                                    alt={listing.title}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <ImagePlaceholder label="No photo for this listing" size={44} />
                            )}
                        </div>

                        {listing.images.length > 1 && (
                            <div className="mt-3 grid grid-cols-5 gap-3">
                                {listing.images.map((image, index) => (
                                    <button
                                        type="button"
                                        key={image.id}
                                        onClick={() => setActiveImage(index)}
                                        aria-label={`Show image ${index + 1}`}
                                        aria-pressed={index === activeImage}
                                        className={`aspect-square overflow-hidden rounded-xl bg-white ring-2 transition ${
                                            index === activeImage
                                                ? 'ring-[#176B4D]'
                                                : 'ring-transparent hover:ring-[#BFD8CA]'
                                        }`}
                                    >
                                        <img
                                            src={`/storage/${image.path}`}
                                            alt=""
                                            loading="lazy"
                                            className="h-full w-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            {[
                                { icon: ShieldCheck, t: 'ACC students only', d: 'Every seller is a verified student' },
                                { icon: MapPin, t: 'Meet on campus', d: 'Trade in a safe, public place' },
                                { icon: Flag, t: 'Report a problem', d: 'We review every report' },
                            ].map(({ icon: Icon, t, d }) => (
                                <div key={t} className="flex gap-3 rounded-2xl bg-[#F3F8F5] p-3.5">
                                    <Icon size={20} className="mt-0.5 shrink-0 text-[#176B4D]" />
                                    <div>
                                        <p className="text-sm font-bold text-[#12291f]">{t}</p>
                                        <p className="text-xs text-[#43554c]">{d}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Buy box */}
                    <div className="surface-card self-start p-6 lg:sticky lg:top-24">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                                    listing.status === 'available'
                                        ? 'bg-emerald-50 text-emerald-800'
                                        : listing.status === 'reserved'
                                          ? 'bg-amber-50 text-amber-800'
                                          : 'bg-slate-100 text-slate-700'
                                }`}
                            >
                                {listing.status}
                            </span>
                            <span className="rounded-full bg-[#F3F8F5] px-3 py-1 text-xs font-semibold text-[#34483e]">
                                {listing.type === 'item' ? 'Item' : 'Service'}
                            </span>
                            {stock}
                        </div>

                        <h1 className="mt-4 font-sans text-2xl font-bold leading-tight text-[#12291f] sm:text-3xl">
                            {listing.title}
                        </h1>

                        <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm">
                            {productRating.average !== null ? (
                                <>
                                    <RatingStars value={productRating.average} size={16} />
                                    <span className="font-bold text-[#12291f]">{productRating.average.toFixed(1)}</span>
                                    <span className="text-[#43554c] underline-offset-2 hover:underline">
                                        {productRating.count} rating{productRating.count === 1 ? '' : 's'}
                                    </span>
                                </>
                            ) : (
                                <span className="text-[#43554c]">No ratings yet</span>
                            )}
                        </a>

                        <p className="mt-4 font-sans text-3xl font-extrabold text-[#176B4D]">
                            {formatPrice(listing.price)}
                            {listing.type === 'item' && listing.quantity > 1 && (
                                <span className="ml-2 text-sm font-medium text-[#43554c]">each</span>
                            )}
                        </p>

                        <dl className="mt-5 grid grid-cols-2 gap-4 border-y border-[#E7EEE9] py-4 text-sm">
                            <div>
                                <dt className="text-xs font-bold uppercase tracking-wide text-[#566860]">Category</dt>
                                <dd className="mt-1 font-semibold text-[#12291f]">{listing.category.name}</dd>
                            </div>
                            {listing.condition && (
                                <div>
                                    <dt className="text-xs font-bold uppercase tracking-wide text-[#566860]">
                                        Condition
                                    </dt>
                                    <dd className="mt-1 font-semibold text-[#12291f]">{listing.condition}</dd>
                                </div>
                            )}
                        </dl>

                        {/* Buyer actions */}
                        {!canEdit && (
                            <div className="mt-5">
                                {listing.status === 'available' && (
                                    <>
                                        <div className="mb-4 flex items-center justify-between">
                                            <span className="text-sm font-bold text-[#12291f]">Quantity</span>
                                            <div className="inline-flex items-center rounded-xl border border-[#cfdcd4] bg-white">
                                                <button
                                                    type="button"
                                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                                    disabled={quantity <= 1}
                                                    aria-label="Decrease quantity"
                                                    className="flex h-10 w-10 items-center justify-center text-[#34483e] hover:bg-[#EAF4EF] disabled:opacity-40"
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span
                                                    aria-live="polite"
                                                    className="w-12 text-center text-sm font-bold text-[#12291f]"
                                                >
                                                    {quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                                                    disabled={quantity >= maxQty}
                                                    aria-label="Increase quantity"
                                                    className="flex h-10 w-10 items-center justify-center text-[#34483e] hover:bg-[#EAF4EF] disabled:opacity-40"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setOrdering(true)}
                                            className="accent-btn flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 font-bold"
                                        >
                                            <ShoppingBag size={19} />
                                            Order now · {formatPrice(total)}
                                        </button>
                                    </>
                                )}

                                {listing.status === 'reserved' && (
                                    <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-5 py-3.5 font-bold text-amber-800">
                                        <ShoppingBag size={19} />
                                        Currently reserved
                                    </div>
                                )}

                                {listing.status === 'sold' && (
                                    <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 py-3.5 font-bold text-slate-700">
                                        <CheckCircle2 size={19} />
                                        Sold out
                                    </div>
                                )}

                                <Link
                                    href={`/listings/${listing.id}/message`}
                                    method="post"
                                    as="button"
                                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#176B4D] bg-white px-5 py-3 font-bold text-[#176B4D] transition hover:bg-[#EAF4EF]"
                                >
                                    <MessageCircle size={19} />
                                    Message {sellerFirst}
                                </Link>
                            </div>
                        )}

                        {/* Owner actions */}
                        {canEdit && (
                            <div className="mt-5 space-y-3">
                                <div className="rounded-xl bg-[#F3F8F5] p-3 text-sm text-[#34483e]">
                                    {listing.views_count} view{listing.views_count === 1 ? '' : 's'} ·{' '}
                                    {listing.quantity} unit{listing.quantity === 1 ? '' : 's'} left
                                </div>
                                <Link
                                    href={`/listings/${listing.id}/edit`}
                                    className="flex w-full items-center justify-center rounded-xl bg-[#176B4D] px-5 py-3 font-bold text-white transition hover:bg-[#12583F]"
                                >
                                    Edit listing
                                </Link>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="flex w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 px-5 py-3 font-bold text-red-700 transition hover:bg-red-100"
                                >
                                    Delete listing
                                </button>
                            </div>
                        )}

                        <div className="mt-5 flex flex-wrap gap-2">
                            {!canEdit && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.post(`/listings/${listing.id}/favorite`, {}, { preserveScroll: true })
                                    }
                                    aria-pressed={isFavorited}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce6e0] px-3 py-2 text-xs font-bold text-[#34483e] transition hover:bg-[#F3F8F5]"
                                >
                                    <Heart size={15} className={isFavorited ? 'fill-red-500 text-red-500' : ''} />
                                    {isFavorited ? 'Saved' : 'Save'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={copyLink}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce6e0] px-3 py-2 text-xs font-bold text-[#34483e] transition hover:bg-[#F3F8F5]"
                            >
                                <Share2 size={15} />
                                {copied ? 'Link copied!' : 'Share'}
                            </button>
                            {!canEdit && (
                                <button
                                    type="button"
                                    onClick={() => setReporting(true)}
                                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-[#566860] transition hover:bg-red-50 hover:text-red-700"
                                >
                                    <Flag size={14} />
                                    Report
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Seller */}
                <section className="surface-card mt-10 flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
                    <Avatar name={listing.seller.name} url={listing.seller.avatar_url} size={64} />

                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#566860]">Sold by</p>
                        <Link
                            href={`/users/${listing.seller.id}`}
                            className="font-sans text-lg font-bold text-[#12291f] hover:text-[#176B4D]"
                        >
                            {listing.seller.name}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#43554c]">
                            {sellerRating.average !== null ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <RatingStars value={sellerRating.average} size={14} />
                                    <strong className="text-[#12291f]">{sellerRating.average.toFixed(1)}</strong>(
                                    {sellerRating.count})
                                </span>
                            ) : (
                                <span>No seller reviews yet</span>
                            )}
                            <span className="inline-flex items-center gap-1.5">
                                <CalendarDays size={14} />
                                Member since {formatDate(listing.seller.created_at)}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="rounded-xl bg-[#F3F8F5] px-5 py-3">
                            <p className="font-sans text-xl font-bold text-[#12291f]">{sellerStats.active_listings}</p>
                            <p className="text-xs text-[#43554c]">Listings</p>
                        </div>
                        <div className="rounded-xl bg-[#F3F8F5] px-5 py-3">
                            <p className="font-sans text-xl font-bold text-[#12291f]">{sellerStats.completed_sales}</p>
                            <p className="text-xs text-[#43554c]">Sales</p>
                        </div>
                    </div>

                    <Link
                        href={`/users/${listing.seller.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#cfdcd4] px-4 py-2.5 text-sm font-bold text-[#34483e] hover:bg-[#F3F8F5]"
                    >
                        <Store size={16} />
                        Visit shop
                    </Link>
                </section>

                {/* Description */}
                <section className="surface-card mt-6 p-6">
                    <h2 className="font-sans text-xl font-bold text-[#12291f]">About this {listing.type}</h2>
                    <p className="mt-3 whitespace-pre-line break-words leading-7 text-[#2f4a3d]">
                        {listing.description}
                    </p>

                    <h3 className="mt-6 font-sans text-sm font-bold uppercase tracking-wide text-[#566860]">
                        Details
                    </h3>
                    <dl className="mt-3 divide-y divide-[#E7EEE9] rounded-xl border border-[#E7EEE9] text-sm">
                        {[
                            ['Category', listing.category.name],
                            ['Type', listing.type === 'item' ? 'Item' : 'Service'],
                            ['Condition', listing.condition ?? 'Not specified'],
                            ['Available units', String(listing.quantity)],
                            ['Posted', formatDate(listing.created_at)],
                        ].map(([k, v]) => (
                            <div key={k} className="grid grid-cols-[140px_1fr] gap-3 px-4 py-2.5">
                                <dt className="font-semibold text-[#43554c]">{k}</dt>
                                <dd className="text-[#12291f]">{v}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                {/* Reviews & comments */}
                <section id="reviews" className="surface-card mt-6 scroll-mt-24 p-6">
                    <div className="mb-5 flex items-center gap-2">
                        <Star size={20} className="fill-amber-400 text-amber-400" />
                        <h2 className="font-sans text-xl font-bold text-[#12291f]">Ratings &amp; comments</h2>
                    </div>

                    {productRating.average !== null && (
                        <div className="mb-6">
                            <RatingSummary
                                average={productRating.average}
                                count={productRating.count}
                                distribution={productRating.distribution}
                            />
                        </div>
                    )}

                    {listingReviewOrderId && (
                        <div className="mb-6 rounded-2xl border border-[#cfe3d8] bg-[#F6FAF7] p-5">
                            <h3 className="mb-3 font-sans text-base font-bold text-[#12291f]">
                                You bought this. How was it?
                            </h3>
                            <ReviewForm
                                sellerName={listing.seller.name}
                                orders={[{ id: listingReviewOrderId, listing: { id: listing.id, title: listing.title } }]}
                            />
                        </div>
                    )}

                    {!listingReviewOrderId && reviewableOrderId && (
                        <Link
                            href={`/users/${listing.seller.id}?order=${reviewableOrderId}#leave-review`}
                            className="mb-6 inline-flex rounded-xl bg-[#176B4D] px-4 py-2 text-sm font-bold text-white hover:bg-[#12583F]"
                        >
                            Review your purchase from {sellerFirst}
                        </Link>
                    )}

                    <ReviewList reviews={reviews} canReply={canEdit} />
                </section>

                <Row
                    title={`More from ${sellerFirst}`}
                    subtitle="Other listings from this seller"
                    items={fromSeller}
                    favoriteIds={favoriteIds}
                    action={{ href: `/users/${listing.seller.id}`, label: 'See all' }}
                />
                <Row
                    title="Similar items"
                    subtitle={`More in ${listing.category.name}`}
                    items={similar}
                    favoriteIds={favoriteIds}
                    action={{ href: `/marketplace?category=${listing.category.id}`, label: 'Browse category' }}
                />
                <Row
                    title="You might also like"
                    subtitle="Keep browsing the marketplace"
                    items={discover}
                    favoriteIds={favoriteIds}
                    action={{ href: '/marketplace', label: 'View everything' }}
                />
            </div>

            {ordering && (
                <Modal title="Confirm your order" onClose={() => setOrdering(false)}>
                    <div className="space-y-4 text-sm text-[#2f4a3d]">
                        <div className="flex items-center gap-3 rounded-xl bg-[#F3F8F5] p-3">
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                                {mainImage ? (
                                    <img src={`/storage/${mainImage.path}`} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <ImagePlaceholder size={20} />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="line-clamp-2 font-bold text-[#12291f]">{listing.title}</p>
                                <p>
                                    {quantity} × {formatPrice(listing.price)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-[#E7EEE9] pt-3 text-base">
                            <span className="font-semibold">Total</span>
                            <span className="font-sans text-xl font-extrabold text-[#176B4D]">{formatPrice(total)}</span>
                        </div>
                        <p className="text-xs text-[#43554c]">
                            This sends an order request to {listing.seller.name}. You pay in person when you meet.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setOrdering(false)}
                                className="rounded-xl border border-[#cfdcd4] px-4 py-2.5 font-semibold text-[#34483e] hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={placeOrder}
                                disabled={placing}
                                className="accent-btn rounded-xl px-5 py-2.5 font-bold"
                            >
                                {placing ? 'Placing…' : 'Place order'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {reporting && (
                <ReportModal
                    action={`/listings/${listing.id}/report`}
                    title="Report this listing"
                    reasons={reportReasons}
                    onClose={() => setReporting(false)}
                />
            )}
        </AppLayout>
    );
}

function humanize(key: string) {
    return key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
