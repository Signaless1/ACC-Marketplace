import { Head, Link } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import AdminNav from '../../components/ui/AdminNav';
import { formatDate } from '../../types/shared';

interface Props {
    stats: Record<string, number | null>;
    popularCategories: { id: number; name: string; listings_count: number }[];
    recentReports: {
        id: number;
        reason: string;
        created_at: string;
        reporter: { name: string };
        listing: { id: number; title: string } | null;
        reported_user: { id: number; name: string } | null;
    }[];
}

const cards: [string, string][] = [
    ['users', 'Total users'],
    ['active_listings', 'Active listings'],
    ['sold_listings', 'Sold listings'],
    ['orders', 'Total orders'],
    ['pending_orders', 'Pending orders'],
    ['completed_orders', 'Completed orders'],
    ['cancelled_orders', 'Cancelled orders'],
    ['pending_reports', 'Pending reports'],
    ['hidden_listings', 'Hidden listings'],
    ['suspended_users', 'Suspended users'],
];

export default function Dashboard({
    stats,
    popularCategories,
    recentReports,
}: Props) {
    const maxCount = Math.max(1, ...popularCategories.map((c) => c.listings_count));

    return (
        <AppLayout>
            <Head title="Admin" />

            <div className="min-h-screen bg-[#F7F9F8] px-4 py-8 sm:px-6">
                <div className="mx-auto max-w-6xl">
                    <AdminNav title="Admin overview" />

                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                        {cards.map(([key, label]) => (
                            <div
                                key={key}
                                className="rounded-2xl border border-[#E1E9E4] bg-white p-5 shadow-sm"
                            >
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                    {label}
                                </p>
                                <p
                                    className={`mt-2 text-2xl font-bold ${
                                        key === 'pending_reports' &&
                                        Number(stats[key]) > 0
                                            ? 'text-red-600'
                                            : 'text-slate-900'
                                    }`}
                                >
                                    {stats[key] ?? 0}
                                </p>
                            </div>
                        ))}

                        <div className="rounded-2xl border border-[#E1E9E4] bg-white p-5 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Average rating
                            </p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">
                                {stats.average_rating ?? '—'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 grid gap-6 lg:grid-cols-2">
                        <section className="rounded-2xl border border-[#E1E9E4] bg-white p-6 shadow-sm">
                            <h2 className="text-base font-bold text-slate-900">
                                Popular categories
                            </h2>

                            <ul className="mt-4 space-y-3">
                                {popularCategories.map((category) => (
                                    <li key={category.id}>
                                        <div className="mb-1 flex justify-between text-sm">
                                            <span className="font-medium text-slate-700">
                                                {category.name}
                                            </span>
                                            <span className="text-slate-500">
                                                {category.listings_count}
                                            </span>
                                        </div>
                                        <div className="h-2 rounded-full bg-slate-100">
                                            <div
                                                className="h-2 rounded-full bg-[#176B4D]"
                                                style={{
                                                    width: `${(category.listings_count / maxCount) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section className="rounded-2xl border border-[#E1E9E4] bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-slate-900">
                                    Latest pending reports
                                </h2>
                                <Link
                                    href="/admin/reports"
                                    className="text-sm font-semibold text-[#176B4D] hover:underline"
                                >
                                    View all
                                </Link>
                            </div>

                            {recentReports.length > 0 ? (
                                <ul className="mt-4 divide-y divide-slate-100">
                                    {recentReports.map((report) => (
                                        <li key={report.id} className="py-3 text-sm">
                                            <p className="font-medium text-slate-800">
                                                {report.listing?.title ??
                                                    report.reported_user?.name ??
                                                    'Deleted item'}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {report.reason} · by {report.reporter.name} ·{' '}
                                                {formatDate(report.created_at)}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-4 text-sm text-slate-500">
                                    No pending reports. 🎉
                                </p>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
