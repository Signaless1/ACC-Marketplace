import { Link } from '@inertiajs/react';
import { Package, Plus } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';

interface Category {
    id: number;
    name: string;
}

interface ListingImage {
    id: number;
    path: string;
    sort_order: number;
}

interface Listing {
    id: number;
    title: string;
    price: string;
    type: 'item' | 'service';
    status: 'available' | 'reserved' | 'sold';
    category: Category;
    images: ListingImage[];
}

interface ListingsProps {
    listings: {
        data: Listing[];
        current_page: number;
        last_page: number;
        total: number;
    };
    status?: 'available' | 'reserved' | 'sold' | null;
}

const STATUS_FILTERS = [
    { label: 'All', value: '' },
    { label: 'Available', value: 'available' },
    { label: 'Reserved', value: 'reserved' },
    { label: 'Sold', value: 'sold' },
];

export default function Index({ listings, status }: ListingsProps) {
    return (
        <AppLayout>
            <div className="min-h-full bg-[#F7FAF7]">
                <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
                    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-[#17352A]">
                                My Listings
                            </h1>

                            <p className="mt-2 text-sm text-[#5F7168]">
                                Manage the items and services you have posted.
                            </p>
                        </div>

                        <Link
                            href="/listings/create"
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#176B4D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#12583F]"
                        >
                            <Plus size={18} />
                            Create Listing
                        </Link>
                    </div>

                    <nav
                        aria-label="Filter by status"
                        className="mb-6 flex flex-wrap gap-2"
                    >
                        {STATUS_FILTERS.map((f) => {
                            const active = (status ?? '') === f.value;

                            return (
                                <Link
                                    key={f.value}
                                    href={
                                        f.value
                                            ? `/listings?status=${f.value}`
                                            : '/listings'
                                    }
                                    aria-current={active ? 'page' : undefined}
                                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                                        active
                                            ? 'bg-[#176B4D] text-white'
                                            : 'border border-[#DDE6E0] bg-white text-[#5F7168] hover:bg-[#EAF4EF]'
                                    }`}
                                >
                                    {f.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {listings.data.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#CBD8D1] bg-white px-6 py-16 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF4EF] text-[#176B4D]">
                                <Package size={30} />
                            </div>

                            <h2 className="mt-5 text-lg font-bold text-[#263D34]">
                                {status
                                    ? `No ${status} listings`
                                    : 'You have no listings yet'}
                            </h2>

                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#65766D]">
                                Create your first listing to start selling
                                items or offering services to other ACC
                                students.
                            </p>

                            <Link
                                href="/listings/create"
                                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#176B4D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#12583F]"
                            >
                                <Plus size={17} />
                                Create Your First Listing
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="mb-5 flex items-center justify-between">
                                <p className="text-sm font-medium text-[#5F7168]">
                                    {listings.total}{' '}
                                    {listings.total === 1
                                        ? 'listing'
                                        : 'listings'}
                                </p>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {listings.data.map((listing) => (
                                    <Link
                                        key={listing.id}
                                        href={`/listings/${listing.id}`}
                                        className="group block overflow-hidden rounded-2xl border border-[#E1E9E4] bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#C8D8CF] hover:shadow-md"
                                    >
                                        <div className="flex h-44 items-center justify-center bg-[#EEF4F0]">
                                            {listing.images.length > 0 ? (
                                                <img
                                                    src={`/storage/${listing.images[0].path}`}
                                                    alt={listing.title}
                                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                                                />
                                            ) : (
                                                <Package
                                                    size={45}
                                                    strokeWidth={1.4}
                                                    className="text-[#91A69A]"
                                                />
                                            )}
                                        </div>

                                        <div className="p-5">
                                            <div className="mb-2 flex items-center justify-between gap-3">
                                                <span className="text-xs font-medium text-[#65766D]">
                                                    {listing.category.name}
                                                </span>

                                                <span className="rounded-full bg-[#EAF4EF] px-2.5 py-1 text-xs font-semibold capitalize text-[#176B4D]">
                                                    {listing.status}
                                                </span>
                                            </div>

                                            <h2 className="line-clamp-2 min-h-12 font-bold text-[#263D34] transition group-hover:text-[#176B4D]">
                                                {listing.title}
                                            </h2>

                                            <div className="mt-4 flex items-end justify-between">
                                                <div>
                                                    <p className="text-xs text-[#7A8982]">
                                                        Price
                                                    </p>

                                                    <p className="mt-1 text-lg font-bold text-[#176B4D]">
                                                        ₱{listing.price}
                                                    </p>
                                                </div>

                                                <span className="text-xs font-semibold uppercase text-[#718179]">
                                                    {listing.type}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}