import { Head } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import ListingForm, { FormLimits } from '../../components/listings/ListingForm';
import PageHeader, { Page } from '../../components/ui/PageHeader';

interface Props {
    listing: {
        id: number;
        category_id: number;
        title: string;
        description: string;
        price: string;
        quantity: number;
        type: 'item' | 'service';
        condition: string | null;
        images: { id: number; path: string }[];
    };
    categories: { id: number; name: string }[];
    limits: FormLimits;
}

export default function Edit({ listing, categories, limits }: Props) {
    return (
        <AppLayout>
            <Head title={`Edit ${listing.title}`} />

            <Page>
                <PageHeader
                    icon={Pencil}
                    title="Edit listing"
                    subtitle="Changes are visible to buyers as soon as you save."
                />
                <ListingForm mode="edit" categories={categories} limits={limits} listing={listing} />
            </Page>
        </AppLayout>
    );
}
