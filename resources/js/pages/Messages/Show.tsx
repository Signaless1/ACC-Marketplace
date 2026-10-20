import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowLeft,
    Ban,
    CheckCheck,
    Flag,
    Package,
    Receipt,
    Send,
    ShieldAlert,
    Trash2,
} from 'lucide-react';
import { FormEvent, KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import Avatar from '../../components/ui/Avatar';
import {
    AttachButton,
    AttachmentGrid,
    CHAT_ACCEPT,
    FilePreviews,
    useFilePicker,
} from '../../components/ui/Attachments';
import DeleteMessageDialog from '../../components/ui/DeleteMessageDialog';
import ReportModal from '../../components/ui/ReportModal';
import StatusBadge from '../../components/ui/StatusBadge';
import { useLiveReload } from '../../lib/live';
import { Attachment, formatDate, formatPrice } from '../../types/shared';

interface Person {
    id: number;
    name: string;
    avatar_url: string | null;
}

interface Msg {
    id: number;
    sender_id: number;
    body: string | null;
    read_at: string | null;
    created_at: string;
    sender: Person;
    attachments: Attachment[];
    /** True when the sender deleted it for everyone: no text or files are sent. */
    deleted: boolean;
}

interface Props {
    conversation: {
        id: number;
        buyer_id: number;
        seller_id: number;
        buyer: Person;
        seller: Person;
        listing: {
            id: number;
            title: string;
            price: string;
            status: string;
            images: { id: number; path: string }[];
        };
        messages: Msg[];
    };
    currentUserId: number;
    order: { id: number; status: string; quantity: number; price: string } | null;
}

const USER_REPORT_REASONS: Record<string, string> = {
    scam: 'Scam or fraud',
    spam: 'Spam',
    harassment: 'Harassment or abusive behavior',
    inappropriate: 'Inappropriate content',
    other: 'Other',
};

/** What to show in the delete dialog: the text, or what kind of file it carries. */
function describe(message: Msg): string {
    const text = message.body?.trim();
    if (text) return text;

    const files = message.attachments;
    if (files.length === 0) return 'Message';
    if (files.length > 1) return `${files.length} attachments`;

    return files[0].kind === 'image' ? 'Photo' : files[0].kind === 'video' ? 'Video' : 'File';
}

const clock = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });

function dayLabel(iso: string) {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return formatDate(iso);
}

