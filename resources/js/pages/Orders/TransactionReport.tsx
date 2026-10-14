import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Flag, Printer, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import { Page } from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDateTime, formatPrice } from '../../types/shared';

interface Props {
    summary: {
        reference: string;
        generated_at: string;
        order: {
            id: number;
            reference: string;
            status: string;
            quantity: number;
            unit_price: string;
            total: string;
            placed_at: string;
            cancel_reason: string | null;
        };
        listing: {
            id: number;
            title: string;
            category: string | null;
            type: string;
            condition: string | null;
            current_price: string;
            removed: boolean;
            removed_reason: string | null;
        } | null;
        buyer: { id: number; name: string; email: string; member_since: string };
        seller: { id: number; name: string; email: string; member_since: string };
        timeline: { label: string; at: string; by: string | null; note?: string | null }[];
        messages: {
            id: number;
            sender: string | null;
            role: 'buyer' | 'seller';
            body: string | null;
            at: string;
            /** The sender deleted it for everyone. Only admins receive its content. */
            deleted: boolean;
            attachments: { name: string; kind: string; size: string }[];
        }[];
        reports: {
            id: number;
            reporter: string | null;
            reason: string;
            description: string | null;
            status: string;
            filed_at: string;
            escalated_to: string | null;
            escalated_at: string | null;
            admin_note: string | null;
        }[];
    };
    reasons: Record<string, string>;
    viewerRole: 'buyer' | 'seller' | 'admin';
    canSubmit: boolean;
    openReport: { id: number; status: string; reason: string; created_at: string } | null;
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="break-inside-avoid border-t border-mist-200 px-8 py-6 first:border-0 print:px-0">
            <h2 className="mb-3 font-display text-[13px] font-extrabold uppercase tracking-wider text-pine-700">
                {title}
            </h2>
            {children}
        </section>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-3">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-ink">{children}</dd>
        </div>
    );
}

