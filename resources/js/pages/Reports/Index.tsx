import { Head, Link, router } from '@inertiajs/react';
import { Flag, Receipt, Scale } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import { useFilePicker } from '../../components/ui/Attachments';
import EmptyState from '../../components/ui/EmptyState';
import EvidenceField from '../../components/ui/EvidenceField';
import PageHeader, { Page } from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDate, timeAgo } from '../../types/shared';

type Kind = 'transaction' | 'listing' | 'user';

interface FiledReport {
    id: number;
    kind: Kind;
    reason: string;
    description: string | null;
    status: string;
    outcome: string | null;
    decision_note: string | null;
    target: string;
    order_id: number | null;
    other_responded: boolean;
    created_at: string;
    reviewed_at: string | null;
}

interface AgainstReport {
    id: number;
    kind: Kind;
    reason: string;
    description: string | null;
    status: string;
    outcome: string | null;
    decision_note: string | null;
    /** Only known for transaction reports; anonymous otherwise. */
    reporter: string | null;
    target: string;
    order_id: number | null;
    my_statement: string | null;
    responded_at: string | null;
    can_respond: boolean;
    created_at: string;
    reviewed_at: string | null;
}

interface Props {
    filed: FiledReport[];
    against: AgainstReport[];
}

const KIND_LABEL: Record<Kind, string> = {
    transaction: 'Transaction',
    listing: 'Listing',
    user: 'Profile',
};

const MIN_STATEMENT = 20;
const MAX_STATEMENT = 2000;