export default function Show({ conversation, currentUserId, order }: Props) {
    const other = conversation.buyer_id === currentUserId ? conversation.seller : conversation.buyer;
    const { listing, messages } = conversation;

    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [reporting, setReporting] = useState(false);
    const [showJump, setShowJump] = useState(false);
    const [deleting, setDeleting] = useState<Msg | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const picker = useFilePicker(5, 'chat');
    const scroller = useRef<HTMLDivElement>(null);
    const thread = useRef<HTMLUListElement>(null);
    const stickToBottom = useRef(true);
    const lastCount = useRef(messages.length);

    // New messages from the other person arrive without a refresh.
    useLiveReload(['conversation'], 3000);

    const scrollToBottom = (smooth = false) => {
        const el = scroller.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    };

    // Start at the newest message.
    useLayoutEffect(() => {
        scrollToBottom();
    }, []);

    // Photos and videos load after the first paint and make the thread taller.
    // While the reader is at the bottom, keep them pinned to the newest message.
    useEffect(() => {
        const list = thread.current;
        if (!list || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() => {
            if (stickToBottom.current) scrollToBottom();
        });
        observer.observe(list);

        return () => observer.disconnect();
    }, []);

    // When messages change: follow along only if the reader is already at the bottom.
    useEffect(() => {
        const added = messages.length > lastCount.current;
        lastCount.current = messages.length;

        if (!added) return;

        const last = messages[messages.length - 1];

        if (stickToBottom.current || last.sender_id === currentUserId) {
            scrollToBottom(true);
        } else {
            setShowJump(true);
        }
    }, [messages.length]);

    const onScroll = () => {
        const el = scroller.current;
        if (!el) return;

        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        stickToBottom.current = nearBottom;
        if (nearBottom) setShowJump(false);
    };

    const canSend = (body.trim().length > 0 || picker.files.length > 0) && !sending;

    const send = (event?: FormEvent) => {
        event?.preventDefault();
        if (!canSend) return;

        router.post(
            `/messages/${conversation.id}`,
            { body: body.trim(), attachments: picker.files },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => {
                    setSending(true);
                    setErrors({});
                },
                onFinish: () => setSending(false),
                onError: (e) => setErrors(e),
                onSuccess: () => {
                    setBody('');
                    picker.clear();
                    stickToBottom.current = true;
                },
            },
        );
    };

    // "Delete for me" hides it from your view only; "for everyone" hides it from
    // both of you. The server decides what is allowed (your own messages only).
    const removeMessage = (scope: 'me' | 'everyone') => {
        if (!deleting) return;

        // The scope travels in the address (?scope=me|everyone): a DELETE request
        // has no form body to rely on.
        router.delete(`/messages/${conversation.id}/${deleting.id}?scope=${scope}`, {
            preserveScroll: true,
            onStart: () => setDeleteBusy(true),
            onFinish: () => {
                setDeleteBusy(false);
                setDeleting(null);
            },
        });
    };

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            send();
        }
    };

    const attachmentError =
        picker.problem ?? Object.entries(errors).find(([key]) => key.startsWith('attachments'))?.[1];

    // Index of the last message I sent, for the "Seen" marker.
    const lastMineIndex = [...messages].map((m) => m.sender_id).lastIndexOf(currentUserId);

    return (
        <AppLayout>
            <Head title={`Chat with ${other.name}`} />

            <div className="mx-auto flex h-[calc(100vh-72px)] max-w-5xl flex-col px-0 sm:px-6 sm:py-5 lg:px-8">
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white sm:rounded-3xl sm:border sm:border-mist-200 sm:shadow-[var(--shadow-card)]">
                    {/* Header */}
                    <div className="shrink-0 border-b border-mist-100 px-4 py-3 sm:px-5">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/messages"
                                aria-label="Back to messages"
                                className="rounded-lg p-2 text-ink-2 transition hover:bg-mist-100 hover:text-pine-800"
                            >
                                <ArrowLeft size={20} />
                            </Link>

                            <Link href={`/users/${other.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                                <Avatar name={other.name} url={other.avatar_url} size={42} />
                                <span className="min-w-0 leading-tight">
                                    <span className="block truncate font-display text-base font-extrabold text-pine-950">
                                        {other.name}
                                    </span>
                                    <span className="block text-xs text-ink-3">
                                        {conversation.buyer_id === currentUserId ? 'Seller' : 'Buyer'}
                                    </span>
                                </span>
                            </Link>

                            <div className="flex shrink-0 items-center gap-1.5">
                                {order && (
                                    <Link
                                        href={`/orders/${order.id}/report`}
                                        className="ui-btn ui-btn-ghost ui-btn-sm !px-2.5 sm:!px-3.5"
                                        title="Compile this transaction and report a problem"
                                        aria-label="Report transaction"
                                    >
                                        <Receipt size={16} />
                                        <span className="hidden sm:inline">Report transaction</span>
                                    </Link>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setReporting(true)}
                                    aria-label={`Report ${other.name}`}
                                    title={`Report ${other.name}`}
                                    className="rounded-lg p-2 text-ink-3 transition hover:bg-red-50 hover:text-red-700"
                                >
                                    <Flag size={18} />
                                </button>
                            </div>
                        </div>

                        {/* The item being discussed */}
                        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-mist-50 p-2.5 ring-1 ring-mist-200">
                            <Link
                                href={`/listings/${listing.id}`}
                                className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-mist-100"
                            >
                                {listing.images[0] ? (
                                    <img
                                        src={`/storage/${listing.images[0].path}`}
                                        alt={listing.title}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="flex h-full items-center justify-center text-mist-300">
                                        <Package size={24} />
                                    </span>
                                )}
                            </Link>

                            <div className="min-w-0 flex-1">
                                <Link
                                    href={`/listings/${listing.id}`}
                                    className="block truncate text-sm font-bold text-ink hover:text-pine-700"
                                >
                                    {listing.title}
                                </Link>
                                <p className="font-display text-base font-extrabold text-pine-900">
                                    {formatPrice(listing.price)}
                                </p>
                            </div>

                            {order ? (
                                <Link href="/orders" className="flex flex-col items-end gap-1">
                                    <StatusBadge status={order.status} label={`Order ${order.status}`} />
                                    <span className="text-[11px] font-semibold text-pine-700 underline underline-offset-2">
                                        View order
                                    </span>
                                </Link>
                            ) : (
                                <StatusBadge status={listing.status} />
                            )}
                        </div>
                    </div>

                    {/* Thread */}
                    <div
                        ref={scroller}
                        onScroll={onScroll}
                        className="thin-scroll relative min-h-0 flex-1 overflow-y-auto bg-mist-50 px-4 py-5 sm:px-6"
                    >
                        <p className="mx-auto mb-5 flex max-w-md items-start gap-2 rounded-xl bg-white px-4 py-3 text-xs leading-relaxed text-ink-2 ring-1 ring-mist-200">
                            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-sun-700" />
                            Keep the deal inside ACC Marketplace. Meet on campus during the day and never share
                            passwords or one-time codes.
                        </p>

                        {messages.length === 0 && (
                            <p className="py-12 text-center text-sm text-ink-2">
                                No messages yet. Say hello and ask about the item.
                            </p>
                        )}

                        <ul ref={thread} className="space-y-1.5">
                            {messages.map((message, index) => {
                                const mine = message.sender_id === currentUserId;
                                const previous = messages[index - 1];
                                const newDay =
                                    !previous ||
                                    new Date(previous.created_at).toDateString() !==
                                        new Date(message.created_at).toDateString();
                                const firstOfRun = !previous || previous.sender_id !== message.sender_id || newDay;

                                return (
                                    <li key={message.id}>
                                        {newDay && (
                                            <div className="my-4 flex justify-center">
                                                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-ink-3 ring-1 ring-mist-200">
                                                    {dayLabel(message.created_at)}
                                                </span>
                                            </div>
                                        )}

                                        <div className={`group flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'} ${firstOfRun ? 'mt-3' : ''}`}>
                                            {mine && !message.deleted && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleting(message)}
                                                    aria-label="Delete message"
                                                    title="Delete message"
                                                    className="self-center rounded-full p-1.5 text-ink-3 opacity-0 transition hover:bg-mist-100 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-70"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            )}

                                            {!mine && (
                                                <span className="w-8 shrink-0">
                                                    {firstOfRun && (
                                                        <Avatar name={message.sender.name} url={message.sender.avatar_url} size={32} />
                                                    )}
                                                </span>
                                            )}

                                            <div className={`flex max-w-[82%] flex-col sm:max-w-[70%] ${mine ? 'items-end' : 'items-start'}`}>
                                                {message.deleted ? (
                                                    <div className="flex items-center gap-2 rounded-2xl bg-white/70 px-4 py-2.5 text-[14px] italic text-ink-3 ring-1 ring-mist-200">
                                                        <Ban size={14} className="shrink-0" />
                                                        {mine ? 'You deleted this message' : 'This message was deleted'}
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={`rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm ${
                                                            mine
                                                                ? 'rounded-br-md bg-pine-800 text-white'
                                                                : 'rounded-bl-md bg-white text-ink ring-1 ring-mist-200'
                                                        }`}
                                                    >
                                                        {message.body && (
                                                            <p className="whitespace-pre-wrap break-words">{message.body}</p>
                                                        )}

                                                        {message.attachments.length > 0 && (
                                                            <div className={message.body ? 'mt-2.5' : ''}>
                                                                <AttachmentGrid
                                                                    attachments={message.attachments}
                                                                    tone={mine ? 'dark' : 'light'}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <span className="mt-1 flex items-center gap-1 px-1 text-[11px] text-ink-3">
                                                    {clock(message.created_at)}
                                                    {mine && index === lastMineIndex && message.read_at && (
                                                        <span className="inline-flex items-center gap-0.5 font-semibold text-pine-700">
                                                            <CheckCheck size={13} /> Seen
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {showJump && (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    scrollToBottom(true);
                                    setShowJump(false);
                                }}
                                className="ui-pop absolute -top-14 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-pine-800 px-4 py-2 text-xs font-bold text-white shadow-lg"
                            >
                                <ArrowDown size={14} /> New messages
                            </button>
                        </div>
                    )}

                    {/* Composer */}
                    <form onSubmit={send} className="shrink-0 border-t border-mist-100 bg-white p-3 sm:p-4">
                        {picker.files.length > 0 && (
                            <div className="mb-3">
                                <FilePreviews files={picker.files} onRemove={picker.remove} />
                            </div>
                        )}

                        {(attachmentError || errors.body) && (
                            <p className="ui-error mb-2 !mt-0" role="alert">
                                {attachmentError ?? errors.body}
                            </p>
                        )}

                        <div className="flex items-end gap-2">
                            <AttachButton
                                accept={CHAT_ACCEPT}
                                onPick={picker.add}
                                label="Attach photos, videos or files"
                                disabled={sending}
                            />

                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                onKeyDown={onKeyDown}
                                rows={1}
                                maxLength={5000}
                                placeholder="Write a message…"
                                aria-label="Message"
                                className="ui-input max-h-36 min-h-11 flex-1 resize-none !rounded-2xl !py-2.5"
                                style={{ height: 'auto' }}
                                onInput={(e) => {
                                    const el = e.currentTarget;
                                    el.style.height = 'auto';
                                    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
                                }}
                            />

                            <button
                                type="submit"
                                disabled={!canSend}
                                aria-label="Send message"
                                className="ui-btn ui-btn-primary !h-11 !w-11 shrink-0 !rounded-2xl !px-0"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                        <p className="mt-1.5 hidden px-1 text-[11px] text-ink-3 sm:block">
                            Enter to send · Shift + Enter for a new line · up to 5 files, 25 MB each
                        </p>
                    </form>
                </div>
            </div>

            {deleting && (
                <DeleteMessageDialog
                    summary={describe(deleting)}
                    attachmentCount={deleting.attachments.length}
                    otherName={other.name}
                    processing={deleteBusy}
                    onDelete={removeMessage}
                    onClose={() => setDeleting(null)}
                />
            )}

            {reporting && (
                <ReportModal
                    action={`/users/${other.id}/report`}
                    title={`Report ${other.name}`}
                    reasons={USER_REPORT_REASONS}
                    onClose={() => setReporting(false)}
                />
            )}
        </AppLayout>
    );
}
