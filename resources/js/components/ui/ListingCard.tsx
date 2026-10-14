import { Link, router } from '@inertiajs/react';
import { Heart, Package } from 'lucide-react';
import { formatPrice } from '../../types/shared';
import { RatingBadge } from './Stars';

export interface CardListing {
    id: number;
    title: string;
    price: string | number;
    quantity?: number;
    type: 'item' | 'service';
    status: 'available' | 'reserved' | 'sold';
    category: { id: number; name: string };
    images: { id: number; path: string }[];
    seller?: { id: number; name: string };
    rating_avg?: number | string | null;
    rating_count?: number;
    favorites_count?: number;
    views_count?: number;
}

interface ListingCardProps {
    listing: CardListing;
    /** When provided, a heart toggle is shown. */
    favorited?: boolean;
    /** Horizontal layout for list view. */
    layout?: 'grid' | 'row';
}

export default function ListingCard({ listing, favorited, layout = 'grid' }: ListingCardProps) {
    const toggleFavorite = (event: React.MouseEvent) => {
        event.preventDefault();
        router.post(`/listings/${listing.id}/favorite`, {}, { preserveScroll: true });
    };

    const unavailable = listing.status !== 'available';
    const low = !unavailable && (listing.quantity ?? 0) > 0 && (listing.quantity ?? 0) <= 3;
    const row = layout === 'row';

    return (
        <Link
            href={`/listings/${listing.id}`}
            className={`group ui-card overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pine-700/25 ${
                row ? 'flex' : 'block'
            }`}
        >
            <div
                className={`relative overflow-hidden bg-mist-100 ${
                    row ? 'h-auto w-40 shrink-0 sm:w-56' : 'aspect-[4/3]'
                }`}
            >
                {listing.images.length > 0 ? (
                    <img
                        src={`/storage/${listing.images[0].path}`}
                        alt={listing.title}
                        loading="lazy"
                        className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.04] ${
                            unavailable ? 'opacity-60 saturate-50' : ''
                        }`}
                    />
                ) : (
                    <div className="flex h-full min-h-[120px] w-full items-center justify-center">
                        <Package size={44} strokeWidth={1.4} className="text-mist-300" />
                    </div>
                )}

                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-pine-800 shadow-sm">
                    {listing.type === 'service' ? 'Service' : listing.category.name}
                </span>

                {unavailable && (
                    <span className="absolute inset-x-0 bottom-0 bg-pine-950/80 py-1.5 text-center text-xs font-bold uppercase tracking-wider text-white">
                        {listing.status === 'reserved' ? 'Reserved' : 'Sold out'}
                    </span>
                )}

                {favorited !== undefined && (
                    <button
                        type="button"
                        onClick={toggleFavorite}
                        aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                        aria-pressed={favorited}
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-ink-2 shadow-sm transition hover:scale-105 hover:text-red-500"
                    >
                        <Heart size={17} className={favorited ? 'fill-red-500 text-red-500' : ''} />
                    </button>
                )}
            </div>

            <div className={`min-w-0 p-4 ${row ? 'flex flex-1 flex-col justify-between' : ''}`}>
                <div>
                    <h3 className="line-clamp-2 min-h-[2.75rem] font-display text-[15px] font-bold leading-snug text-pine-950 transition group-hover:text-pine-700">
                        {listing.title}
                    </h3>

                    <div className="mt-2 flex items-center justify-between gap-2">
                        <RatingBadge average={listing.rating_avg} count={listing.rating_count} />
                        {listing.seller && (
                            <span className="truncate text-xs text-ink-3">{listing.seller.name}</span>
                        )}
                    </div>
                </div>

                <div className="mt-3 flex items-end justify-between gap-2">
                    <p className="font-display text-xl font-extrabold text-pine-900">
                        {formatPrice(listing.price)}
                    </p>

                    {low && (
                        <span className="ui-chip shrink-0 whitespace-nowrap bg-sun-300/45 text-sun-800">
                            Only {listing.quantity} left
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
