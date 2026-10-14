import { Head, Link, router } from '@inertiajs/react';
import { ChevronDown, FileText, Flag, Gavel, Package, ReceiptText, Send, UserX } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import AdminNav from '../../components/ui/AdminNav';
import { Page } from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDateTime, formatPrice, Paginated, timeAgo } from '../../types/shared';

interface AdminReport {
    id: number;
    reason: string;
    description: string | null;
    status: 'pending' | 'reviewing' | 'escalated' | 'resolved' | 'dismissed';
    admin_note: string | null;
    created_at: string;
    escalated_to: string | null;
    escalated_at: string | null;
    reporter: { id: number; name: string } | null;
    listing: { id: number; title: string; hidden_at: string | null } | null;
    reported_user: { id: number; name: string; suspended_at: string | null } | null;
    reviewer: { name: string } | null;
    order: {
        id: number;
        reference: string;
        status: string;
        quantity: number;
        price: string;
        total: string;
        created_at: string;
        buyer: { name: string };
        seller: { name: string };
    } | null;
}

interface Props {
    reports: Paginated<AdminReport>;
    status: string;
    counts: Record<string, number>;
    reasons: Record<string, string>;
    removalReasons: Record<string, string>;
}

const filters = ['pending', 'reviewing', 'escalated', 'resolved', 'dismissed', 'all'];

function kindOf(report: AdminReport) {
    return report.order ? 'Transaction' : report.listing ? 'Listing' : 'User';
}

