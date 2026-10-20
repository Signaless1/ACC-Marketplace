import { Head, Link, router } from '@inertiajs/react';
import {
    Ban,
    ChevronDown,
    FileText,
    Flag,
    Gavel,
    LifeBuoy,
    Package,
    ReceiptText,
    Scale,
    Send,
    ShieldAlert,
    UserX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import AdminNav from '../../components/ui/AdminNav';
import { Page } from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import { apiJson } from '../../lib/api';
import { formatPhone } from '../../lib/phone';
import { formatDate, formatDateTime, formatPrice, Paginated, timeAgo } from '../../types/shared';

interface Standing {
    account_age_days: number | null;
    filed: number;
    upheld: number;
    dismissed: number;
    false_reports: number;
}

interface AdminReport {
    id: number;
    reason: string;
    description: string | null;
    status: 'pending' | 'reviewing' | 'escalated' | 'resolved' | 'dismissed';
    admin_note: string | null;
    decision_note: string | null;
    bad_faith: boolean;
    reporter_role: 'buyer' | 'seller' | null;
    respondent_statement: string | null;
    responded_at: string | null;
    evidence_count: number;
    created_at: string;
    escalated_to: string | null;
    escalated_at: string | null;
    reporter: { id: number; name: string } | null;
    listing: { id: number; title: string; hidden_at: string | null } | null;
    reported_user: {
        id: number;
        name: string;
        suspended_at: string | null;
        suspension_type: 'manual' | 'auto' | null;
    } | null;
    reviewer: { name: string } | null;
    reporter_standing: Standing;
    /** How many different people have filed reports that count towards an automatic suspension. */
    qualifying_reports: number | null;
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

interface Appeal {
    id: number;
    message: string;
    status: string;
    created_at: string;
    user: {
        id: number;
        name: string;
        email: string;
        suspended_at: string | null;
        suspension_type: 'manual' | 'auto' | null;
        suspension_reason: string | null;
    } | null;
}

interface CaseData {
    messages: {
        id: number;
        sender: string | null;
        sender_id: number;
        body: string | null;
        at: string;
        deleted_for_everyone_at: string | null;
        attachments: { id: number; url: string; name: string; kind: string }[];
    }[];
    evidence: { id: number; url: string; name: string; kind: string; size: string; by: string }[];
    events: { id: number; event: string; by: string | null; note: string | null; at: string }[];
    history: {
        reports_total: number;
        reports_upheld: number;
        reports_dismissed: number;
        qualifying_reporters: number;
        completed_orders: number;
        phone: string | null;
        member_since: string;
    } | null;
}

interface Props {
    reports: Paginated<AdminReport>;
    status: string;
    counts: Record<string, number>;
    reasons: Record<string, string>;
    removalReasons: Record<string, string>;
    appeals: Appeal[];
    autoSuspend: { threshold: number; window_days: number };
}

const filters = ['pending', 'reviewing', 'escalated', 'resolved', 'dismissed', 'all'];

const EVENT_LABEL: Record<string, string> = {
    filed: 'Report filed',
    responded: 'Reported person responded',
    reviewing: 'Marked as reviewing',
    resolved: 'Resolved (upheld)',
    dismissed: 'Dismissed',
    escalated: 'Escalated',
    reopened: 'Reopened',
    auto_suspended: 'Account suspended automatically',
    auto_lifted: 'Automatic suspension lifted',
};

function kindOf(report: AdminReport) {
    return report.order ? 'Transaction' : report.listing ? 'Listing' : 'User';
}

/* ------------------------------------------------------------------ */
/*  Suspension appeals                                                 */
/* ------------------------------------------------------------------ */

function AppealCard({ appeal }: { appeal: Appeal }) {
    const [refusing, setRefusing] = useState(false);
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | undefined>(undefined);
    const [processing, setProcessing] = useState(false);

    const decide = (decision: 'accept' | 'deny') =>
        router.post(
            `/admin/appeals/${appeal.id}`,
            { decision, note },
            {
                preserveScroll: true,
                onStart: () => {
                    setProcessing(true);
                    setError(undefined);
                },
                onFinish: () => setProcessing(false),
                onError: (e) => setError(e.note),
            },
        );

    return (
        <li className="rounded-2xl bg-white p-4 ring-1 ring-sun-500/40 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="font-display text-base font-extrabold text-pine-950">
                        {appeal.user?.name ?? 'Deleted account'}
                    </p>
                    <p className="text-xs text-ink-3">
                        {appeal.user?.email} · appealed {timeAgo(appeal.created_at)}
                    </p>
                </div>
                {appeal.user?.suspension_type && (
                    <span className="ui-chip bg-red-50 text-red-700">
                        {appeal.user.suspension_type === 'auto' ? 'Suspended automatically' : 'Suspended by an admin'}
                    </span>
                )}
            </div>

            {appeal.user?.suspension_reason && (
                <p className="mt-2 text-[13px] text-ink-2">
                    <strong className="text-ink">Reason on file:</strong> {appeal.user.suspension_reason}
                </p>
            )}

            <p className="mt-3 whitespace-pre-line rounded-xl bg-mist-50 p-3.5 text-sm leading-relaxed text-ink-2 ring-1 ring-mist-200">
                {appeal.message}
            </p>

            {refusing && (
                <div className="mt-3">
                    <label htmlFor={`appeal-note-${appeal.id}`} className="ui-label">
                        Why does the suspension stay? (they will read this)
                    </label>
                    <textarea
                        id={`appeal-note-${appeal.id}`}
                        rows={3}
                        maxLength={500}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className={`ui-input ${error ? 'ui-input-error' : ''}`}
                    />
                    {error && <p className="ui-error">{error}</p>}
                </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
                {!refusing ? (
                    <>
                        <button
                            type="button"
                            disabled={processing}
                            onClick={() => decide('accept')}
                            className="ui-btn ui-btn-primary ui-btn-sm"
                        >
                            Accept and reinstate
                        </button>
                        <button
                            type="button"
                            disabled={processing}
                            onClick={() => setRefusing(true)}
                            className="ui-btn ui-btn-outline ui-btn-sm"
                        >
                            Refuse…
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            disabled={processing || !note.trim()}
                            onClick={() => decide('deny')}
                            className="ui-btn ui-btn-danger ui-btn-sm"
                        >
                            Refuse appeal
                        </button>
                        <button
                            type="button"
                            disabled={processing}
                            onClick={() => setRefusing(false)}
                            className="ui-btn ui-btn-outline ui-btn-sm"
                        >
                            Cancel
                        </button>
                    </>
                )}
            </div>
        </li>
    );
}

function AppealsPanel({ appeals }: { appeals: Appeal[] }) {
    if (appeals.length === 0) return null;

    return (
        <section className="mb-6 rounded-2xl border border-sun-500/50 bg-sun-300/15 p-4 sm:p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-extrabold text-pine-950">
                <LifeBuoy size={18} className="text-sun-700" />
                Suspension appeals
                <span className="rounded-full bg-sun-500 px-2 py-0.5 text-xs font-bold text-pine-950">
                    {appeals.length}
                </span>
            </h2>
            <p className="mt-1 text-[13px] text-ink-2">
                Suspended people cannot log in, so they appeal from the login page. Each appeal also counts as their
                answer to any open report about them.
            </p>
            <ul className="mt-4 space-y-3">
                {appeals.map((appeal) => (
                    <AppealCard key={appeal.id} appeal={appeal} />
                ))}
            </ul>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  The case file: everything needed to judge both sides               */
/* ------------------------------------------------------------------ */

function CaseFile({ reportId }: { reportId: number }) {
    const [data, setData] = useState<CaseData | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let alive = true;

        apiJson<CaseData>(`/admin/reports/${reportId}/case`)
            .then((result) => alive && setData(result))
            .catch(() => alive && setFailed(true));

        return () => {
            alive = false;
        };
    }, [reportId]);

    if (failed) return <p className="ui-error">The case file could not be loaded. Try again.</p>;
    if (!data) return <p className="text-sm text-ink-3">Loading the case file…</p>;

    const { history, evidence, messages, events } = data;

    return (
        <div className="space-y-5 rounded-2xl border border-mist-200 bg-white p-4 sm:p-5">
            {history && (
                <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-3">The reported person</p>
                    <dl className="grid gap-3 text-sm sm:grid-cols-3">
                        <div>
                            <dt className="text-xs text-ink-3">Member since</dt>
                            <dd className="font-semibold text-ink">{formatDate(history.member_since)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-ink-3">Mobile number</dt>
                            <dd className="font-semibold text-ink">{history.phone ? formatPhone(history.phone) : 'None on file'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-ink-3">Completed orders</dt>
                            <dd className="font-semibold text-ink">{history.completed_orders}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-ink-3">Reports about them</dt>
                            <dd className="font-semibold text-ink">
                                {history.reports_total} ({history.reports_upheld} upheld, {history.reports_dismissed} not upheld)
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-ink-3">Different people reporting (counting)</dt>
                            <dd className="font-semibold text-ink">{history.qualifying_reporters}</dd>
                        </div>
                    </dl>
                </div>
            )}

            <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-3">
                    Evidence ({evidence.length})
                </p>
                {evidence.length > 0 ? (
                    <ul className="space-y-1.5 text-sm">
                        {evidence.map((file) => (
                            <li key={file.id}>
                                <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-semibold text-pine-700 hover:underline"
                                >
                                    {file.name}
                                </a>{' '}
                                <span className="text-xs text-ink-3">
                                    ({file.kind}, {file.size}) · from the {file.by}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-ink-3">Nobody attached any files.</p>
                )}
            </div>

            <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-3">
                    Conversation ({messages.length} most recent)
                </p>
                {messages.length > 0 ? (
                    <ul className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
                        {messages.map((m) => (
                            <li key={m.id} className="text-sm">
                                <p className="text-xs text-ink-3">
                                    <strong className="text-ink">{m.sender ?? 'Unknown'}</strong> · {formatDateTime(m.at)}
                                </p>
                                {m.deleted_for_everyone_at && (
                                    <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-red-700">
                                        <Ban size={13} />
                                        Deleted for everyone on {formatDateTime(m.deleted_for_everyone_at)}
                                        {m.body === null && m.attachments.length === 0
                                            ? ' (content already purged)'
                                            : ' (neither person could read it after this)'}
                                    </p>
                                )}
                                {m.body && (
                                    <p
                                        className={`mt-0.5 whitespace-pre-wrap break-words rounded-lg px-3 py-2 ${
                                            m.deleted_for_everyone_at
                                                ? 'bg-red-50 text-ink ring-1 ring-red-200'
                                                : 'bg-mist-50 text-ink'
                                        }`}
                                    >
                                        {m.body}
                                    </p>
                                )}
                                {m.attachments.map((a) => (
                                    <a
                                        key={a.id}
                                        href={a.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-1 block text-xs font-semibold text-pine-700 hover:underline"
                                    >
                                        Attachment: {a.name} ({a.kind})
                                    </a>
                                ))}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-ink-3">The two people have not exchanged messages.</p>
                )}
            </div>

            <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-3">History of this report</p>
                <ol className="space-y-2">
                    {events.map((event) => (
                        <li key={event.id} className="flex gap-3 text-sm">
                            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-pine-700" />
                            <div>
                                <p className="font-bold text-ink">
                                    {EVENT_LABEL[event.event] ?? event.event}
                                    {event.by && <span className="font-medium text-ink-2"> · {event.by}</span>}
                                </p>
                                <p className="text-xs text-ink-3">{formatDateTime(event.at)}</p>
                                {event.note && <p className="text-[13px] text-ink-2">{event.note}</p>}
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  One report                                                         */
/* ------------------------------------------------------------------ */

function ReportCard({
    report,
    reasons,
    removalReasons,
    autoSuspend,
    defaultOpen,
}: {
    report: AdminReport;
    reasons: Record<string, string>;
    removalReasons: Record<string, string>;
    autoSuspend: Props['autoSuspend'];
    defaultOpen: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const [showCase, setShowCase] = useState(false);
    const [note, setNote] = useState(report.admin_note ?? '');
    const [decisionNote, setDecisionNote] = useState(report.decision_note ?? '');
    const [removeListing, setRemoveListing] = useState(false);
    const [removalReason, setRemovalReason] = useState('');
    const [removalNote, setRemovalNote] = useState('');
    const [suspendUser, setSuspendUser] = useState(false);
    const [suspensionReason, setSuspensionReason] = useState('');
    const [escalating, setEscalating] = useState(report.status === 'escalated');
    const [escalatedTo, setEscalatedTo] = useState(report.escalated_to ?? '');
    const [confirmingFalse, setConfirmingFalse] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const isOpen = ['pending', 'reviewing', 'escalated'].includes(report.status);
    const canRemove = Boolean(report.listing && !report.listing.hidden_at);
    const reported = report.reported_user;
    const canSuspend = Boolean(reported && (!reported.suspended_at || reported.suspension_type === 'auto'));
    const autoSuspended = Boolean(reported?.suspended_at && reported.suspension_type === 'auto');
    const Kind = report.order ? ReceiptText : report.listing ? Package : UserX;
    const standing = report.reporter_standing;
    const reachedThreshold = (report.qualifying_reports ?? 0) >= autoSuspend.threshold;

    const update = (status: AdminReport['status'], badFaith = false) => {
        if (status === 'escalated' && !escalating) {
            setEscalating(true);
            return;
        }

        router.patch(
            `/admin/reports/${report.id}`,
            {
                status,
                admin_note: note,
                decision_note: decisionNote,
                bad_faith: badFaith,
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
                onFinish: () => {
                    setProcessing(false);
                    setConfirmingFalse(false);
                },
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
                        {report.reporter_role && (
                            <span className="ui-chip bg-sky-50 text-sky-800">Filed by the {report.reporter_role}</span>
                        )}
                        {autoSuspended && <span className="ui-chip bg-red-50 text-red-700">Auto-suspended</span>}
                        {report.bad_faith && <span className="ui-chip bg-red-50 text-red-700">False report</span>}
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

                    {/* How much weight does this carry? */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-mist-50 p-4 ring-1 ring-mist-200">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-3">
                                The person who reported
                            </p>
                            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                                {standing.account_age_days !== null ? `Account ${standing.account_age_days} day(s) old · ` : ''}
                                {standing.filed} report(s) filed · {standing.upheld} upheld · {standing.dismissed} not upheld
                                {standing.false_reports > 0 && (
                                    <strong className="text-red-700"> · {standing.false_reports} judged false</strong>
                                )}
                            </p>
                        </div>
                        <div className={`rounded-xl p-4 ring-1 ${reachedThreshold ? 'bg-red-50 ring-red-200' : 'bg-mist-50 ring-mist-200'}`}>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-3">
                                Automatic suspension
                            </p>
                            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                                <strong className={reachedThreshold ? 'text-red-700' : 'text-ink'}>
                                    {report.qualifying_reports ?? 0} of {autoSuspend.threshold}
                                </strong>{' '}
                                different people have filed valid reports in the last {autoSuspend.window_days} days.
                            </p>
                        </div>
                    </div>

                    {autoSuspended && (
                        <p className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-[13px] leading-relaxed text-red-900">
                            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                            <span>
                                {reported?.name} was suspended automatically. This is a precaution, not a verdict:
                                dismissing reports lifts it by itself once fewer than {autoSuspend.threshold} valid
                                reports remain, and ticking “Also suspend” below turns it into your own decision.
                            </span>
                        </p>
                    )}

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

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-3">
                                What the reporter said
                            </p>
                            <p className="whitespace-pre-line rounded-xl bg-mist-50 p-4 text-sm leading-relaxed text-ink-2 ring-1 ring-mist-200">
                                {report.description ?? 'No written details were given.'}
                            </p>
                        </div>

                        <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-3">
                                The reported person’s response
                            </p>
                            {report.respondent_statement ? (
                                <div className="rounded-xl bg-white p-4 ring-1 ring-pine-700/25">
                                    <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">
                                        {report.respondent_statement}
                                    </p>
                                    {report.responded_at && (
                                        <p className="mt-2 text-xs text-ink-3">Responded {timeAgo(report.responded_at)}</p>
                                    )}
                                </div>
                            ) : (
                                <p className="rounded-xl border border-dashed border-mist-300 p-4 text-sm italic leading-relaxed text-ink-3">
                                    No response yet.
                                    {isOpen && ' Unless this is urgent, give them the chance to tell their side before you decide.'}
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <button
                            type="button"
                            onClick={() => setShowCase((v) => !v)}
                            className="ui-btn ui-btn-outline ui-btn-sm"
                        >
                            <Scale size={15} />
                            {showCase ? 'Hide case file' : 'Open case file'}
                            {report.evidence_count > 0 && ` (${report.evidence_count} file${report.evidence_count === 1 ? '' : 's'})`}
                        </button>
                        {showCase && (
                            <div className="mt-3">
                                <CaseFile reportId={report.id} />
                            </div>
                        )}
                    </div>

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
                            <label htmlFor={`decision-${report.id}`} className="ui-label">
                                Message to both people
                            </label>
                            <textarea
                                id={`decision-${report.id}`}
                                rows={2}
                                maxLength={1000}
                                value={decisionNote}
                                onChange={(e) => setDecisionNote(e.target.value)}
                                className="ui-input"
                                placeholder="Explain the outcome in plain words. The reporter and the reported person both read this once the report is decided."
                            />
                        </div>

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
                                            {autoSuspended
                                                ? `Confirm ${report.reported_user?.name}'s suspension as my decision`
                                                : `Also suspend ${report.reported_user?.name}`}
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

                        {confirmingFalse && (
                            <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
                                <p className="text-sm font-bold text-red-900">Dismiss as a false report?</p>
                                <p className="mt-1 text-[13px] leading-relaxed text-red-900/80">
                                    This counts as a strike against {report.reporter?.name ?? 'the reporter'}, and
                                    they will be told it was judged false. Repeated strikes pause their ability to
                                    report. Use it for reports that are knowingly untrue, not for ones that are
                                    simply mistaken or lack proof; those should just be dismissed.
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        disabled={processing}
                                        onClick={() => update('dismissed', true)}
                                        className="ui-btn ui-btn-danger ui-btn-sm"
                                    >
                                        Yes, dismiss as false
                                    </button>
                                    <button
                                        type="button"
                                        disabled={processing}
                                        onClick={() => setConfirmingFalse(false)}
                                        className="ui-btn ui-btn-outline ui-btn-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
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
                                        Resolve (upheld)
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
                                    <button
                                        type="button"
                                        disabled={processing}
                                        onClick={() => setConfirmingFalse(true)}
                                        className="ui-btn ui-btn-danger-outline ui-btn-sm"
                                    >
                                        Dismiss as false report…
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

export default function Reports({ reports, status, counts, reasons, removalReasons, appeals, autoSuspend }: Props) {
    return (
        <AppLayout>
            <Head title="Admin · Reports" />

            <Page>
                <AdminNav title="Reports" subtitle="Review what students have reported and decide what happens next" />

                <AppealsPanel appeals={appeals} />

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
                                autoSuspend={autoSuspend}
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
