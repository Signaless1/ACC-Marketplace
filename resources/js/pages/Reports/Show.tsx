import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Paperclip, Printer, ShieldAlert } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import { formatDate, formatDateTime, formatPrice } from '../../types/shared';

interface Person {
    id: number;
    name: string;
    email: string | null;
    member_since: string;
    suspended: boolean;
}

interface Props {
    report: {
        id: number;
        reference: string;
        type: 'transaction' | 'listing' | 'user';
        reason_label: string;
        description: string | null;
        status: string;
        admin_note: string | null;
        filed_at: string;
        reviewed_at: string | null;
        reviewed_by: string | null;
        escalated_to: string | null;
        escalation_note: string | null;
        escalated_at: string | null;
    };
    reporter: Person | null;
    reportedUser: Person | null;
    listing: { id: number; title: string; price: string; type: string; status: string; hidden: boolean; posted_at: string } | null;
    order: {
        id: number;
        status: string;
        quantity: number;
        unit_price: string;
        total: number;
        placed_at: string;
        last_update_at: string;
        buyer: string | null;
        seller: string | null;
    } | null;
    review: { rating: number; product_rating: number | null; comment: string | null; created_at: string } | null;
    transcript: {
        id: number;
        sender: string | null;
        sender_id: number;
        body: string;
        sent_at: string;
        attachments: { name: string; kind: string }[];
    }[];
    priorReports: number | null;
    isAdmin: boolean;
    generatedAt: string;
    generatedBy: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="break-inside-avoid border-t border-[#dfe8e2] py-5">
            <h2 className="mb-3 font-sans text-sm font-bold uppercase tracking-wider text-[#566860]">{title}</h2>
            {children}
        </section>
    );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[160px_1fr] gap-3 py-1 text-sm">
            <dt className="font-semibold text-[#43554c]">{k}</dt>
            <dd className="text-[#12291f]">{v}</dd>
        </div>
    );
}

function PersonBlock({ p }: { p: Person | null }) {
    if (!p) return <p className="text-sm text-[#43554c]">Account no longer exists.</p>;

    return (
        <dl>
            <Row k="Name" v={p.name} />
            {p.email && <Row k="Email" v={p.email} />}
            <Row k="Member since" v={formatDate(p.member_since)} />
            {p.suspended && <Row k="Account" v={<strong className="text-red-700">Suspended</strong>} />}
        </dl>
    );
}

