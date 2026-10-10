import { Link, router } from '@inertiajs/react';
import { Heart, Star, Tag } from 'lucide-react';
import { formatPrice, RatingFields } from '../../types/shared';
import ImagePlaceholder from './ImagePlaceholder';

export interface CardListing extends RatingFields {
    id: number;
    title: string;
    price: string | number;
    quantity?: number;
    type: 'item' | 'service';
    status: 'available' | 'reserved' | 'sold';
    category: { id: number; name: string };
    images: { id: number; path: string }[];
}

interface ListingCardProps {
    listing: CardListing;
    /** When provided, a heart toggle is shown. */
    favorited?: boolean;
    layout?: 'grid' | 'list';
}

export function RatingLine({ listing }: { listing: RatingFields }) {
    const count = listing.rating_count ?? 0;
    const avg = Number(listing.rating_average ?? 0);

    if (count === 0) {
        return <span className="text-xs font-medium text-[#566860]">No ratings yet</span>;
    }

    return (
        <span className="inline-flex items-center gap-1 text-xs text-[#43554c]">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            <span className="font-bold text-[#12291f]">{avg.toFixed(1)}</span>
            <span>({count})</span>
        </span>
    );
}

export default function ListingCard({ listing, favorited, layout = 'grid' }: ListingCardProps) {
    const toggleFavorite = (event: React.MouseEvent) => {
        event.preventDefault();
        router.post(`/listings/${listing.id}/favorite`, {}, { preserveScroll: true });
    };

    const lowStock =
        listing.status === 'available' &&
        listing.quantity !== undefined &&
        listing.quantity > 0 &&
        listing.quantity <= 3;

    const list = layout === 'list';

    return (
        <Link
            href={`/listings/${listing.id}`}
            className={`group overflow-hidden rounded-2xl border border-[#E1E9E4] bg-white shadow-sm transition duration-200 hover:shadow-lg ${
                list ? 'flex' : 'flex flex-col hover:-translate-y-1'
            }`}
        >
            <div
                className={`relative overflow-hidden bg-slate-100 ${
                    list ? 'h-40 w-40 shrink-0 sm:h-48 sm:w-56' : 'aspect-[4/3]'
                }`}
            >
                {listing.images.length > 0 ? (
                    <img
                        src={`/storage/${listing.images[0].path}`}
                        alt={listing.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                ) : (
                    <ImagePlaceholder />
                )}

                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#34483e] shadow-sm">
                    {listing.type === 'item' ? 'Item' : 'Service'}
                </span>

                {listing.status !== 'available' && (
                    <span className="absolute bottom-3 left-3 rounded-full bg-[#12291f]/90 px-2.5 py-1 text-xs font-semibold capitalize text-white">
                        {listing.status}
                    </span>
                )}

                {favorited !== undefined && (
                    <button
                        type="button"
                        onClick={toggleFavorite}
                        aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                        aria-pressed={favorited}
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#43554c] shadow-sm transition hover:text-red-500"
                    >
                        <Heart size={17} className={favorited ? 'fill-red-500 text-red-500' : ''} />
                    </button>
                )}
            </div>

            <div className={`flex flex-1 flex-col p-4 ${list ? 'justify-between sm:p-5' : ''}`}>
                <div>
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs text-[#566860]">
                        <Tag size={13} />
                        {listing.category.name}
                    </div>

                    <h3
                        className={`line-clamp-2 font-semibold text-[#12291f] transition group-hover:text-[#176B4D] ${
                            list ? 'text-lg' : 'min-h-[44px] text-base'
                        }`}
                    >
                        {listing.title}
                    </h3>

                    <div className="mt-2">
                        <RatingLine listing={listing} />
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-lg font-bold text-[#12291f]">{formatPrice(listing.price)}</p>

                    {lowStock && (
                        <span className="rounded-full bg-[#fcebe3] px-2 py-0.5 text-[11px] font-bold text-[#b44a27]">
                            Only {listing.quantity} left
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