function Outcome({ outcome }: { outcome: string }) {
    const tone =
        outcome === 'Upheld'
            ? 'bg-mist-100 text-pine-700 ring-pine-600/25'
            : outcome === 'Not upheld'
              ? 'bg-slate-100 text-slate-700 ring-slate-300/60'
              : 'bg-red-50 text-red-700 ring-red-300/50';

    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${tone}`}>
            {outcome}
        </span>
    );
}

function CardHeader({
    reason,
    kind,
    status,
    createdAt,
}: {
    reason: string;
    kind: Kind;
    status: string;
    createdAt: string;
}) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
                <p className="font-display text-base font-extrabold text-pine-950">{reason}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
                    <span className="rounded-full bg-mist-100 px-2 py-0.5 font-bold text-pine-700">
                        {KIND_LABEL[kind]}
                    </span>
                    <span title={formatDate(createdAt)}>Filed {timeAgo(createdAt)}</span>
                </p>
            </div>
            <StatusBadge status={status} />
        </div>
    );
}

function Decision({ outcome, note, at }: { outcome: string | null; note: string | null; at: string | null }) {
    if (!outcome) return null;

    return (
        <div className="mt-4 rounded-xl bg-mist-50 p-4 ring-1 ring-mist-200">
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                Decision <Outcome outcome={outcome} />
                {at && <span className="text-xs font-medium text-ink-3">{formatDate(at)}</span>}
            </p>
            {note && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-2">{note}</p>}
        </div>
    );
}

function RespondForm({ report }: { report: AgainstReport }) {
    const [statement, setStatement] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const picker = useFilePicker(5, 'review');

    const length = statement.trim().length;
    const attachmentError = Object.entries(errors).find(([key]) => key.startsWith('attachments'))?.[1];

    const submit = () =>
        router.post(
            `/reports/${report.id}/respond`,
            { statement: statement.trim(), attachments: picker.files },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => {
                    setProcessing(true);
                    setErrors({});
                },
                onFinish: () => setProcessing(false),
                onError: (e) => setErrors(e),
                onSuccess: () => {
                    setStatement('');
                    picker.clear();
                },
            },
        );

    return (
        <div className="mt-4 space-y-4 rounded-xl border border-sun-500/50 bg-sun-300/15 p-4">
            <div>
                <p className="flex items-center gap-2 font-display text-[15px] font-extrabold text-pine-950">
                    <Scale size={16} className="text-sun-700" /> Give your side
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                    Nothing is decided until an administrator has read both sides. You can respond once, so tell
                    it as clearly as you can.
                </p>
            </div>

            <div>
                <label htmlFor={`statement-${report.id}`} className="ui-label">
                    What happened, from your point of view?
                </label>
                <textarea
                    id={`statement-${report.id}`}
                    rows={5}
                    maxLength={MAX_STATEMENT}
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                    className={`ui-input ${errors.statement ? 'ui-input-error' : ''}`}
                    placeholder="When and where, what was agreed, and what you did."
                />
                <div className="mt-1 flex justify-between gap-3">
                    {errors.statement ? (
                        <p className="ui-error !mt-0">{errors.statement}</p>
                    ) : (
                        <span className="text-xs text-ink-3">
                            {length >= MIN_STATEMENT ? 'Thank you, that is enough detail.' : `At least ${MIN_STATEMENT} characters.`}
                        </span>
                    )}
                    <span className="ml-auto text-xs text-ink-3">
                        {statement.length}/{MAX_STATEMENT}
                    </span>
                </div>
            </div>

            <EvidenceField picker={picker} error={attachmentError} disabled={processing} />

            <button
                type="button"
                onClick={submit}
                disabled={length < MIN_STATEMENT || processing}
                className="ui-btn ui-btn-primary ui-btn-sm"
            >
                {processing ? 'Sending…' : 'Send my response'}
            </button>
        </div>
    );
}

function AgainstCard({ report }: { report: AgainstReport }) {
    return (
        <li className="ui-card p-5 sm:p-6">
            <CardHeader reason={report.reason} kind={report.kind} status={report.status} createdAt={report.created_at} />

            <p className="mt-3 text-sm text-ink-2">
                About <strong className="text-ink">{report.target}</strong>
                {' · '}
                {report.reporter ? `reported by ${report.reporter}` : 'the person who reported is kept anonymous'}
            </p>

            <div className="mt-3 rounded-xl bg-mist-50 p-4 ring-1 ring-mist-200">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-3">What was reported</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">
                    {report.description ?? 'No written details were given.'}
                </p>
            </div>

            {report.my_statement && (
                <div className="mt-3 rounded-xl bg-white p-4 ring-1 ring-pine-700/25">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-pine-700">
                        Your response{report.responded_at && ` · ${formatDate(report.responded_at)}`}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">{report.my_statement}</p>
                </div>
            )}

            {report.can_respond && <RespondForm report={report} />}

            <Decision outcome={report.outcome} note={report.decision_note} at={report.reviewed_at} />

            {report.order_id && (
                <Link
                    href={`/orders/${report.order_id}/report`}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-pine-700 hover:text-pine-900"
                >
                    <Receipt size={15} /> View the transaction record
                </Link>
            )}
        </li>
    );
}

function FiledCard({ report }: { report: FiledReport }) {
    return (
        <li className="ui-card p-5 sm:p-6">
            <CardHeader reason={report.reason} kind={report.kind} status={report.status} createdAt={report.created_at} />

            <p className="mt-3 text-sm text-ink-2">
                About <strong className="text-ink">{report.target}</strong>
            </p>

            {report.description && (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-2">{report.description}</p>
            )}

            {!report.outcome && (
                <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
                    {report.other_responded
                        ? 'The other side has responded. An administrator will read both before deciding.'
                        : 'The other side has been told and can respond. An administrator will read both before deciding.'}
                </p>
            )}

            <Decision outcome={report.outcome} note={report.decision_note} at={report.reviewed_at} />

            {report.order_id && (
                <Link
                    href={`/orders/${report.order_id}/report`}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-pine-700 hover:text-pine-900"
                >
                    <Receipt size={15} /> View the transaction record
                </Link>
            )}
        </li>
    );
}

export default function Index({ filed, against }: Props) {
    const waiting = against.filter((report) => report.can_respond).length;

    return (
        <AppLayout>
            <Head title="My reports" />

            <Page>
                <PageHeader
                    icon={Scale}
                    title="My reports"
                    subtitle="Follow reports you filed, and answer ones filed about you"
                />

                {filed.length === 0 && against.length === 0 ? (
                    <EmptyState
                        icon={Flag}
                        title="No reports yet"
                        text="If something goes wrong in a trade you can report it from the chat, a listing or a profile. Reports you file, and reports about you, appear here."
                        action={{ label: 'Back to the marketplace', href: '/marketplace' }}
                    />
                ) : (
                    <div className="mx-auto max-w-3xl space-y-10">
                        {against.length > 0 && (
                            <section>
                                <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold text-pine-950">
                                    Reports about you
                                    {waiting > 0 && (
                                        <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">
                                            {waiting} to answer
                                        </span>
                                    )}
                                </h2>
                                <ul className="space-y-4">
                                    {against.map((report) => (
                                        <AgainstCard key={report.id} report={report} />
                                    ))}
                                </ul>
                            </section>
                        )}

                        {filed.length > 0 && (
                            <section>
                                <h2 className="mb-3 font-display text-lg font-extrabold text-pine-950">
                                    Reports you filed
                                </h2>
                                <ul className="space-y-4">
                                    {filed.map((report) => (
                                        <FiledCard key={report.id} report={report} />
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>
                )}
            </Page>
        </AppLayout>
    );
}
