import { Head, Link, router } from '@inertiajs/react';
import { FileText, Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import AdminNav from '../../components/ui/AdminNav';
import { Page } from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDateTime, formatPrice, Paginated } from '../../types/shared';

interface AdminOrder {
    id: number;
    reference: string;
    status: string;
    quantity: number;
    price: string;
    total: string;
    created_at: string;
    reports_count: number;
    listing: { id: number; title: string } | null;
    buyer: { id: number; name: string };
    seller: { id: number; name: string };
}

interface Props {
    orders: Paginated<AdminOrder>;
    filters: { q: string; status: string };
}

export default function Orders({ orders, filters }: Props) {
    const [q, setQ] = useState(filters.q);

    const go = (params: Record<string, string>) =>
        router.get(
            '/admin/orders',
            Object.fromEntries(Object.entries(params).filter(([, v]) => v && v !== 'all')),
            { preserveState: true },
        );

    const search = (event: FormEvent) => {
        event.preventDefault();
        go({ q, status: filters.status });
    };

    return (
        <AppLayout>
            <Head title="Admin · Transactions" />

            <Page>
                <AdminNav
                    title="Transactions"
                    subtitle="Every order on the marketplace. Open the compiled report to hand to an authority."
                />

                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <form onSubmit={search} className="relative min-w-[240px] max-w-md flex-1" role="search">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
                        <input
                            type="search"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Order number, item, buyer or seller…"
                            aria-label="Search transactions"
                            className="ui-input !pl-10"
                        />
                    </form>

                    <select
                        value={filters.status}
                        onChange={(e) => go({ q, status: e.target.value })}
                        aria-label="Filter by status"
                        className="ui-input w-auto"
                    >
                        <option value="all">All statuses</option>
                        <option value="reported">Reported</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                <div className="ui-card overflow-x-auto">
                    <table className="w-full min-w-[820px] text-left text-sm">
                        <thead className="border-b border-mist-100 bg-mist-50 text-xs font-bold uppercase tracking-wide text-ink-2">
                            <tr>
                                <th className="px-5 py-3">Order</th>
                                <th className="px-5 py-3">Item</th>
                                <th className="px-5 py-3">Buyer → Seller</th>
                                <th className="px-5 py-3">Total</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-mist-100">
                            {orders.data.map((o) => (
                                <tr key={o.id} className="align-top">
                                    <td className="px-5 py-3.5">
                                        <span className="font-extrabold text-ink">{o.reference}</span>
                                        <span className="block text-xs text-ink-3">{formatDateTime(o.created_at)}</span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        {o.listing ? (
                                            <Link href={`/listings/${o.listing.id}`} className="line-clamp-1 font-semibold text-ink hover:text-pine-700">
                                                {o.listing.title}
                                            </Link>
                                        ) : (
                                            <span className="text-ink-3">Deleted listing</span>
                                        )}
                                        <span className="text-xs text-ink-3">
                                            {o.quantity} × {formatPrice(o.price)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-ink-2">
                                        <Link href={`/users/${o.buyer.id}`} className="font-semibold hover:text-pine-700">{o.buyer.name}</Link>
                                        <span className="mx-1.5 text-ink-3">→</span>
                                        <Link href={`/users/${o.seller.id}`} className="font-semibold hover:text-pine-700">{o.seller.name}</Link>
                                    </td>
                                    <td className="px-5 py-3.5 font-extrabold text-pine-900">{formatPrice(o.total)}</td>
                                    <td className="px-5 py-3.5">
                                        <StatusBadge status={o.status} />
                                        {o.reports_count > 0 && (
                                            <span className="ui-chip mt-1.5 bg-red-50 text-red-700">
                                                {o.reports_count} report{o.reports_count === 1 ? '' : 's'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <Link href={`/orders/${o.id}/report`} className="ui-btn ui-btn-outline ui-btn-sm">
                                            <FileText size={14} /> Compiled report
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {orders.data.length === 0 && (
                        <p className="px-5 py-12 text-center text-sm text-ink-2">No transactions found.</p>
                    )}
                </div>

                <Pagination links={orders.links} />
            </Page>
        </AppLayout>
    );
}
