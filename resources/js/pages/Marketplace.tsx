import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowUpDown,
    Filter,
    Grid2X2,
    List,
    Package,
    Plus,
    Search,
    SlidersHorizontal,
    Star,
    X,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import AppLayout from '../Layouts/AppLayout';
import ListingCard, { CardListing } from '../components/ui/ListingCard';
import Pagination from '../components/ui/Pagination';
import { Page } from '../components/ui/PageHeader';
import SiteImage from '../components/ui/SiteImage';
import { siteImages } from '../config/siteImages';
import type { Paginated } from '../types/shared';

interface Category {
    id: number;
    name: string;
}

interface Filters {
    q: string;
    category: string | number;
    type: string;
    min_price: string;
    max_price: string;
    availability: 'available' | 'all';
    sort: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'top_rated' | 'popular';
    min_rating: string | number;
}

interface MarketplaceProps {
    categories: Category[];
    listings: Paginated<CardListing>;
    favoriteIds: number[];
    filters: Filters;
}

const sorts: [Filters['sort'], string][] = [
    ['newest', 'Newest first'],
    ['popular', 'Most popular'],
    ['top_rated', 'Top rated'],
    ['price_asc', 'Price: low to high'],
    ['price_desc', 'Price: high to low'],
    ['oldest', 'Oldest first'],
];

const emptyFilters: Filters = {
    q: '',
    category: '',
    type: '',
    min_price: '',
    max_price: '',
    availability: 'available',
    sort: 'newest',
    min_rating: '',
};

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div role="group" aria-label={title} className="border-t border-mist-100 py-5 first:border-0 first:pt-0">
            <h3 className="mb-3 font-body text-[13px] font-extrabold uppercase tracking-wider text-ink-2">{title}</h3>
            {children}
        </div>
    );
}

