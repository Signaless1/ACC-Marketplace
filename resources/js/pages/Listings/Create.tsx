import { Head } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import ListingForm, { FormLimits } from '../../components/listings/ListingForm';
import PageHeader, { Page } from '../../components/ui/PageHeader';

interface Props {
    categories: { id: number; name: string }[];
    limits: FormLimits;
}

export default function Create({ categories, limits }: Props) {
    return (
        <AppLayout>
            <Head title="Sell something" />

            <Page>
                <PageHeader
                    icon={Plus}
                    title="Sell something"
                    subtitle="Create a listing in a few minutes. It goes live right away."
                />
                <ListingForm mode="create" categories={categories} limits={limits} />
            </Page>
        </AppLayout>
    );
}
