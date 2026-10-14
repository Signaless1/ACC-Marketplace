import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Check, Copy, Printer, Send } from 'lucide-react';
import { ReactNode, useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import AttachmentGallery from '../../components/ui/AttachmentGallery';
import { logo } from '../../config/siteImages';
import { Attachment, formatBytes, formatDate, formatDateTime, formatPrice } from '../../types/shared';

interface Person {
    id: number;
    name: string;
    email: string;
    created_at: string;
    suspended_at?: string | null;
}

interface Props {
    report: {
        id: number;
        reason: string;
        description: string | null;
        status: string;
        admin_note: string | null;
        created_at: string;
        reviewed_at: string | null;
        escalated_to: string | null;
        escalation_note: string | null;
        escalated_at: string | null;
        reporter: Person;
        reported_user: Person | null;
        reviewer: { id: number; name: string } | null;
        attachments: Attachment[];
        listing: {
            id: number;
            title: string;
            description: string;
            price: string;
            quantity: number;
            type: string;
            condition: string | null;
            status: string;
            created_at: string;
            category: { name: string };
            images: { id: number; path: string }[];
        } | null;
    };
    reference: string;
    reasonLabel: string;
    order: {
        id: number;
        quantity: number;
        price: string;
        status: string;
        created_at: string;
        events: { id: number; event: string; created_at: string; user: { id: number; name: string } | null }[];
        buyer: { id: number; name: string; email: string };
        seller: { id: number; name: string; email: string };
        review: {
            id: number;
            rating: number;
            product_rating: number | null;
            comment: string | null;
            created_at: string;
            attachments: Attachment[];
        } | null;
    } | null;
    conversation: {
        id: number;
        messages: {
            id: number;
            sender_id: number;
            body: string;
            created_at: string;
            sender: { id: number; name: string } | null;
            attachments: Attachment[];
        }[];
    } | null;
    respondentHistory: {
        other_reports: number;
        other_resolved: number;
        completed_orders: number;
        rating: number | null;
        reviews: number;
    };
    escalationTargets: string[];
    generatedBy: { id: number; name: string };
    generatedAt: string;
}

function Section({ number, title, children }: { number: number; title: string; children: ReactNode }) {
    return (
        <section className="print-avoid-break border-t border-sand-300 pt-5">
            <h2 className="mb-3 text-base font-extrabold uppercase tracking-wide text-brand-900">
                {number}. {title}
            </h2>
            {children}
        </section>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid gap-1 py-1.5 sm:grid-cols-[170px_1fr] sm:gap-4">
            <dt className="text-sm font-semibold text-ink-600">{label}</dt>
            <dd className="text-sm font-medium text-ink-900">{children}</dd>
        </div>
    );
}

const EVENT_LABEL: Record<string, string> = {
    placed: 'Order placed',
    confirmed: 'Confirmed by seller',
    completed: 'Marked completed',
    cancelled: 'Cancelled',
};

export default function ReportDossier({
    report,
    reference,
    reasonLabel,
    order,
    conversation,
    respondentHistory,
    escalationTargets,
    generatedBy,
    generatedAt,
}: Props) {
    const [copied, setCopied] = useState(false);
    const [target, setTarget] = useState(report.escalated_to && escalationTargets.includes(report.escalated_to) ? report.escalated_to : '');
    const [custom, setCustom] = useState(
        report.escalated_to && !escalationTargets.includes(report.escalated_to) ? report.escalated_to : '',
    );
    const [note, setNote] = useState(report.escalation_note ?? '');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const respondent = report.reported_user;
    const total = order ? Number(order.price) * order.quantity : 0;
    const recipient = target === 'Other' ? custom.trim() : target;

    const summary = [
        `TRANSACTION INCIDENT REPORT ${reference}`,
        `Filed: ${formatDateTime(report.created_at)}`,
        `Reason: ${reasonLabel}`,
        `Complainant: ${report.reporter.name} (${report.reporter.email})`,
        respondent ? `Respondent: ${respondent.name} (${respondent.email})` : '',
        report.listing ? `Listing: ${report.listing.title}` : '',
        order ? `Order #${order.id}: ${order.quantity} x ${formatPrice(order.price)} = ${formatPrice(total)} (${order.status})` : '',
        report.description ? `Statement: ${report.description}` : '',
        `Messages on record: ${conversation?.messages.length ?? 0}. Evidence files: ${report.attachments.length}.`,
    ]
        .filter(Boolean)
        .join('\n');

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(summary);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
        } catch {
            window.prompt('Copy this summary:', summary);
        }
    };

    const escalate = () =>
        router.post(
            `/admin/reports/${report.id}/escalate`,
            { escalated_to: recipient, escalation_note: note },
            {
                preserveScroll: true,
                onStart: () => {
                    setProcessing(true);
                    setErrors({});
                },
                onFinish: () => setProcessing(false),
                onError: (e) => setErrors(e as Record<string, string>),
            },
        );

    return (
        <AppLayout>
            <Head title={`Report ${reference}`} />

            <div className="mx-auto max-w-4xl">
                {/* Toolbar: hidden when printing */}
                <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href="/admin/reports"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-ink-700 transition hover:text-brand-700"
                    >
                        <ArrowLeft size={17} />
                        Back to reports
                    </Link>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={copy}
                            className="inline-flex items-center gap-2 rounded-xl border-2 border-brand-700 bg-white px-4 py-2.5 text-sm font-bold text-brand-800 transition hover:bg-brand-50"
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? 'Copied' : 'Copy summary'}
                        </button>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 rounded-xl bg-coral-600 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-coral-700"
                        >
                            <Printer size={16} />
                            Print / Save as PDF
                        </button>
                    </div>
                </div>

                <article className="print-page space-y-6 rounded-3xl border border-sand-200 bg-white p-6 shadow-sm sm:p-10">
                    {/* Letterhead */}
                    <header className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <img src={`/images/${logo}`} alt="" className="h-14 w-14 object-contain" />
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-600">
                                    ACC Marketplace
                                </p>
                                <h1 className="text-2xl font-bold leading-tight text-ink-900">
                                    Transaction Incident Report
                                </h1>
                            </div>
                        </div>

                        <dl className="rounded-2xl bg-sand-100 px-4 py-3 text-sm">
                            <div className="flex justify-between gap-6">
                                <dt className="font-semibold text-ink-600">Reference</dt>
                                <dd className="font-extrabold text-ink-900">{reference}</dd>
                            </div>
                            <div className="flex justify-between gap-6">
                                <dt className="font-semibold text-ink-600">Generated</dt>
                                <dd className="font-medium text-ink-900">{formatDateTime(generatedAt)}</dd>
                            </div>
                            <div className="flex justify-between gap-6">
                                <dt className="font-semibold text-ink-600">Prepared by</dt>
                                <dd className="font-medium text-ink-900">{generatedBy.name}</dd>
                            </div>
                            <div className="flex justify-between gap-6">
                                <dt className="font-semibold text-ink-600">Case status</dt>
                                <dd className="font-bold capitalize text-ink-900">{report.status}</dd>
                            </div>
                        </dl>
                    </header>

                    <p className="rounded-xl border border-coral-200 bg-coral-50 px-4 py-3 text-sm text-ink-800">
                        <strong>Confidential.</strong> This document contains personal information and private
                        messages. Share it only with the office handling the case.
                    </p>

                    <Section number={1} title="Complaint summary">
                        <dl>
                            <Row label="Reason">{reasonLabel}</Row>
                            <Row label="Filed on">{formatDateTime(report.created_at)}</Row>
                            <Row label="Filed by">
                                {report.reporter.name} ({order?.buyer.id === report.reporter.id ? 'buyer' : 'seller'})
                            </Row>
                            <Row label="Complaint against">
                                {respondent
                                    ? `${respondent.name} (${order?.buyer.id === respondent.id ? 'buyer' : 'seller'})`
                                    : '—'}
                            </Row>
                        </dl>
                    </Section>

                    <Section number={2} title="Parties involved">
                        <div className="grid gap-4 sm:grid-cols-2">
                            {[
                                ['Complainant', report.reporter],
                                ['Respondent', respondent],
                            ].map(([label, person]) =>
                                person ? (
                                    <div
                                        key={label as string}
                                        className="rounded-2xl border border-sand-200 p-4 text-sm"
                                    >
                                        <p className="text-xs font-bold uppercase tracking-wide text-ink-600">
                                            {label as string}
                                        </p>
                                        <p className="mt-1 text-base font-bold text-ink-900">
                                            {(person as Person).name}
                                        </p>
                                        <p className="text-ink-700">{(person as Person).email}</p>
                                        <p className="text-ink-600">
                                            Member since {formatDate((person as Person).created_at)}
                                        </p>
                                        {(person as Person).suspended_at && (
                                            <p className="mt-1 font-bold text-red-800">Account suspended</p>
                                        )}
                                    </div>
                                ) : null,
                            )}
                        </div>

                        <p className="mt-3 text-sm text-ink-700">
                            <strong>Respondent history:</strong> {respondentHistory.completed_orders} completed
                            order{respondentHistory.completed_orders === 1 ? '' : 's'};{' '}
                            {respondentHistory.other_reports} other report
                            {respondentHistory.other_reports === 1 ? '' : 's'} ({respondentHistory.other_resolved}{' '}
                            resolved);{' '}
                            {respondentHistory.rating !== null
                                ? `seller rating ${respondentHistory.rating.toFixed(1)}/5 from ${respondentHistory.reviews} review${respondentHistory.reviews === 1 ? '' : 's'}`
                                : 'no seller reviews'}
                            .
                        </p>
                    </Section>

                    {report.listing && (
                        <Section number={3} title="Item or service">
                            <div className="flex gap-4">
                                {report.listing.images[0] && (
                                    <img
                                        src={`/storage/${report.listing.images[0].path}`}
                                        alt=""
                                        className="h-24 w-24 shrink-0 rounded-xl object-cover ring-1 ring-black/10"
                                    />
                                )}
                                <dl className="min-w-0 flex-1">
                                    <Row label="Title">{report.listing.title}</Row>
                                    <Row label="Category">
                                        {report.listing.category.name} · {report.listing.type}
                                        {report.listing.condition ? ` · ${report.listing.condition}` : ''}
                                    </Row>
                                    <Row label="Listed price">{formatPrice(report.listing.price)}</Row>
                                    <Row label="Posted">{formatDate(report.listing.created_at)}</Row>
                                </dl>
                            </div>
                            <p className="mt-3 whitespace-pre-line break-words rounded-xl bg-sand-100 px-4 py-3 text-sm leading-6 text-ink-800">
                                {report.listing.description}
                            </p>
                        </Section>
                    )}

                    {order && (
                        <Section number={4} title="Transaction record">
                            <dl>
                                <Row label="Order">#{order.id}</Row>
                                <Row label="Buyer">{order.buyer.name}</Row>
                                <Row label="Seller">{order.seller.name}</Row>
                                <Row label="Quantity × price">
                                    {order.quantity} × {formatPrice(order.price)} ={' '}
                                    <strong>{formatPrice(total)}</strong>
                                </Row>
                                <Row label="Order status">
                                    <span className="capitalize">{order.status}</span>
                                </Row>
                            </dl>

                            <table className="mt-3 w-full text-left text-sm">
                                <thead className="bg-sand-100 text-xs font-bold uppercase tracking-wide text-ink-700">
                                    <tr>
                                        <th className="px-3 py-2">When</th>
                                        <th className="px-3 py-2">Event</th>
                                        <th className="px-3 py-2">By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-sand-200">
                                    {order.events.length > 0 ? (
                                        order.events.map((event) => (
                                            <tr key={event.id}>
                                                <td className="px-3 py-2 text-ink-700">
                                                    {formatDateTime(event.created_at)}
                                                </td>
                                                <td className="px-3 py-2 font-semibold text-ink-900">
                                                    {EVENT_LABEL[event.event] ?? event.event}
                                                </td>
                                                <td className="px-3 py-2 text-ink-800">
                                                    {event.user?.name ?? '—'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td className="px-3 py-2 text-ink-700">
                                                {formatDateTime(order.created_at)}
                                            </td>
                                            <td className="px-3 py-2 font-semibold text-ink-900">Order placed</td>
                                            <td className="px-3 py-2 text-ink-800">{order.buyer.name}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </Section>
                    )}

                    <Section number={5} title="Statement and evidence">
                        <p className="whitespace-pre-line break-words rounded-xl border border-sand-200 px-4 py-3 text-sm leading-6 text-ink-900">
                            {report.description ?? 'No written statement was provided.'}
                        </p>

                        {report.attachments.length > 0 ? (
                            <>
                                <div className="no-print mt-3">
                                    <AttachmentGallery attachments={report.attachments} size="sm" />
                                </div>
                                <ul className="mt-3 list-disc pl-5 text-sm text-ink-800">
                                    {report.attachments.map((file) => (
                                        <li key={file.id}>
                                            {file.original_name} ({formatBytes(file.size)})
                                        </li>
                                    ))}
                                </ul>
                            </>
                        ) : (
                            <p className="mt-3 text-sm text-ink-600">No evidence files were attached.</p>
                        )}
                    </Section>

                    <Section number={6} title="Conversation log">
                        {conversation && conversation.messages.length > 0 ? (
                            <ol className="space-y-2">
                                {conversation.messages.map((message) => (
                                    <li
                                        key={message.id}
                                        className="print-avoid-break rounded-xl border border-sand-200 px-4 py-2.5 text-sm"
                                    >
                                        <p className="flex flex-wrap justify-between gap-2 text-xs">
                                            <span className="font-extrabold text-ink-900">
                                                {message.sender?.name ?? 'Unknown'}
                                            </span>
                                            <span className="text-ink-600">{formatDateTime(message.created_at)}</span>
                                        </p>
                                        {message.body && (
                                            <p className="mt-1 whitespace-pre-wrap break-words text-ink-900">
                                                {message.body}
                                            </p>
                                        )}
                                        {message.attachments.length > 0 && (
                                            <p className="mt-1 text-xs font-semibold text-ink-700">
                                                Attachments:{' '}
                                                {message.attachments.map((a) => a.original_name).join(', ')}
                                            </p>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="text-sm text-ink-600">
                                No messages were exchanged between the parties on the platform.
                            </p>
                        )}
                    </Section>

                    {order?.review && (
                        <Section number={7} title="Review left for this order">
                            <p className="text-sm text-ink-900">
                                Product {order.review.product_rating ?? '—'}/5 · Seller {order.review.rating}/5
                            </p>
                            {order.review.comment && (
                                <p className="mt-2 whitespace-pre-line break-words text-sm text-ink-800">
                                    “{order.review.comment}”
                                </p>
                            )}
                        </Section>
                    )}

                    <Section number={order?.review ? 8 : 7} title="Administrative action and endorsement">
                        <dl>
                            <Row label="Case status">
                                <span className="capitalize">{report.status}</span>
                            </Row>
                            <Row label="Reviewed by">
                                {report.reviewer
                                    ? `${report.reviewer.name}${report.reviewed_at ? `, ${formatDateTime(report.reviewed_at)}` : ''}`
                                    : 'Not yet reviewed'}
                            </Row>
                            <Row label="Admin notes">{report.admin_note ?? '—'}</Row>
                            <Row label="Forwarded to">
                                {report.escalated_at
                                    ? `${report.escalated_to} on ${formatDateTime(report.escalated_at)}`
                                    : 'Not yet forwarded'}
                            </Row>
                            {report.escalation_note && <Row label="Cover note">{report.escalation_note}</Row>}
                        </dl>

                        <div className="mt-10 grid gap-10 text-sm sm:grid-cols-2">
                            <div>
                                <div className="border-b border-ink-800" />
                                <p className="mt-1 font-semibold text-ink-800">Prepared by: {generatedBy.name}</p>
                                <p className="text-ink-600">ACC Marketplace administrator</p>
                            </div>
                            <div>
                                <div className="border-b border-ink-800" />
                                <p className="mt-1 font-semibold text-ink-800">Received by (name, signature, date)</p>
                            </div>
                        </div>
                    </Section>
                </article>

                {/* Escalation: hidden when printing */}
                <section className="no-print mt-6 rounded-3xl border border-sand-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-ink-900">Forward to a person in authority</h2>
                    <p className="mt-1 text-sm text-ink-600">
                        Print or save this report as a PDF, hand it over, then record who received it so the
                        case has a paper trail.
                    </p>

                    {report.escalated_at && (
                        <p className="mt-3 rounded-xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-950">
                            Already forwarded to {report.escalated_to} on {formatDateTime(report.escalated_at)}.
                            Saving again updates the record.
                        </p>
                    )}

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className="mb-1.5 block text-sm font-bold text-ink-900">Sent to</span>
                            <select
                                value={target}
                                onChange={(e) => setTarget(e.target.value)}
                                className="w-full rounded-xl border border-sand-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-700 focus:ring-4 focus:ring-brand-700/15"
                            >
                                <option value="">Choose an office…</option>
                                {escalationTargets.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {target === 'Other' && (
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-bold text-ink-900">Name or office</span>
                                <input
                                    value={custom}
                                    maxLength={150}
                                    onChange={(e) => setCustom(e.target.value)}
                                    className="w-full rounded-xl border border-sand-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-700 focus:ring-4 focus:ring-brand-700/15"
                                />
                            </label>
                        )}

                        <label className="block sm:col-span-2">
                            <span className="mb-1.5 flex justify-between text-sm font-bold text-ink-900">
                                Cover note (optional)
                                <span className="text-xs font-medium text-ink-600">{note.length}/1000</span>
                            </span>
                            <textarea
                                rows={3}
                                maxLength={1000}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full rounded-xl border border-sand-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-700 focus:ring-4 focus:ring-brand-700/15"
                            />
                        </label>
                    </div>

                    {errors.escalated_to && (
                        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
                            {errors.escalated_to}
                        </p>
                    )}

                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={escalate}
                            disabled={!recipient || processing}
                            className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Send size={16} />
                            {processing ? 'Saving…' : 'Record as forwarded'}
                        </button>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