export default function Show(props: Props) {
    const { report, reporter, reportedUser, listing, order, review, transcript, priorReports, isAdmin } = props;

    return (
        <AppLayout>
            <Head title={`Case file ${report.reference}`} />

            <div className="mx-auto max-w-4xl">
                <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href={isAdmin ? '/admin/reports' : '/orders'}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-[#34483e] hover:text-[#176B4D]"
                    >
                        <ArrowLeft size={18} />
                        Back
                    </Link>

                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#176B4D] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#12583F]"
                    >
                        <Printer size={16} />
                        Print / save as PDF
                    </button>
                </div>

                <article className="surface-card p-7 print:border-0 print:p-0 print:shadow-none">
                    <header className="flex flex-wrap items-start justify-between gap-4 pb-5">
                        <div>
                            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#d4623a]">
                                <ShieldAlert size={15} />
                                ACC Marketplace · Case file
                            </p>
                            <h1 className="mt-1 font-sans text-2xl font-extrabold text-[#12291f]">{report.reference}</h1>
                            <p className="mt-1 text-sm text-[#43554c]">
                                {report.type === 'transaction' ? 'Transaction report' : report.type === 'listing' ? 'Listing report' : 'User report'}{' '}
                                · filed {formatDateTime(report.filed_at)}
                            </p>
                        </div>
                        <span className="rounded-full bg-[#F3F8F5] px-3 py-1.5 text-xs font-bold capitalize text-[#12583F]">
                            Status: {report.status}
                        </span>
                    </header>

                    {report.escalated_to && (
                        <div className="mb-2 rounded-xl border border-[#f0d9a0] bg-[#FBF6E8] p-4 text-sm text-[#4d3f16]">
                            <strong>Referred to {report.escalated_to}</strong>
                            {report.escalated_at && ` on ${formatDate(report.escalated_at)}`}
                            {report.escalation_note && <p className="mt-1">{report.escalation_note}</p>}
                        </div>
                    )}

                    <Section title="Complaint">
                        <dl>
                            <Row k="Reason" v={report.reason_label} />
                            <Row
                                k="Details given"
                                v={report.description ? <span className="whitespace-pre-line">{report.description}</span> : 'None provided'}
                            />
                        </dl>
                    </Section>

                    <Section title="People involved">
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div>
                                <p className="mb-1 text-xs font-bold text-[#d4623a]">Reporter</p>
                                <PersonBlock p={reporter} />
                            </div>
                            <div>
                                <p className="mb-1 text-xs font-bold text-[#d4623a]">Reported person</p>
                                <PersonBlock p={reportedUser} />
                                {priorReports !== null && (
                                    <p className="mt-2 text-sm font-semibold text-[#12291f]">
                                        Other reports against this person: {priorReports}
                                    </p>
                                )}
                            </div>
                        </div>
                    </Section>

                    {listing && (
                        <Section title="Listing">
                            <dl>
                                <Row k="Title" v={listing.title} />
                                <Row k="Type" v={listing.type} />
                                <Row k="Listed price" v={formatPrice(listing.price)} />
                                <Row k="Posted" v={formatDate(listing.posted_at)} />
                                <Row k="Visibility" v={listing.hidden ? 'Removed by a moderator' : 'Visible'} />
                            </dl>
                        </Section>
                    )}

                    {order && (
                        <Section title="Transaction">
                            <dl>
                                <Row k="Order number" v={`#${order.id}`} />
                                <Row k="Buyer" v={order.buyer} />
                                <Row k="Seller" v={order.seller} />
                                <Row k="Quantity" v={order.quantity} />
                                <Row k="Unit price" v={formatPrice(order.unit_price)} />
                                <Row k="Total" v={<strong>{formatPrice(order.total)}</strong>} />
                                <Row k="Status" v={<span className="capitalize">{order.status}</span>} />
                                <Row k="Placed" v={formatDateTime(order.placed_at)} />
                                <Row k="Last update" v={formatDateTime(order.last_update_at)} />
                            </dl>

                            {review && (
                                <p className="mt-3 rounded-xl bg-[#F3F8F5] p-3 text-sm text-[#2f4a3d]">
                                    Buyer's review: seller {review.rating}/5
                                    {review.product_rating !== null && `, product ${review.product_rating}/5`}
                                    {review.comment && ` · “${review.comment}”`}
                                </p>
                            )}
                        </Section>
                    )}

                    <Section title={`Conversation (${transcript.length} message${transcript.length === 1 ? '' : 's'})`}>
                        {transcript.length === 0 ? (
                            <p className="text-sm text-[#43554c]">No messages were exchanged between these two people.</p>
                        ) : (
                            <ol className="space-y-2.5">
                                {transcript.map((m) => (
                                    <li key={m.id} className="rounded-xl border border-[#E7EEE9] px-3.5 py-2.5 text-sm">
                                        <p className="flex justify-between gap-3 text-xs">
                                            <strong className="text-[#12291f]">{m.sender ?? 'Unknown'}</strong>
                                            <span className="text-[#566860]">{formatDateTime(m.sent_at)}</span>
                                        </p>
                                        {m.body && <p className="mt-1 whitespace-pre-line break-words text-[#2f4a3d]">{m.body}</p>}
                                        {m.attachments.map((a, i) => (
                                            <p key={i} className="mt-1 flex items-center gap-1.5 text-xs text-[#43554c]">
                                                <Paperclip size={12} />
                                                {a.kind}: {a.name}
                                            </p>
                                        ))}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Section>

                    <Section title="Handling">
                        <dl>
                            <Row k="Reviewed by" v={report.reviewed_by ?? 'Not yet reviewed'} />
                            {report.reviewed_at && <Row k="Reviewed on" v={formatDate(report.reviewed_at)} />}
                            {report.admin_note && <Row k="Admin note" v={report.admin_note} />}
                        </dl>
                    </Section>

                    <footer className="border-t border-[#dfe8e2] pt-4 text-xs text-[#566860]">
                        Generated {formatDateTime(props.generatedAt)} by {props.generatedBy}. Confidential: share only
                        with school authorities handling this case.
                    </footer>
                </article>
            </div>
        </AppLayout>
    );
}