export default function TransactionReport({ summary, reasons, viewerRole, canSubmit, openReport }: Props) {
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const submit = () =>
        router.post(
            `/orders/${summary.order.id}/report`,
            { reason, description },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onError: (e) => setErrors(e),
                onSuccess: () => {
                    setReason('');
                    setDescription('');
                    setErrors({});
                },
            },
        );

    const { order, listing, buyer, seller } = summary;

    return (
        <AppLayout>
            <Head title={`Transaction report ${summary.reference}`} />

            <Page>
                {/* Controls (hidden when printing) */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <Link
                        href={viewerRole === 'admin' ? '/admin/orders' : '/orders'}
                        className="inline-flex items-center gap-2 text-sm font-bold text-pine-700 hover:text-pine-900"
                    >
                        <ArrowLeft size={16} /> Back
                    </Link>

                    <button type="button" onClick={() => window.print()} className="ui-btn ui-btn-primary">
                        <Printer size={17} /> Print / save as PDF
                    </button>
                </div>

                <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
                    {/* The document */}
                    <article className="print-page ui-card overflow-hidden print:rounded-none print:border-0 print:shadow-none">
                        <header className="flex flex-wrap items-center justify-between gap-4 bg-pine-900 px-8 py-6 text-white print:bg-white print:px-0 print:text-black">
                            <div className="flex items-center gap-4">
                                <img src="/images/logo.png" alt="" className="h-14 w-14 rounded-full bg-white p-0.5" />
                                <div>
                                    <p className="font-display text-xl font-extrabold text-white print:text-black">
                                        ACC Marketplace
                                    </p>
                                    <p className="text-sm text-white/80 print:text-black/70">Transaction report</p>
                                </div>
                            </div>
                            <dl className="text-right text-sm">
                                <dt className="sr-only">Reference</dt>
                                <dd className="font-display text-lg font-extrabold text-sun-300 print:text-black">
                                    {summary.reference}
                                </dd>
                                <dd className="text-white/80 print:text-black/70">
                                    Generated {formatDateTime(summary.generated_at)}
                                </dd>
                            </dl>
                        </header>

                        <Block title="1. Transaction">
                            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
                                <Field label="Order number">{order.reference}</Field>
                                <Field label="Status"><StatusBadge status={order.status} /></Field>
                                <Field label="Placed">{formatDateTime(order.placed_at)}</Field>
                                <Field label="Quantity">{order.quantity}</Field>
                                <Field label="Unit price">{formatPrice(order.unit_price)}</Field>
                                <Field label="Total">{formatPrice(order.total)}</Field>
                            </dl>
                            <p className="mt-3 text-xs text-ink-3">
                                Prices are the amounts agreed when the order was placed. Payment happens in person and
                                is not recorded by the system.
                            </p>
                        </Block>

                        <Block title="2. Item or service">
                            {listing ? (
                                <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
                                    <Field label="Title">{listing.title}</Field>
                                    <Field label="Category">{listing.category ?? '—'}</Field>
                                    <Field label="Type">
                                        {listing.type === 'service' ? 'Service' : 'Item'}
                                        {listing.condition ? ` · ${listing.condition}` : ''}
                                    </Field>
                                    <Field label="Current listing price">{formatPrice(listing.current_price)}</Field>
                                    {listing.removed && (
                                        <Field label="Moderation">
                                            Removed: {listing.removed_reason ?? 'no reason recorded'}
                                        </Field>
                                    )}
                                </dl>
                            ) : (
                                <p className="text-sm text-ink-2">The listing has since been deleted.</p>
                            )}
                        </Block>

                        <Block title="3. People involved">
                            <div className="grid gap-4 sm:grid-cols-2">
                                {[
                                    ['Buyer', buyer],
                                    ['Seller', seller],
                                ].map(([role, person]) => {
                                    const p = person as typeof buyer;

                                    return (
                                        <div key={role as string} className="rounded-xl bg-mist-50 p-4 ring-1 ring-mist-200 print:bg-white">
                                            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-3">{role as string}</p>
                                            <p className="mt-1 font-display text-base font-extrabold text-pine-950">{p.name}</p>
                                            <p className="text-sm text-ink-2">{p.email}</p>
                                            <p className="text-xs text-ink-3">Member since {formatDateTime(p.member_since)}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </Block>

                        <Block title="4. Timeline">
                            <ol className="space-y-3">
                                {summary.timeline.map((event, i) => (
                                    <li key={i} className="flex gap-3 text-sm">
                                        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-pine-700" />
                                        <div>
                                            <p className="font-bold text-ink">
                                                {event.label}
                                                {event.by && <span className="font-medium text-ink-2"> · {event.by}</span>}
                                            </p>
                                            <p className="text-xs text-ink-3">{formatDateTime(event.at)}</p>
                                            {event.note && (
                                                <p className="mt-0.5 text-[13px] text-ink-2">Reason: {event.note}</p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </Block>

                        <Block title="5. Reports filed">
                            {summary.reports.length > 0 ? (
                                <ul className="space-y-3">
                                    {summary.reports.map((r) => (
                                        <li key={r.id} className="rounded-xl border border-mist-200 p-4 text-sm">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="font-bold text-ink">{r.reason}</p>
                                                <StatusBadge status={r.status} />
                                            </div>
                                            <p className="text-xs text-ink-3">
                                                Filed by {r.reporter} · {formatDateTime(r.filed_at)}
                                            </p>
                                            {r.description && (
                                                <p className="mt-2 whitespace-pre-line text-ink-2">{r.description}</p>
                                            )}
                                            {r.escalated_to && (
                                                <p className="mt-2 text-xs font-semibold text-violet-800">
                                                    Escalated to {r.escalated_to}
                                                    {r.escalated_at && ` on ${formatDateTime(r.escalated_at)}`}
                                                </p>
                                            )}
                                            {r.admin_note && (
                                                <p className="mt-1 text-xs text-ink-2">Admin note: {r.admin_note}</p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-ink-2">No report has been filed for this transaction yet.</p>
                            )}
                        </Block>

                        <Block title={`6. Conversation (${summary.messages.length} message${summary.messages.length === 1 ? '' : 's'})`}>
                            {summary.messages.length > 0 ? (
                                <ul className="space-y-2.5">
                                    {summary.messages.map((m) => (
                                        <li key={m.id} className="break-inside-avoid text-sm">
                                            <p className="text-xs text-ink-3">
                                                <strong className="text-ink">{m.sender}</strong> ({m.role}) ·{' '}
                                                {formatDateTime(m.at)}
                                                {m.deleted && (
                                                    <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700 print:bg-white print:ring-1 print:ring-red-300">
                                                        {viewerRole === 'admin' ? 'Deleted by sender' : 'Deleted'}
                                                    </span>
                                                )}
                                            </p>
                                            {m.deleted && viewerRole !== 'admin' && (
                                                <p className="mt-0.5 text-xs italic text-ink-3">This message was deleted.</p>
                                            )}
                                            {m.body && (
                                                <p className="mt-0.5 whitespace-pre-wrap break-words rounded-lg bg-mist-50 px-3 py-2 text-ink print:bg-white print:ring-1 print:ring-black/10">
                                                    {m.body}
                                                </p>
                                            )}
                                            {m.attachments.map((a, i) => (
                                                <p key={i} className="mt-1 text-xs italic text-ink-2">
                                                    Attachment: {a.name} ({a.kind}, {a.size})
                                                </p>
                                            ))}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-ink-2">The two parties have not exchanged any messages.</p>
                            )}
                        </Block>

                        <Block title="7. Review by authority">
                            <div className="grid gap-8 pt-6 sm:grid-cols-2">
                                {['Reviewed by (name and office)', 'Date and signature'].map((label) => (
                                    <div key={label}>
                                        <div className="h-px bg-ink/40" />
                                        <p className="mt-1.5 text-xs text-ink-3">{label}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-6 text-[11px] leading-relaxed text-ink-3">
                                Generated automatically by ACC Marketplace from records stored in the system at the
                                time shown above. Attachments are listed by name only.
                            </p>
                        </Block>
                    </article>

                    {/* Reporting panel (hidden when printing) */}
                    <aside className="space-y-5 xl:sticky xl:top-[92px] print:hidden order-first xl:order-last">
                        {viewerRole === 'admin' ? (
                            <div className="ui-card p-6">
                                <p className="flex items-center gap-2 font-display text-base font-extrabold text-pine-950">
                                    <ShieldCheck size={18} className="text-pine-700" /> Admin view
                                </p>
                                <p className="mt-2 text-sm leading-relaxed text-ink-2">
                                    Print this report to hand to the responsible office, then record the escalation
                                    from the Reports page.
                                </p>
                                <Link href="/admin/reports?status=all" className="ui-btn ui-btn-outline ui-btn-sm mt-4">
                                    Go to reports
                                </Link>
                            </div>
                        ) : openReport ? (
                            <div className="ui-card p-6">
                                <p className="flex items-center gap-2 font-display text-base font-extrabold text-pine-950">
                                    <Flag size={17} className="text-sun-700" /> Report submitted
                                </p>
                                <p className="mt-2 text-sm leading-relaxed text-ink-2">
                                    The admins have this transaction on file ({reasons[openReport.reason] ?? openReport.reason}).
                                    Current status: <StatusBadge status={openReport.status} />
                                </p>
                            </div>
                        ) : canSubmit ? (
                            <div className="ui-card p-6">
                                <h2 className="flex items-center gap-2 font-display text-base font-extrabold text-pine-950">
                                    <Flag size={17} className="text-red-600" /> Report this transaction
                                </h2>
                                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                                    This sends the document on the left to the marketplace admins, who can escalate
                                    it to the school office if needed.
                                </p>

                                <div className="mt-4 space-y-4">
                                    <div>
                                        <label htmlFor="tr-reason" className="ui-label">What went wrong?</label>
                                        <select
                                            id="tr-reason"
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
                                        <label htmlFor="tr-description" className="ui-label">Describe what happened</label>
                                        <textarea
                                            id="tr-description"
                                            rows={5}
                                            maxLength={2000}
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="When, where and what was agreed? What happened instead?"
                                            className={`ui-input ${errors.description ? 'ui-input-error' : ''}`}
                                        />
                                        <div className="mt-1 flex justify-between text-xs text-ink-3">
                                            <span className="text-red-600">{errors.description}</span>
                                            <span>{description.length}/2000</span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={submit}
                                        disabled={!reason || description.trim().length < 20 || processing}
                                        className="ui-btn ui-btn-danger w-full"
                                    >
                                        {processing ? 'Sending…' : 'Send report to admins'}
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        <div className="rounded-2xl bg-mist-100 p-5 text-[13px] leading-relaxed text-ink-2">
                            <strong className="text-ink">Need to go further?</strong> Use “Print / save as PDF”
                            to give this document to a teacher, guidance counselor or the student affairs office.
                            It contains the full conversation and timeline.
                        </div>
                    </aside>
                </div>
            </Page>
        </AppLayout>
    );
}
