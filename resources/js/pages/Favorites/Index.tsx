import { Head } from '@inertiajs/react';
import { Heart } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import EmptyState from '../../components/ui/EmptyState';
import ListingCard, { CardListing } from '../../components/ui/ListingCard';
import PageHeader, { Page } from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import type { Paginated } from '../../types/shared';

export default function Index({ listings }: { listings: Paginated<CardListing> }) {
    return (
        <AppLayout>
            <Head title="Favorites" />

            <Page>
                <PageHeader
                    icon={Heart}
                    title="Favorites"
                    subtitle={`${listings.total} saved listing${listings.total === 1 ? '' : 's'}`}
                />

                {listings.data.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                        {listings.data.map((listing) => (
                            <ListingCard key={listing.id} listing={listing} favorited />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={Heart}
                        title="No favorites yet"
                        text="Tap the heart on any listing to keep it here and come back to it later."
                        action={{ label: 'Browse the marketplace', href: '/marketplace' }}
                    />
                )}

                <Pagination links={listings.links} />
            </Page>
        </AppLayout>
    );
}