function ReportCard({
    report,
    reasons,
    removalReasons,
    defaultOpen,
}: {
    report: AdminReport;
    reasons: Record<string, string>;
    removalReasons: Record<string, string>;
    defaultOpen: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const [note, setNote] = useState(report.admin_note ?? '');
    const [removeListing, setRemoveListing] = useState(false);
    const [removalReason, setRemovalReason] = useState('');
    const [removalNote, setRemovalNote] = useState('');
    const [suspendUser, setSuspendUser] = useState(false);
    const [suspensionReason, setSuspensionReason] = useState('');
    const [escalating, setEscalating] = useState(report.status === 'escalated');
    const [escalatedTo, setEscalatedTo] = useState(report.escalated_to ?? '');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const isOpen = ['pending', 'reviewing', 'escalated'].includes(report.status);
    const canRemove = Boolean(report.listing && !report.listing.hidden_at);
    const canSuspend = Boolean(report.reported_user && !report.reported_user.suspended_at);
    const Kind = report.order ? ReceiptText : report.listing ? Package : UserX;

    const update = (status: AdminReport['status']) => {
        if (status === 'escalated' && !escalating) {
            setEscalating(true);
            return;
        }

        router.patch(
            `/admin/reports/${report.id}`,
            {
                status,
                admin_note: note,
                escalated_to: escalatedTo,
                remove_listing: removeListing,
                removal_reason: removeListing ? removalReason : '',
                removal_note: removeListing ? removalNote : '',
                suspend_user: suspendUser,
                suspension_reason: suspendUser ? suspensionReason : '',
            },
            {
                preserveScroll: true,
                onStart: () => {
                    setProcessing(true);
                    setErrors({});
                },
                onFinish: () => setProcessing(false),
                onError: (e) => setErrors(e),
                onSuccess: () => {
                    setRemoveListing(false);
                    setSuspendUser(false);
                },
            },
        );
    };

    return (
        <article className="ui-card overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-mist-50"
            >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mist-100 text-pine-700">
                    <Kind size={21} />
                </span>

                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-base font-extrabold text-pine-950">
                            {reasons[report.reason] ?? report.reason}
                        </span>
                        <span className="ui-chip bg-mist-100 text-pine-800">{kindOf(report)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink-3">
                        {report.listing?.title ?? report.reported_user?.name ?? 'Deleted item'} · reported by{' '}
                        {report.reporter?.name ?? 'unknown'} · {timeAgo(report.created_at)}
                    </span>
                </span>

                <StatusBadge status={report.status} />
                <ChevronDown size={18} className={`shrink-0 text-ink-3 transition ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="space-y-5 border-t border-mist-100 p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        {report.listing && (
                            <div className="rounded-xl bg-mist-50 p-4 ring-1 ring-mist-200">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-3">Listing</p>
                                <Link href={`/listings/${report.listing.id}`} className="mt-1 block font-bold text-pine-700 hover:underline">
                                    {report.listing.title}
                                </Link>
                                {report.listing.hidden_at && <StatusBadge status="removed" />}
                            </div>
                        )}
                        {report.reported_user && (
                            <div className="rounded-xl bg-mist-50 p-4 ring-1 ring-mist-200">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-3">Reported user</p>
                                <Link href={`/users/${report.reported_user.id}`} className="mt-1 block font-bold text-pine-700 hover:underline">
                                    {report.reported_user.name}
                                </Link>
                                {report.reported_user.suspended_at && <StatusBadge status="suspended" />}
                            </div>
                        )}
                    </div>

                    {report.order && (
                        <div className="rounded-xl border-2 border-sun-400/50 bg-sun-300/15 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="flex items-center gap-2 text-sm font-extrabold text-ink">
                                        <ReceiptText size={16} className="text-sun-700" />
                                        Transaction {report.order.reference}
                                        <StatusBadge status={report.order.status} />
                                    </p>
                                    <p className="mt-1 text-[13px] text-ink-2">
                                        {report.order.buyer.name} → {report.order.seller.name} · {report.order.quantity} ×{' '}
                                        {formatPrice(report.order.price)} = <strong>{formatPrice(report.order.total)}</strong>
                                    </p>
                                    <p className="text-xs text-ink-3">Placed {formatDateTime(report.order.created_at)}</p>
                                </div>
                                <Link href={`/orders/${report.order.id}/report`} className="ui-btn ui-btn-primary ui-btn-sm">
                                    <FileText size={15} /> Open compiled report
                                </Link>
                            </div>
                        </div>
                    )}

                    {report.description && (
                        <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-3">What they said</p>
                            <p className="whitespace-pre-line rounded-xl bg-mist-50 p-4 text-sm leading-relaxed text-ink-2 ring-1 ring-mist-200">
                                {report.description}
                            </p>
                        </div>
                    )}

                    {report.escalated_to && (
                        <p className="flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-900">
                            <Send size={16} />
                            Escalated to {report.escalated_to}
                            {report.escalated_at && ` on ${formatDateTime(report.escalated_at)}`}
                        </p>
                    )}

                    {/* Decision panel */}
                    <div className="space-y-4 rounded-2xl border border-mist-200 p-4 sm:p-5">
                        <p className="flex items-center gap-2 font-display text-sm font-extrabold text-pine-950">
                            <Gavel size={16} className="text-pine-700" /> Decision
                        </p>

                        <div>
                            <label htmlFor={`note-${report.id}`} className="ui-label">Admin note</label>
                            <textarea
                                id={`note-${report.id}`}
                                rows={2}
                                maxLength={1000}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="ui-input"
                                placeholder="What did you find? This stays internal."
                            />
                        </div>

                        {isOpen && (canRemove || canSuspend) && (
                            <div className="space-y-3">
                                <p className="text-xs text-ink-3">
                                    Optional actions. Each one needs its own reason, and removing a listing does not
                                    suspend the seller.
                                </p>

                                {canRemove && (
                                    <div className="rounded-xl bg-mist-50 p-3.5 ring-1 ring-mist-200">
                                        <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-ink">
                                            <input
                                                type="checkbox"
                                                checked={removeListing}
                                                onChange={(e) => setRemoveListing(e.target.checked)}
                                                className="h-4 w-4 accent-pine-700"
                                            />
                                            Remove the listing
                                        </label>
                                        {removeListing && (
                                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                <div>
                                                    <select
                                                        value={removalReason}
                                                        onChange={(e) => setRemovalReason(e.target.value)}
                                                        aria-label="Removal reason"
                                                        className={`ui-input ${errors.removal_reason ? 'ui-input-error' : ''}`}
                                                    >
                                                        <option value="">Reason for removal…</option>
                                                        {Object.entries(removalReasons).map(([k, label]) => (
                                                            <option key={k} value={k}>{label}</option>
                                                        ))}
                                                    </select>
                                                    {errors.removal_reason && <p className="ui-error">{errors.removal_reason}</p>}
                                                </div>
                                                <input
                                                    value={removalNote}
                                                    onChange={(e) => setRemovalNote(e.target.value)}
                                                    maxLength={500}
                                                    placeholder="Note to the seller (optional)"
                                                    aria-label="Note to the seller"
                                                    className="ui-input"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {canSuspend && (
                                    <div className="rounded-xl bg-mist-50 p-3.5 ring-1 ring-mist-200">
                                        <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-ink">
                                            <input
                                                type="checkbox"
                                                checked={suspendUser}
                                                onChange={(e) => setSuspendUser(e.target.checked)}
                                                className="h-4 w-4 accent-red-600"
                                            />
                                            Also suspend {report.reported_user?.name}
                                        </label>
                                        {suspendUser && (
                                            <div className="mt-3">
                                                <input
                                                    value={suspensionReason}
                                                    onChange={(e) => setSuspensionReason(e.target.value)}
                                                    maxLength={300}
                                                    placeholder="Reason shown to the user"
                                                    aria-label="Suspension reason"
                                                    className={`ui-input ${errors.suspension_reason ? 'ui-input-error' : ''}`}
                                                />
                                                {errors.suspension_reason && <p className="ui-error">{errors.suspension_reason}</p>}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {escalating && (
                            <div>
                                <label htmlFor={`esc-${report.id}`} className="ui-label">
                                    Escalate to (office or person)
                                </label>
                                <input
                                    id={`esc-${report.id}`}
                                    value={escalatedTo}
                                    onChange={(e) => setEscalatedTo(e.target.value)}
                                    maxLength={150}
                                    placeholder="e.g. Student Affairs Office, Guidance Counselor"
                                    className={`ui-input ${errors.escalated_to ? 'ui-input-error' : ''}`}
                                />
                                {errors.escalated_to && <p className="ui-error">{errors.escalated_to}</p>}
                                <p className="ui-hint">
                                    Print the compiled transaction report and hand it over, then record who received it.
                                </p>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            {report.status === 'pending' && (
                                <button type="button" disabled={processing} onClick={() => update('reviewing')} className="ui-btn ui-btn-outline ui-btn-sm">
                                    Mark reviewing
                                </button>
                            )}
                            {isOpen && (
                                <>
                                    <button type="button" disabled={processing} onClick={() => update('resolved')} className="ui-btn ui-btn-primary ui-btn-sm">
                                        Resolve
                                    </button>
                                    <button
                                        type="button"
                                        disabled={processing || (escalating && !escalatedTo.trim())}
                                        onClick={() => update('escalated')}
                                        className="ui-btn ui-btn-sm bg-violet-700 text-white hover:bg-violet-800"
                                    >
                                        <Send size={14} />
                                        {escalating ? 'Save escalation' : 'Escalate…'}
                                    </button>
                                    <button type="button" disabled={processing} onClick={() => update('dismissed')} className="ui-btn ui-btn-outline ui-btn-sm">
                                        Dismiss
                                    </button>
                                </>
                            )}
                            {!isOpen && (
                                <button type="button" disabled={processing} onClick={() => update('reviewing')} className="ui-btn ui-btn-outline ui-btn-sm">
                                    Reopen
                                </button>
                            )}
                        </div>

                        {report.reviewer && (
                            <p className="text-xs text-ink-3">Last handled by {report.reviewer.name}</p>
                        )}
                    </div>
                </div>
            )}
        </article>
    );
}

export default function Reports({ reports, status, counts, reasons, removalReasons }: Props) {
    return (
        <AppLayout>
            <Head title="Admin · Reports" />

            <Page>
                <AdminNav title="Reports" subtitle="Review what students have reported and decide what happens next" />

                <div className="mb-5 flex flex-wrap gap-2">
                    {filters.map((s) => (
                        <Link
                            key={s}
                            href={`/admin/reports?status=${s}`}
                            className={`rounded-xl px-4 py-2 text-sm font-bold capitalize transition ${
                                status === s
                                    ? 'bg-pine-950 text-white'
                                    : 'border border-mist-200 bg-white text-ink-2 hover:border-pine-700 hover:text-pine-800'
                            }`}
                        >
                            {s}
                            {s !== 'all' && <span className="ml-1.5 opacity-70">{counts[s] ?? 0}</span>}
                        </Link>
                    ))}
                </div>

                {reports.data.length > 0 ? (
                    <div className="space-y-4">
                        {reports.data.map((report, i) => (
                            <ReportCard
                                key={report.id}
                                report={report}
                                reasons={reasons}
                                removalReasons={removalReasons}
                                defaultOpen={i === 0 && reports.data.length === 1}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-mist-300 bg-white px-6 py-16 text-center">
                        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-mist-100 text-pine-700">
                            <Flag size={26} />
                        </span>
                        <p className="mt-4 font-display text-lg font-extrabold text-pine-950">
                            No {status === 'all' ? '' : status} reports
                        </p>
                        <p className="mt-1 text-sm text-ink-2">Nothing to review here right now.</p>
                    </div>
                )}

                <Pagination links={reports.links} />
            </Page>
        </AppLayout>
    );
}
