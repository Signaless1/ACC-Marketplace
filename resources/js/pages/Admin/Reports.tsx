import { Head, Link, router } from '@inertiajs/react';
import { FileText, Gavel } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import AdminNav from '../../components/ui/AdminNav';
import Pagination from '../../components/ui/Pagination';
import { formatDate, Paginated } from '../../types/shared';

interface AdminReport {
    id: number;
    reason: string;
    description: string | null;
    status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
    admin_note: string | null;
    created_at: string;
    reporter: { id: number; name: string };
    listing: { id: number; title: string; hidden_at: string | null } | null;
    reported_user: { id: number; name: string; suspended_at: string | null } | null;
    reviewer: { name: string } | null;
    order: { id: number; status: string; quantity: number; price: string } | null;
    escalated_to: string | null;
    escalated_at: string | null;
}

interface Props {
    reports: Paginated<AdminReport>;
    status: string;
    counts: Record<string, number>;
    reasons: Record<string, string>;
    removalReasons: Record<string, string>;
    authorities: string[];
}

const statuses = ['pending', 'reviewing', 'resolved', 'dismissed', 'all'];

function ReportCard({
    report,
    reasons,
    removalReasons,
    authorities,
}: {
    report: AdminReport;
    reasons: Record<string, string>;
    removalReasons: Record<string, string>;
    authorities: string[];
}) {
    const [removalReason, setRemovalReason] = useState(
        report.reason in removalReasons ? report.reason : 'other',
    );
    const [authority, setAuthority] = useState(authorities[0] ?? '');
    const [referring, setReferring] = useState(false);
    const [note, setNote] = useState(report.admin_note ?? '');
    const [hideListing, setHideListing] = useState(false);
    const [suspendUser, setSuspendUser] = useState(false);
    const [processing, setProcessing] = useState(false);

    const update = (status: AdminReport['status']) => {
        if (suspendUser && !window.confirm('Suspend the reported user?')) {
            return;
        }

        router.patch(
            `/admin/reports/${report.id}`,
            {
                status,
                admin_note: note,
                hide_listing: hideListing,
                removal_reason: removalReason,
                suspend_user: suspendUser,
            },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const open = report.status === 'pending' || report.status === 'reviewing';

    return (
        <article className="rounded-2xl border border-[#E1E9E4] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-slate-900">
                        {reasons[report.reason] ?? report.reason}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Reported by {report.reporter.name} ·{' '}
                        {formatDate(report.created_at)}
                    </p>
                </div>
                <span className="flex items-center gap-2">
                    {report.order && (
                        <span className="rounded-full bg-[#fcebe3] px-2.5 py-1 text-xs font-bold text-[#8f3a1b]">
                            Transaction #{report.order.id}
                        </span>
                    )}
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
                    {report.status}
                </span>
                </span>
            </div>

            <div className="mt-3 space-y-1 text-sm">
                {report.listing && (
                    <p>
                        <span className="text-slate-400">Listing: </span>
                        <Link
                            href={`/listings/${report.listing.id}`}
                            className="font-medium text-[#176B4D] hover:underline"
                        >
                            {report.listing.title}
                        </Link>
                        {report.listing.hidden_at && (
                            <span className="ml-2 text-xs text-red-600">(hidden)</span>
                        )}
                    </p>
                )}
                {report.reported_user && (
                    <p>
                        <span className="text-slate-400">User: </span>
                        <Link
                            href={`/users/${report.reported_user.id}`}
                            className="font-medium text-[#176B4D] hover:underline"
                        >
                            {report.reported_user.name}
                        </Link>
                        {report.reported_user.suspended_at && (
                            <span className="ml-2 text-xs text-red-600">(suspended)</span>
                        )}
                    </p>
                )}
                {!report.listing && !report.reported_user && (
                    <p className="text-slate-400">
                        The reported item no longer exists.
                    </p>
                )}
            </div>

            {report.description && (
                <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    {report.description}
                </p>
            )}

            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">
                        Admin note
                    </span>
                    <textarea
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={1000}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#176B4D]"
                    />
                </label>

                {open && (
                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                        {report.listing && !report.listing.hidden_at && (
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={hideListing}
                                    onChange={(e) => setHideListing(e.target.checked)}
                                />
                                Hide listing
                            </label>
                        )}
                        {report.listing && !report.listing.hidden_at && hideListing && (
                            <label className="flex items-center gap-2">
                                <span className="font-semibold">Reason:</span>
                                <select
                                    value={removalReason}
                                    onChange={(e) => setRemovalReason(e.target.value)}
                                    className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                                >
                                    {Object.entries(removalReasons).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </label>
                        )}
                        {report.reported_user && !report.reported_user.suspended_at && (
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={suspendUser}
                                    onChange={(e) => setSuspendUser(e.target.checked)}
                                />
                                Suspend user
                            </label>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    {report.status === 'pending' && (
                        <button
                            type="button"
                            disabled={processing}
                            onClick={() => update('reviewing')}
                            className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                        >
                            Mark reviewing
                        </button>
                    )}
                    {open && (
                        <>
                            <button
                                type="button"
                                disabled={processing}
                                onClick={() => update('resolved')}
                                className="rounded-lg bg-[#176B4D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#12583F] disabled:opacity-50"
                            >
                                Resolve
                            </button>
                            <button
                                type="button"
                                disabled={processing}
                                onClick={() => update('dismissed')}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Dismiss
                            </button>
                        </>
                    )}
                    {!open && (
                        <button
                            type="button"
                            disabled={processing}
                            onClick={() => update('reviewing')}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Reopen
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    <Link
                        href={`/reports/${report.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#176B4D] px-3 py-2 text-xs font-bold text-[#176B4D] hover:bg-[#EAF4EF]"
                    >
                        <FileText size={14} />
                        Open case file
                    </Link>

                    {report.escalated_to ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#FBF6E8] px-3 py-2 text-xs font-bold text-[#7a5a12]">
                            <Gavel size={14} />
                            Referred to {report.escalated_to}
                            {report.escalated_at && ` · ${formatDate(report.escalated_at)}`}
                        </span>
                    ) : referring ? (
                        <>
                            <select
                                value={authority}
                                onChange={(e) => setAuthority(e.target.value)}
                                aria-label="Authority"
                                className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                            >
                                {authorities.map((a) => (
                                    <option key={a}>{a}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() =>
                                    router.post(
                                        `/admin/reports/${report.id}/escalate`,
                                        { escalated_to: authority, escalation_note: note },
                                        { preserveScroll: true, onSuccess: () => setReferring(false) },
                                    )
                                }
                                className="rounded-lg bg-[#d4623a] px-3 py-2 text-xs font-bold text-white hover:bg-[#b44a27]"
                            >
                                Confirm referral
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setReferring(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4623a]/50 px-3 py-2 text-xs font-bold text-[#8f3a1b] hover:bg-[#fcebe3]"
                        >
                            <Gavel size={14} />
                            Refer to authority
                        </button>
                    )}
                </div>

                {report.reviewer && (
                    <p className="text-xs text-slate-400">
                        Last reviewed by {report.reviewer.name}
                    </p>
                )}
            </div>
        </article>
    );
}

export default function Reports({ reports, status, counts, reasons, removalReasons, authorities }: Props) {
    return (
        <AppLayout>
            <Head title="Admin · Reports" />

            <div className="min-h-screen bg-[#F7F9F8] px-4 py-8 sm:px-6">
                <div className="mx-auto max-w-4xl">
                    <AdminNav title="Reports" />

                    <div className="mb-5 flex flex-wrap gap-2">
                        {statuses.map((s) => (
                            <Link
                                key={s}
                                href={`/admin/reports?status=${s}`}
                                className={`rounded-lg px-3.5 py-2 text-sm font-semibold capitalize transition ${
                                    status === s
                                        ? 'bg-[#17352A] text-white'
                                        : 'border border-[#DDE6E0] bg-white text-slate-600 hover:border-[#176B4D]'
                                }`}
                            >
                                {s}
                                {s !== 'all' && ` (${counts[s] ?? 0})`}
                            </Link>
                        ))}
                    </div>

                    {reports.data.length > 0 ? (
                        <div className="space-y-4">
                            {reports.data.map((report) => (
                                <ReportCard
                                    key={report.id}
                                    report={report}
                                    reasons={reasons}
                                    removalReasons={removalReasons}
                                    authorities={authorities}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="rounded-2xl border border-dashed border-[#DDE6E0] bg-white px-6 py-14 text-center text-sm text-slate-500">
                            No {status === 'all' ? '' : status} reports.
                        </p>
                    )}

                    <Pagination links={reports.links} />
                </div>
            </div>
        </AppLayout>
    );
}
