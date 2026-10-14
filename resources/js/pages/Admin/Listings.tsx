import { Head, Link, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import AdminNav from '../../components/ui/AdminNav';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import { Page } from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDate, formatPrice, Paginated } from '../../types/shared';

interface AdminListing {
    id: number;
    title: string;
    price: string;
    quantity: number;
    status: string;
    hidden_at: string | null;
    removed_reason_label: string | null;
    removed_note: string | null;
    created_at: string;
    seller: { id: number; name: string };
    remover: { name: string } | null;
    category: { name: string };
    images: { id: number; path: string }[];
}

interface Props {
    listings: Paginated<AdminListing>;
    filters: { q: string; visibility: string };
    reasons: Record<string, string>;
}

export default function Listings({ listings, filters, reasons }: Props) {
    const [q, setQ] = useState(filters.q);
    const [removing, setRemoving] = useState<AdminListing | null>(null);
    const [deleting, setDeleting] = useState<AdminListing | null>(null);
    const [reason, setReason] = useState('');
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);

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

    const remove = () => {
        if (!removing) return;

        router.post(
            `/admin/listings/${removing.id}/remove`,
            { reason, note },
            {
                preserveScroll: true,
                onStart: () => setBusy(true),
                onFinish: () => setBusy(false),
                onError: (e) => setErrors(e),
                onSuccess: () => {
                    setRemoving(null);
                    setReason('');
                    setNote('');
                    setErrors({});
                },
            },
        );
    };

    const destroy = () => {
        if (!deleting) return;

        router.delete(`/admin/listings/${deleting.id}`, {
            preserveScroll: true,
            onStart: () => setBusy(true),
            onFinish: () => {
                setBusy(false);
                setDeleting(null);
            },
        });
    };

    return (
        <AppLayout>
            <Head title="Admin · Listings" />

            <Page>
                <AdminNav title="Listings" subtitle="Remove listings that break the rules, with a reason the seller can see" />

                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <form onSubmit={search} className="relative min-w-[240px] max-w-md flex-1" role="search">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
                        <input
                            type="search"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search title or seller…"
                            aria-label="Search listings"
                            className="ui-input !pl-10"
                        />
                    </form>

                    <select
                        value={filters.visibility}
                        onChange={(e) => go({ q, visibility: e.target.value })}
                        aria-label="Visibility filter"
                        className="ui-input w-auto"
                    >
                        <option value="all">All listings</option>
                        <option value="visible">Visible</option>
                        <option value="removed">Removed</option>
                    </select>
                </div>

                <div className="ui-card overflow-x-auto">
                    <table className="w-full min-w-[820px] text-left text-sm">
                        <thead className="border-b border-mist-100 bg-mist-50 text-xs font-bold uppercase tracking-wide text-ink-2">
                            <tr>
                                <th className="px-5 py-3">Listing</th>
                                <th className="px-5 py-3">Seller</th>
                                <th className="px-5 py-3">Price</th>
                                <th className="px-5 py-3">Stock</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-mist-100">
                            {listings.data.map((listing) => (
                                <tr key={listing.id} className="align-top">
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-mist-100">
                                                {listing.images[0] && (
                                                    <img src={`/storage/${listing.images[0].path}`} alt="" className="h-full w-full object-cover" />
                                                )}
                                            </span>
                                            <div className="min-w-0">
                                                <Link href={`/listings/${listing.id}`} className="line-clamp-1 font-bold text-ink hover:text-pine-700">
                                                    {listing.title}
                                                </Link>
                                                <span className="block text-xs text-ink-3">
                                                    {listing.category.name} · {formatDate(listing.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <Link href={`/users/${listing.seller.id}`} className="font-semibold text-ink-2 hover:text-pine-700">
                                            {listing.seller.name}
                                        </Link>
                                    </td>
                                    <td className="px-5 py-3.5 font-semibold text-ink">{formatPrice(listing.price)}</td>
                                    <td className="px-5 py-3.5 text-ink-2">{listing.quantity}</td>
                                    <td className="px-5 py-3.5">
                                        <StatusBadge status={listing.hidden_at ? 'removed' : listing.status} />
                                        {listing.hidden_at && (
                                            <p className="mt-1.5 max-w-[15rem] text-xs leading-snug text-ink-2">
                                                {listing.removed_reason_label}
                                                {listing.removed_note && <> — {listing.removed_note}</>}
                                                {listing.remover && <span className="text-ink-3"> (by {listing.remover.name})</span>}
                                            </p>
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                                        {listing.hidden_at ? (
                                            <button
                                                type="button"
                                                onClick={() => router.post(`/admin/listings/${listing.id}/restore`, {}, { preserveScroll: true })}
                                                className="ui-btn ui-btn-outline ui-btn-sm mr-2"
                                            >
                                                Restore
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setRemoving(listing);
                                                    setReason('');
                                                    setNote('');
                                                    setErrors({});
                                                }}
                                                className="ui-btn ui-btn-sm mr-2 border-2 border-sun-500/60 bg-white text-sun-800 hover:bg-sun-300/30"
                                            >
                                                Remove
                                            </button>
                                        )}
                                        <button type="button" onClick={() => setDeleting(listing)} className="ui-btn ui-btn-danger-outline ui-btn-sm">
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {listings.data.length === 0 && (
                        <p className="px-5 py-12 text-center text-sm text-ink-2">No listings found.</p>
                    )}
                </div>

                <Pagination links={listings.links} />
            </Page>

            {removing && (
                <Modal title="Remove this listing" onClose={() => setRemoving(null)}>
                    <p className="text-sm text-ink-2">
                        <strong className="text-ink">“{removing.title}”</strong> will disappear from the marketplace.
                        The seller is <strong className="text-ink">not</strong> suspended and will see the reason
                        you pick.
                    </p>

                    <div className="mt-4 space-y-4">
                        <div>
                            <label htmlFor="removal-reason" className="ui-label">Reason</label>
                            <select
                                id="removal-reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className={`ui-input ${errors.reason ? 'ui-input-error' : ''}`}
                            >
                                <option value="">Select a reason…</option>
                                {Object.entries(reasons).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                            {errors.reason && <p className="ui-error">{errors.reason}</p>}
                        </div>

                        <div>
                            <label htmlFor="removal-note" className="ui-label">
                                Note to the seller{' '}
                                <span className="font-normal text-ink-3">
                                    {reason === 'other' ? '(required)' : '(optional)'}
                                </span>
                            </label>
                            <textarea
                                id="removal-note"
                                rows={3}
                                maxLength={500}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className={`ui-input ${errors.note ? 'ui-input-error' : ''}`}
                                placeholder="Explain what needs to change, if anything."
                            />
                            {errors.note && <p className="ui-error">{errors.note}</p>}
                        </div>
                    </div>

                    <div className="mt-5 flex justify-end gap-2">
                        <button type="button" onClick={() => setRemoving(null)} className="ui-btn ui-btn-outline ui-btn-sm">
                            Cancel
                        </button>
                        <button type="button" onClick={remove} disabled={!reason || busy} className="ui-btn ui-btn-danger ui-btn-sm">
                            {busy ? 'Removing…' : 'Remove listing'}
                        </button>
                    </div>
                </Modal>
            )}

            {deleting && (
                <ConfirmDialog
                    title="Delete permanently?"
                    message={`“${deleting.title}”, its photos and its history will be erased. Use “Remove” instead if the seller should see a reason.`}
                    confirmLabel="Delete permanently"
                    processing={busy}
                    onConfirm={destroy}
                    onClose={() => setDeleting(null)}
                />
            )}
        </AppLayout>
    );
}
