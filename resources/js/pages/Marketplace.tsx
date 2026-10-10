import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    ChevronDown,
    Filter,
    Grid2X2,
    List,
    Search,
    ShoppingBag,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import AppLayout from '../Layouts/AppLayout';
import ListingCard, { CardListing } from '../components/ui/ListingCard';
import Pagination from '../components/ui/Pagination';
import SiteImage from '../components/ui/SiteImage';
import { siteImages } from '../config/siteImages';
import { Paginated } from '../types/shared';

interface Category {
    id: number;
    name: string;
}

type Listing = CardListing & { seller?: { id: number; name: string } };

interface Filters {
    q: string;
    category: string | number;
    type: string;
    min_price: string;
    max_price: string;
    availability: 'available' | 'all';
    sort: 'newest' | 'oldest' | 'price_asc' | 'price_desc';
}

interface MarketplaceProps {
    categories: Category[];
    listings: Paginated<Listing>;
    favoriteIds: number[];
    filters: Filters;
}

const inputClass =
    'w-full rounded-lg border border-[#DDE6E0] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#176B4D]';

export default function Marketplace({
    categories,
    listings,
    favoriteIds,
    filters,
}: MarketplaceProps) {
    const [form, setForm] = useState<Filters>(filters);
    const [showFilters, setShowFilters] = useState(
        Boolean(
            filters.type ||
                filters.min_price ||
                filters.max_price ||
                filters.availability === 'all',
        ),
    );
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const apply = (next: Filters) => {
        const params: Record<string, string> = {};

        if (next.q.trim()) params.q = next.q.trim();
        if (next.category) params.category = String(next.category);
        if (next.type) params.type = next.type;
        if (next.min_price !== '') params.min_price = String(next.min_price);
        if (next.max_price !== '') params.max_price = String(next.max_price);
        if (next.availability !== 'available') params.availability = next.availability;
        if (next.sort !== 'newest') params.sort = next.sort;

        router.get('/marketplace', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const update = (patch: Partial<Filters>, submit = false) => {
        const next = { ...form, ...patch };
        setForm(next);

        if (submit) apply(next);
    };

    const submitSearch = (event: FormEvent) => {
        event.preventDefault();
        apply(form);
    };

    const clearAll = () => {
        const cleared: Filters = {
            q: '',
            category: '',
            type: '',
            min_price: '',
            max_price: '',
            availability: 'available',
            sort: 'newest',
        };
        setForm(cleared);
        apply(cleared);
    };

    const hasActiveFilters =
        filters.q !== '' ||
        filters.category !== '' ||
        filters.type !== '' ||
        filters.min_price !== '' ||
        filters.max_price !== '' ||
        filters.availability !== 'available';

    return (
        <AppLayout>
            <Head title="Marketplace" />

            <div className="min-h-screen bg-[#F7F9F8]">
                <section className="relative overflow-hidden border-b border-[#E1E9E4] bg-white">
                    <SiteImage
                        name={siteImages.marketplaceBanner}
                        alt=""
                        className="absolute inset-0 hidden opacity-[0.16] lg:block"
                        imageClassName="object-right"
                    />
                    <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-8">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#EAF4EF] px-3 py-1.5 text-xs font-semibold text-[#176B4D]">
                                    <ShoppingBag size={14} />
                                    ACC Marketplace
                                </div>

                                <h1 className="text-3xl font-bold tracking-tight text-[#17352A] sm:text-4xl">
                                    Buy, sell, and discover
                                </h1>

                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                                    Find items and services offered by other
                                    ACC students.
                                </p>
                            </div>

                            <Link
                                href="/listings/create"
                                className="accent-btn inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
                            >
                                Sell Something
                                <ArrowRight size={17} />
                            </Link>
                        </div>

                        <form
                            onSubmit={submitSearch}
                            className="mt-8 flex flex-col gap-3 lg:flex-row"
                            role="search"
                        >
                            <div className="relative flex-1">
                                <Search
                                    size={19}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    type="search"
                                    value={form.q}
                                    onChange={(e) => update({ q: e.target.value })}
                                    placeholder="Search by title, description, category or seller…"
                                    aria-label="Search listings"
                                    className="w-full rounded-xl border border-[#DDE6E0] bg-white py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#176B4D] focus:ring-2 focus:ring-[#176B4D]/10"
                                />
                            </div>

                            <button
                                type="submit"
                                className="rounded-xl bg-[#176B4D] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#12583F]"
                            >
                                Search
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowFilters((v) => !v)}
                                aria-expanded={showFilters}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DDE6E0] bg-white px-5 py-3.5 text-sm font-medium text-slate-600 transition hover:border-[#176B4D] hover:text-[#176B4D]"
                            >
                                <SlidersHorizontal size={18} />
                                Filters
                            </button>
                        </form>

                        {showFilters && (
                            <div className="mt-4 grid gap-4 rounded-xl border border-[#E1E9E4] bg-[#FBFCFB] p-4 sm:grid-cols-2 lg:grid-cols-4">
                                <label className="block">
                                    <span className="mb-1 block text-xs font-medium text-slate-500">
                                        Type
                                    </span>
                                    <select
                                        value={form.type}
                                        onChange={(e) =>
                                            update({ type: e.target.value }, true)
                                        }
                                        className={inputClass}
                                    >
                                        <option value="">Items &amp; services</option>
                                        <option value="item">Items only</option>
                                        <option value="service">Services only</option>
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="mb-1 block text-xs font-medium text-slate-500">
                                        Availability
                                    </span>
                                    <select
                                        value={form.availability}
                                        onChange={(e) =>
                                            update(
                                                {
                                                    availability: e.target
                                                        .value as Filters['availability'],
                                                },
                                                true,
                                            )
                                        }
                                        className={inputClass}
                                    >
                                        <option value="available">Available only</option>
                                        <option value="all">Include reserved &amp; sold</option>
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="mb-1 block text-xs font-medium text-slate-500">
                                        Min price (₱)
                                    </span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={form.min_price}
                                        onChange={(e) =>
                                            update({ min_price: e.target.value })
                                        }
                                        onBlur={() => apply(form)}
                                        className={inputClass}
                                        placeholder="0"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-1 block text-xs font-medium text-slate-500">
                                        Max price (₱)
                                    </span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={form.max_price}
                                        onChange={(e) =>
                                            update({ max_price: e.target.value })
                                        }
                                        onBlur={() => apply(form)}
                                        className={inputClass}
                                        placeholder="Any"
                                    />
                                </label>
                            </div>
                        )}
                    </div>
                </section>

                <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-[#17352A]">
                                Browse Listings
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                {listings.total} listing
                                {listings.total === 1 ? '' : 's'} found
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={clearAll}
                                        className="ml-3 inline-flex items-center gap-1 font-semibold text-[#176B4D] hover:underline"
                                    >
                                        <X size={13} />
                                        Clear filters
                                    </button>
                                )}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <select
                                    value={form.sort}
                                    onChange={(e) =>
                                        update(
                                            { sort: e.target.value as Filters['sort'] },
                                            true,
                                        )
                                    }
                                    aria-label="Sort listings"
                                    className="appearance-none rounded-lg border border-[#DDE6E0] bg-white py-2 pl-3.5 pr-9 text-sm font-medium text-slate-600 outline-none transition focus:border-[#176B4D]"
                                >
                                    <option value="newest">Newest</option>
                                    <option value="oldest">Oldest</option>
                                    <option value="price_asc">Price: Low to High</option>
                                    <option value="price_desc">Price: High to Low</option>
                                </select>

                                <ChevronDown
                                    size={16}
                                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                            </div>

                            <div className="flex overflow-hidden rounded-lg border border-[#DDE6E0] bg-white">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`flex h-10 w-10 items-center justify-center transition ${
                                        viewMode === 'grid'
                                            ? 'bg-[#176B4D] text-white'
                                            : 'text-slate-500 hover:bg-[#F3F7F5] hover:text-[#176B4D]'
                                    }`}
                                    aria-label="Grid view"
                                >
                                    <Grid2X2 size={18} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={`flex h-10 w-10 items-center justify-center transition ${
                                        viewMode === 'list'
                                            ? 'bg-[#176B4D] text-white'
                                            : 'text-slate-500 hover:bg-[#F3F7F5] hover:text-[#176B4D]'
                                    }`}
                                    aria-label="List view"
                                >
                                    <List size={19} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {categories.length > 0 && (
                        <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Categories">
                            {[{ id: '' as const, name: 'All Listings' }, ...categories].map(
                                (category) => {
                                    const selected =
                                        String(form.category) === String(category.id);

                                    return (
                                        <button
                                            key={category.id}
                                            type="button"
                                            aria-pressed={selected}
                                            onClick={() =>
                                                update({ category: category.id }, true)
                                            }
                                            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                                                selected
                                                    ? 'border-[#176B4D] bg-[#176B4D] text-white'
                                                    : 'border-[#E1E9E4] bg-white text-slate-600 hover:border-[#176B4D] hover:text-[#176B4D]'
                                            }`}
                                        >
                                            {category.name}
                                        </button>
                                    );
                                },
                            )}
                        </div>
                    )}

                    {listings.data.length > 0 ? (
                        <div
                            className={
                                viewMode === 'grid'
                                    ? 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                    : 'flex flex-col gap-4'
                            }
                        >
                            {listings.data.map((listing) => (
                                <ListingCard
                                    key={listing.id}
                                    listing={listing}
                                    favorited={favoriteIds.includes(listing.id)}
                                    layout={viewMode}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-[#DDE6E0] bg-white px-6 py-16 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF4EF] text-[#176B4D]">
                                <Filter size={26} />
                            </div>

                            <h3 className="mt-4 text-lg font-bold text-[#17352A]">
                                No listings found
                            </h3>

                            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                                Try another search or adjust your filters.
                            </p>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearAll}
                                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#176B4D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#12583F]"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    )}

                    <Pagination links={listings.links} />
                </main>
            </div>
        </AppLayout>
    );
}