export default function Marketplace({ categories, listings, favoriteIds, filters }: MarketplaceProps) {
    const [form, setForm] = useState<Filters>(filters);
    const [showFilters, setShowFilters] = useState(false);
    const [view, setView] = useState<'grid' | 'row'>('grid');

    const apply = (next: Filters) => {
        const params: Record<string, string> = {};

        if (next.q.trim()) params.q = next.q.trim();
        if (next.category) params.category = String(next.category);
        if (next.type) params.type = next.type;
        if (next.min_price !== '') params.min_price = String(next.min_price);
        if (next.max_price !== '') params.max_price = String(next.max_price);
        if (next.availability !== 'available') params.availability = next.availability;
        if (next.sort !== 'newest') params.sort = next.sort;
        if (next.min_rating) params.min_rating = String(next.min_rating);

        router.get('/marketplace', params, { preserveState: true, preserveScroll: true });
    };

    const update = (patch: Partial<Filters>, submit = true) => {
        const next = { ...form, ...patch };
        setForm(next);
        if (submit) apply(next);
    };

    const submitSearch = (event: FormEvent) => {
        event.preventDefault();
        apply(form);
    };

    const clearAll = () => {
        setForm(emptyFilters);
        apply(emptyFilters);
    };

    // Chips for everything currently narrowing the results.
    const active: { label: string; clear: Partial<Filters> }[] = [];
    if (filters.q) active.push({ label: `“${filters.q}”`, clear: { q: '' } });
    if (filters.category) {
        const name = categories.find((c) => String(c.id) === String(filters.category))?.name;
        if (name) active.push({ label: name, clear: { category: '' } });
    }
    if (filters.type) active.push({ label: filters.type === 'item' ? 'Items' : 'Services', clear: { type: '' } });
    if (filters.min_price !== '') active.push({ label: `From ₱${filters.min_price}`, clear: { min_price: '' } });
    if (filters.max_price !== '') active.push({ label: `Up to ₱${filters.max_price}`, clear: { max_price: '' } });
    if (filters.min_rating) active.push({ label: `${filters.min_rating}★ & up`, clear: { min_rating: '' } });
    if (filters.availability === 'all') active.push({ label: 'Including sold out', clear: { availability: 'available' } });

    const panel = (
        <div>
            <FilterGroup title="Category">
                <ul className="space-y-1">
                    {[{ id: '' as const, name: 'All categories' }, ...categories].map((c) => {
                        const selected = String(form.category) === String(c.id);

                        return (
                            <li key={c.id}>
                                <button
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => update({ category: c.id })}
                                    className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                                        selected
                                            ? 'bg-pine-800 text-white'
                                            : 'text-ink-2 hover:bg-mist-100 hover:text-pine-800'
                                    }`}
                                >
                                    {c.name}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </FilterGroup>

            <FilterGroup title="Type">
                <div className="flex gap-2">
                    {[
                        ['', 'All'],
                        ['item', 'Items'],
                        ['service', 'Services'],
                    ].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            aria-pressed={form.type === value}
                            onClick={() => update({ type: value })}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                                form.type === value
                                    ? 'border-pine-800 bg-pine-800 text-white'
                                    : 'border-mist-200 bg-white text-ink-2 hover:border-pine-700'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </FilterGroup>

            <FilterGroup title="Price (₱)">
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={form.min_price}
                        onChange={(e) => update({ min_price: e.target.value }, false)}
                        onBlur={() => apply(form)}
                        onKeyDown={(e) => e.key === 'Enter' && apply(form)}
                        placeholder="Min"
                        aria-label="Minimum price"
                        className="ui-input h-10 !px-3"
                    />
                    <span className="text-ink-3">–</span>
                    <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={form.max_price}
                        onChange={(e) => update({ max_price: e.target.value }, false)}
                        onBlur={() => apply(form)}
                        onKeyDown={(e) => e.key === 'Enter' && apply(form)}
                        placeholder="Max"
                        aria-label="Maximum price"
                        className="ui-input h-10 !px-3"
                    />
                </div>
            </FilterGroup>

            <FilterGroup title="Rating">
                <ul className="space-y-1">
                    {[4, 3].map((n) => (
                        <li key={n}>
                            <button
                                type="button"
                                aria-pressed={String(form.min_rating) === String(n)}
                                onClick={() => update({ min_rating: String(form.min_rating) === String(n) ? '' : n })}
                                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                                    String(form.min_rating) === String(n)
                                        ? 'bg-sun-300/50 text-sun-800'
                                        : 'text-ink-2 hover:bg-mist-100'
                                }`}
                            >
                                <Star size={15} className="fill-sun-500 text-sun-500" />
                                {n}.0 &amp; up
                            </button>
                        </li>
                    ))}
                </ul>
            </FilterGroup>

            <FilterGroup title="Availability">
                <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-ink-2">
                    <input
                        type="checkbox"
                        checked={form.availability === 'available'}
                        onChange={(e) => update({ availability: e.target.checked ? 'available' : 'all' })}
                        className="h-4 w-4 rounded border-pine-900/30 accent-pine-700"
                    />
                    Hide sold out &amp; reserved
                </label>
            </FilterGroup>
        </div>
    );

    return (
        <AppLayout>
            <Head title="Marketplace" />

            {/* Hero strip */}
            <section className="relative isolate overflow-hidden bg-pine-900">
                <SiteImage
                    name={siteImages.marketplace}
                    alt=""
                    className="absolute inset-0 -z-10 opacity-30"
                    imageClassName="object-center"
                />
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-pine-950 via-pine-950/90 to-pine-900/50" />

                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-9 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
                    <div>
                        <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
                            Find something good on campus
                        </h1>
                        <p className="mt-2 max-w-xl text-[15px] text-white/80">
                            Items and services from fellow ACC students, a short walk from where you are.
                        </p>
                    </div>

                    <Link href="/listings/create" className="ui-btn ui-btn-gold ui-btn-lg self-start lg:self-auto">
                        <Plus size={18} strokeWidth={2.6} />
                        Sell something
                    </Link>
                </div>
            </section>

            <Page wide>
                <div className="grid gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
                    {/* Filters (desktop) */}
                    <aside className="hidden lg:block">
                        <div className="ui-card sticky top-[92px] p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="font-display text-base font-extrabold text-pine-950">Filters</h2>
                                {active.length > 0 && (
                                    <button type="button" onClick={clearAll} className="text-xs font-bold text-pine-700 hover:underline">
                                        Clear all
                                    </button>
                                )}
                            </div>
                            {panel}
                        </div>
                    </aside>

                    <div className="min-w-0">
                        {/* Search + sort */}
                        <form onSubmit={submitSearch} role="search" className="flex flex-wrap items-center gap-3">
                            <div className="relative min-w-[220px] flex-1">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
                                <input
                                    type="search"
                                    value={form.q}
                                    onChange={(e) => update({ q: e.target.value }, false)}
                                    placeholder="Search by title, description, category or seller…"
                                    aria-label="Search listings"
                                    className="ui-input !h-12 !rounded-full !pl-11"
                                />
                            </div>

                            <button type="submit" className="ui-btn ui-btn-primary !h-12 !rounded-full">
                                Search
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowFilters((v) => !v)}
                                aria-expanded={showFilters}
                                className="ui-btn ui-btn-outline !h-12 !rounded-full lg:hidden"
                            >
                                <SlidersHorizontal size={17} />
                                Filters
                                {active.length > 0 && (
                                    <span className="rounded-full bg-pine-800 px-1.5 text-[11px] text-white">{active.length}</span>
                                )}
                            </button>
                        </form>

                        {showFilters && (
                            <div className="ui-card ui-pop mt-4 p-5 lg:hidden">{panel}</div>
                        )}

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-ink-2" aria-live="polite">
                                <strong className="text-ink">{listings.total}</strong> listing{listings.total === 1 ? '' : 's'} found
                            </p>

                            <div className="flex items-center gap-3">
                                <label className="relative">
                                    <span className="sr-only">Sort listings</span>
                                    <ArrowUpDown size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                                    <select
                                        value={form.sort}
                                        onChange={(e) => update({ sort: e.target.value as Filters['sort'] })}
                                        className="ui-input !h-10 w-auto !pl-9 !pr-8 text-sm font-semibold"
                                    >
                                        {sorts.map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </label>

                                <div className="flex overflow-hidden rounded-xl border border-mist-200 bg-white">
                                    {(
                                        [
                                            ['grid', Grid2X2, 'Grid view'],
                                            ['row', List, 'List view'],
                                        ] as const
                                    ).map(([mode, Icon, label]) => (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => setView(mode)}
                                            aria-label={label}
                                            aria-pressed={view === mode}
                                            className={`flex h-10 w-10 items-center justify-center transition ${
                                                view === mode ? 'bg-pine-800 text-white' : 'text-ink-2 hover:bg-mist-100'
                                            }`}
                                        >
                                            <Icon size={18} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {active.length > 0 && (
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                {active.map((chip) => (
                                    <button
                                        key={chip.label}
                                        type="button"
                                        onClick={() => update(chip.clear)}
                                        className="ui-chip gap-1.5 bg-mist-100 text-pine-800 transition hover:bg-mist-200"
                                    >
                                        {chip.label}
                                        <X size={13} />
                                        <span className="sr-only">Remove filter</span>
                                    </button>
                                ))}
                                <button type="button" onClick={clearAll} className="text-xs font-bold text-pine-700 hover:underline">
                                    Clear all
                                </button>
                            </div>
                        )}

                        <div className="mt-6">
                            {listings.data.length > 0 ? (
                                <div
                                    className={
                                        view === 'grid'
                                            ? 'grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-4'
                                            : 'flex flex-col gap-4'
                                    }
                                >
                                    {listings.data.map((listing) => (
                                        <ListingCard
                                            key={listing.id}
                                            listing={listing}
                                            layout={view}
                                            favorited={favoriteIds.includes(listing.id)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-mist-300 bg-white px-6 py-16 text-center">
                                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-mist-100 text-pine-700">
                                        <Filter size={26} />
                                    </span>
                                    <h3 className="mt-4 font-display text-lg font-extrabold text-pine-950">No listings found</h3>
                                    <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-2">
                                        Try different words or loosen your filters. Or be the first to list it.
                                    </p>
                                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                                        {active.length > 0 && (
                                            <button type="button" onClick={clearAll} className="ui-btn ui-btn-outline">
                                                Clear filters
                                            </button>
                                        )}
                                        <Link href="/listings/create" className="ui-btn ui-btn-primary">
                                            <Package size={17} />
                                            Create a listing
                                        </Link>
                                    </div>
                                </div>
                            )}

                            <Pagination links={listings.links} />
                        </div>
                    </div>
                </div>
            </Page>
        </AppLayout>
    );
}
