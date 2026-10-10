import { Head, Link } from '@inertiajs/react';
import { Heart } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import ListingCard, { CardListing } from '../../components/ui/ListingCard';
import Pagination from '../../components/ui/Pagination';
import type { Paginated } from '../../types/shared';

interface Props {
    listings: Paginated<CardListing>;
}

export default function Index({ listings }: Props) {
    return (
        <AppLayout>
            <Head title="Favorites" />

            <div className="min-h-screen bg-[#F7F9F8] px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF4EF] text-[#176B4D]">
                            <Heart size={22} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-[#17352A]">
                                Favorites
                            </h1>
                            <p className="text-sm text-slate-500">
                                {listings.total} saved listing
                                {listings.total === 1 ? '' : 's'}
                            </p>
                        </div>
                    </div>

                    {listings.data.length > 0 ? (
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {listings.data.map((listing) => (
                                <ListingCard
                                    key={listing.id}
                                    listing={listing}
                                    favorited
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-[#DDE6E0] bg-white px-6 py-16 text-center">
                            <Heart
                                size={34}
                                className="mx-auto mb-3 text-slate-300"
                            />
                            <h2 className="text-lg font-bold text-[#17352A]">
                                No favorites yet
                            </h2>
                            <p className="mt-2 text-sm text-slate-500">
                                Tap the heart on any listing to save it here.
                            </p>
                            <Link
                                href="/marketplace"
                                className="mt-6 inline-flex rounded-xl bg-[#176B4D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#12583F]"
                            >
                                Browse marketplace
                            </Link>
                        </div>
                    )}

                    <Pagination links={listings.links} />
                </div>
            </div>
        </AppLayout>
    );
}
