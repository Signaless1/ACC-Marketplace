import { Head, Link, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import Modal from '../../components/ui/Modal';
import AdminNav from '../../components/ui/AdminNav';
import Pagination from '../../components/ui/Pagination';
import { formatDate, formatPrice, Paginated } from '../../types/shared';

interface AdminListing {
    id: number;
    title: string;
    price: string;
    status: string;
    hidden_at: string | null;
    removed_reason: string | null;
    created_at: string;
    seller: { id: number; name: string; email: string };
    category: { name: string };
}

interface Props {
    listings: Paginated<AdminListing>;
    filters: { q: string; visibility: string };
    removalReasons: Record<string, string>;
    recentActions: {
        id: number;
        action: string;
        reason: string | null;
        listing_title: string;
        created_at: string;
        admin: { name: string } | null;
    }[];
}

export default function Listings({ listings, filters, removalReasons, recentActions }: Props) {
    const [q, setQ] = useState(filters.q);
    const [removing, setRemoving] = useState<{ listing: AdminListing; mode: 'hide' | 'delete' } | null>(null);
    const [reason, setReason] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    const submitRemoval = () => {
        if (!removing || !reason) return;

        const options = {
            preserveScroll: true,
            onStart: () => setBusy(true),
            onFinish: () => setBusy(false),
            onSuccess: () => {
                setRemoving(null);
                setReason('');
                setNote('');
            },
        };

        if (removing.mode === 'delete') {
            router.delete(`/admin/listings/${removing.listing.id}`, { ...options, data: { reason, note } });
        } else {
            router.post(`/admin/listings/${removing.listing.id}/hide`, { reason, note }, options);
        }
    };

    const go = (params: Record<string, string>) =>
        router.get(
            '/admin/listings',
            Object.fromEntries(Object.entries(params).filter(([, v]) => v && v !== 'all')),
            { preserveState: true },
        );

    const search = (event: FormEvent) => {
        event.preventDefault();
        go({ q, visibility: filters.visibility });
    };

    const restore = (listing: AdminListing) =>
        router.post(`/admin/listings/${listing.id}/restore`, {}, { preserveScroll: true });

    return (
        <AppLayout>
            <Head title="Admin · Listings" />

            <div className="min-h-screen bg-[#F7F9F8] px-4 py-8 sm:px-6">
                <div className="mx-auto max-w-6xl">
                    <AdminNav title="Listings" />

                    <div className="mb-4 flex flex-wrap gap-2">
                        <form onSubmit={search} className="flex flex-1 gap-2">
                            <input
                                type="search"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Search title or seller…"
                                aria-label="Search listings"
                                className="w-full max-w-sm rounded-xl border border-[#DDE6E0] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#176B4D]"
                            />
                            <button
                                type="submit"
                                className="rounded-xl bg-[#176B4D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12583F]"
                            >
                                Search
                            </button>
                        </form>

                        <select
                            value={filters.visibility}
                            onChange={(e) => go({ q, visibility: e.target.value })}
                            aria-label="Visibility filter"
                            className="rounded-xl border border-[#DDE6E0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#176B4D]"
                        >
                            <option value="all">All listings</option>
                            <option value="visible">Visible</option>
                            <option value="hidden">Hidden</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-[#E1E9E4] bg-white shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                                <tr>
                                    <th className="px-5 py-3">Listing</th>
                                    <th className="px-5 py-3">Seller</th>
                                    <th className="px-5 py-3">Price</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Posted</th>
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {listings.data.map((listing) => (
                                    <tr key={listing.id}>
                                        <td className="max-w-xs px-5 py-3">
                                            <Link
                                                href={`/listings/${listing.id}`}
                                                className="line-clamp-1 font-semibold text-slate-800 hover:text-[#176B4D]"
                                            >
                                                {listing.title}
                                            </Link>
                                            <p className="text-xs text-slate-500">
                                                {listing.category.name}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3">
                                            <Link
                                                href={`/users/${listing.seller.id}`}
                                                className="hover:text-[#176B4D]"
                                            >
                                                {listing.seller.name}
                                            </Link>
                                        </td>
                                        <td className="px-5 py-3">
                                            {formatPrice(listing.price)}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                    listing.hidden_at
                                                        ? 'bg-red-50 text-red-700'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}
                                            >
                                                {listing.hidden_at
                                                    ? 'Removed'
                                                    : listing.status}
                                            </span>
                                            {listing.removed_reason && (
                                                <p className="mt-1 text-xs text-slate-600">
                                                    {removalReasons[listing.removed_reason] ?? listing.removed_reason}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            {formatDate(listing.created_at)}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3 text-right">
                                            {listing.hidden_at ? (
                                                <button
                                                    type="button"
                                                    onClick={() => restore(listing)}
                                                    className="mr-2 rounded-lg border border-[#176B4D] px-3 py-1.5 text-xs font-semibold text-[#176B4D] hover:bg-[#EAF4EF]"
                                                >
                                                    Restore
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setRemoving({ listing, mode: 'hide' })}
                                                    className="mr-2 rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setRemoving({ listing, mode: 'delete' })}
                                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {listings.data.length === 0 && (
                            <p className="px-5 py-10 text-center text-sm text-slate-500">
                                No listings found.
                            </p>
                        )}
                    </div>

                    <Pagination links={listings.links} />

                    {recentActions.length > 0 && (
                        <section className="mt-8 rounded-2xl border border-[#E1E9E4] bg-white p-5 shadow-sm">
                            <h2 className="font-sans text-base font-bold text-[#12291f]">Recent moderation actions</h2>
                            <ul className="mt-3 divide-y divide-slate-100 text-sm">
                                {recentActions.map((a) => (
                                    <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2">
                                        <span>
                                            <strong className="capitalize">{a.action}</strong> “{a.listing_title}”
                                            {a.reason && ` · ${removalReasons[a.reason] ?? a.reason}`}
                                        </span>
                                        <span className="text-xs text-slate-600">
                                            {a.admin?.name} · {formatDate(a.created_at)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>
            </div>

            {removing && (
                <Modal
                    title={removing.mode === 'delete' ? 'Delete listing permanently' : 'Remove listing'}
                    onClose={() => setRemoving(null)}
                >
                    <div className="space-y-4 text-sm">
                        <p className="text-[#34483e]">
                            “{removing.listing.title}” by {removing.listing.seller.name}.{' '}
                            <strong>The seller's account will not be suspended.</strong>{' '}
                            {removing.mode === 'hide'
                                ? 'The listing is hidden and the seller can see the reason.'
                                : 'This cannot be undone.'}
                        </p>

                        <label className="block">
                            <span className="mb-1 block font-bold text-[#2f4a3d]">Reason</span>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full rounded-xl border border-[#cfdcd4] px-3 py-2.5 outline-none focus:border-[#176B4D]"
                            >
                                <option value="">Select a reason…</option>
                                {Object.entries(removalReasons).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="mb-1 block font-bold text-[#2f4a3d]">
                                Note to the seller <span className="font-normal text-slate-600">(optional)</span>
                            </span>
                            <textarea
                                rows={3}
                                maxLength={500}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full rounded-xl border border-[#cfdcd4] px-3 py-2 outline-none focus:border-[#176B4D]"
                            />
                        </label>

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setRemoving(null)}
                                className="rounded-xl border border-[#cfdcd4] px-4 py-2.5 font-semibold text-[#34483e] hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!reason || busy}
                                onClick={submitRemoval}
                                className="rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {busy ? 'Working…' : removing.mode === 'delete' ? 'Delete permanently' : 'Remove listing'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </AppLayout>
    );
}
