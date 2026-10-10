import { Head, Link } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Check,
    CheckCheck,
    ExternalLink,
    MessageCircle,
    Send,
    Tag,
} from 'lucide-react';
import { FormEvent, KeyboardEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import AttachmentList from '../../components/ui/AttachmentList';
import Avatar from '../../components/ui/Avatar';
import FilePicker, { FilePreviews } from '../../components/ui/FilePicker';
import ImagePlaceholder from '../../components/ui/ImagePlaceholder';
import { getJson, postForm, ValidationError } from '../../lib/http';
import { AttachmentData, formatDateTime, formatPrice } from '../../types/shared';

interface UserData {
    id: number;
    name: string;
    avatar_url?: string | null;
}

interface Message {
    id: number;
    body: string;
    sender_id: number;
    read_at: string | null;
    created_at: string;
    sender?: UserData;
    attachments?: AttachmentData[];
}

interface Conversation {
    id: number;
    listing: {
        id: number;
        title: string;
        price: number;
        status: 'available' | 'reserved' | 'sold';
        category: { id: number; name: string };
        images: { id: number; path: string }[];
    };
    buyer: UserData;
    seller: UserData;
    messages: Message[];
}

interface Props {
    conversation: Conversation;
    currentUserId: number;
    limits: { max_files: number; max_megabytes: number; extensions: string[] };
}

const POLL_MS = 2500;

export default function Show({ conversation, currentUserId, limits }: Props) {
    const [messages, setMessages] = useState<Message[]>(conversation.messages);
    const [readIds, setReadIds] = useState<Set<number>>(
        () => new Set(conversation.messages.filter((m) => m.read_at).map((m) => m.id)),
    );
    const [body, setBody] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const scroller = useRef<HTMLDivElement>(null);
    const stickToBottom = useRef(true);
    const lastId = useRef(conversation.messages.at(-1)?.id ?? 0);

    const otherUser = conversation.buyer.id === currentUserId ? conversation.seller : conversation.buyer;
    const listing = conversation.listing;
    const cover = listing.images[0];

    lastId.current = messages.at(-1)?.id ?? 0;

    const merge = useCallback((incoming: Message[]) => {
        if (incoming.length === 0) return;

        setMessages((current) => {
            const known = new Set(current.map((m) => m.id));
            const fresh = incoming.filter((m) => !known.has(m.id));

            return fresh.length ? [...current, ...fresh] : current;
        });
    }, []);

    // Background refresh: new messages + read receipts, no page reload.
    useEffect(() => {
        let stopped = false;
        const controller = new AbortController();

        const tick = async () => {
            if (stopped || document.hidden) return;

            try {
                const data = await getJson<{ messages: Message[]; read_ids: number[] }>(
                    `/messages/${conversation.id}/poll?after=${lastId.current}`,
                    controller.signal,
                );

                if (stopped) return;

                merge(data.messages);
                setReadIds((current) => {
                    const next = new Set(current);
                    data.read_ids.forEach((id) => next.add(id));

                    return next.size === current.size ? current : next;
                });
            } catch {
                // Temporary network problem; the next tick retries.
            }
        };

        const timer = window.setInterval(tick, POLL_MS);
        const onVisible = () => !document.hidden && void tick();
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            stopped = true;
            controller.abort();
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [conversation.id, merge]);

    // Keep the view pinned to the newest message unless the reader scrolled up.
    useLayoutEffect(() => {
        const el = scroller.current;
        if (el && stickToBottom.current) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages.length]);

    const onScroll = () => {
        const el = scroller.current;
        if (el) {
            stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }
    };

    const send = async (event?: FormEvent) => {
        event?.preventDefault();

        if (sending || (!body.trim() && files.length === 0)) return;

        const form = new FormData();
        form.append('body', body);
        files.forEach((file) => form.append('attachments[]', file));

        setSending(true);
        setError('');

        try {
            const data = await postForm<{ message: Message }>(`/messages/${conversation.id}`, form);

            stickToBottom.current = true;
            merge([data.message]);
            setBody('');
            setFiles([]);
        } catch (e) {
            setError(e instanceof ValidationError || e instanceof Error ? e.message : 'Could not send.');
        } finally {
            setSending(false);
        }
    };

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void send();
        }
    };

    return (
        <AppLayout>
            <Head title={`Chat with ${otherUser.name}`} />

            <div className="mx-auto max-w-6xl">
                <Link
                    href="/messages"
                    className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#34483e] transition hover:text-[#176B4D]"
                >
                    <ArrowLeft size={18} />
                    Back to Messages
                </Link>

                <div className="surface-card grid h-[calc(100vh-190px)] min-h-[520px] overflow-hidden lg:grid-cols-[320px_1fr]">
                    {/* Listing side panel */}
                    <aside className="hidden overflow-y-auto border-r border-[#E7EEE9] bg-[#FBFDFC] lg:block">
                        <div className="p-5">
                            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#566860]">
                                About this listing
                            </p>

                            <Link
                                href={`/listings/${listing.id}`}
                                className="group block overflow-hidden rounded-2xl border border-[#E1E9E4] bg-white transition hover:border-[#BFD8CA] hover:shadow-md"
                            >
                                <div className="aspect-[4/3] overflow-hidden bg-[#EEF4F0]">
                                    {cover ? (
                                        <img
                                            src={`/storage/${cover.path}`}
                                            alt={listing.title}
                                            className="h-full w-full object-cover transition group-hover:scale-105"
                                        />
                                    ) : (
                                        <ImagePlaceholder />
                                    )}
                                </div>

                                <div className="p-4">
                                    <h3 className="line-clamp-2 text-sm font-bold text-[#12291f] group-hover:text-[#176B4D]">
                                        {listing.title}
                                    </h3>
                                    <p className="mt-2 text-lg font-bold text-[#176B4D]">{formatPrice(listing.price)}</p>
                                    <div className="mt-3 flex items-center justify-between text-xs text-[#43554c]">
                                        <span className="inline-flex items-center gap-1.5">
                                            <Tag size={13} />
                                            {listing.category.name}
                                        </span>
                                        <span className="rounded-full bg-[#EAF4EF] px-2 py-0.5 font-semibold capitalize text-[#12583F]">
                                            {listing.status}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </aside>

                    {/* Chat */}
                    <section className="flex min-h-0 flex-col">
                        <header className="flex items-center gap-3 border-b border-[#E7EEE9] bg-white px-5 py-3.5">
                            <Avatar name={otherUser.name} url={otherUser.avatar_url} size={42} />

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <h1 className="truncate font-sans text-base font-bold text-[#12291f]">
                                        {otherUser.name}
                                    </h1>
                                    <span className="rounded-full bg-[#EAF4EF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#12583F]">
                                        {conversation.seller.id === currentUserId ? 'Buyer' : 'Seller'}
                                    </span>
                                </div>
                                <p className="truncate text-xs text-[#43554c]">{listing.title}</p>
                            </div>

                            <Link
                                href={`/listings/${listing.id}`}
                                className="flex items-center gap-2 rounded-xl border border-[#dce6e0] px-3 py-2 text-xs font-semibold text-[#34483e] transition hover:border-[#BFD8CA] hover:text-[#176B4D] lg:hidden"
                            >
                                <ExternalLink size={14} />
                                Listing
                            </Link>
                        </header>

                        <div
                            ref={scroller}
                            onScroll={onScroll}
                            className="min-h-0 flex-1 overflow-y-auto bg-[#F3F7F4] px-4 py-5 sm:px-6"
                        >
                            {messages.length === 0 ? (
                                <div className="flex h-full items-center justify-center">
                                    <div className="max-w-sm text-center">
                                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#176B4D] shadow-sm">
                                            <MessageCircle size={28} />
                                        </div>
                                        <h2 className="mt-5 font-sans text-lg font-bold text-[#12291f]">
                                            Start a conversation
                                        </h2>
                                        <p className="mt-2 text-sm leading-6 text-[#43554c]">
                                            Ask about availability, condition or price. You can attach photos,
                                            videos and files too.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mx-auto max-w-3xl space-y-2">
                                    {messages.map((message, index) => {
                                        const mine = message.sender_id === currentUserId;
                                        const previous = messages[index - 1];
                                        const grouped = previous?.sender_id === message.sender_id;
                                        const sender = mine ? null : (message.sender ?? otherUser);

                                        return (
                                            <div
                                                key={message.id}
                                                className={`msg-in flex ${mine ? 'justify-end' : 'justify-start'} ${
                                                    grouped ? '' : 'pt-2'
                                                }`}
                                            >
                                                <div
                                                    className={`flex max-w-[88%] items-end gap-2 sm:max-w-[72%] ${
                                                        mine ? 'flex-row-reverse' : ''
                                                    }`}
                                                >
                                                    {!mine &&
                                                        (grouped ? (
                                                            <span className="w-8 shrink-0" />
                                                        ) : (
                                                            <Avatar
                                                                name={sender!.name}
                                                                url={sender!.avatar_url}
                                                                size={32}
                                                            />
                                                        ))}

                                                    <div
                                                        className={`min-w-0 rounded-2xl px-4 py-2.5 shadow-sm ${
                                                            mine
                                                                ? 'rounded-br-md bg-[#176B4D] text-white'
                                                                : 'rounded-bl-md border border-[#E1E9E4] bg-white text-[#12291f]'
                                                        }`}
                                                    >
                                                        {message.body && (
                                                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                                                                {message.body}
                                                            </p>
                                                        )}

                                                        <AttachmentList
                                                            attachments={message.attachments ?? []}
                                                            tone={mine ? 'dark' : 'light'}
                                                        />

                                                        <div
                                                            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                                                                mine ? 'text-white/85' : 'text-[#566860]'
                                                            }`}
                                                        >
                                                            <span>{formatDateTime(message.created_at)}</span>
                                                            {mine &&
                                                                (message.read_at || readIds.has(message.id) ? (
                                                                    <CheckCheck size={13} aria-label="Read" />
                                                                ) : (
                                                                    <Check size={13} aria-label="Sent" />
                                                                ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <form onSubmit={send} className="border-t border-[#E7EEE9] bg-white p-3 sm:p-4">
                            <div className="mx-auto max-w-3xl space-y-2">
                                {files.length > 0 && <FilePreviews files={files} onChange={setFiles} />}

                                <div
                                    className={`flex items-end gap-1 rounded-2xl border bg-[#FAFCFB] p-1.5 transition ${
                                        error
                                            ? 'border-red-300'
                                            : 'border-[#cfdcd4] focus-within:border-[#176B4D] focus-within:ring-2 focus-within:ring-[#176B4D]/15'
                                    }`}
                                >
                                    <FilePicker
                                        files={files}
                                        onChange={setFiles}
                                        max={limits.max_files}
                                        maxMegabytes={limits.max_megabytes}
                                        accept={limits.extensions.map((e) => `.${e}`).join(',')}
                                        label="Attach photos, videos or files"
                                        onReject={setError}
                                    />

                                    <textarea
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                        onKeyDown={onKeyDown}
                                        rows={1}
                                        maxLength={5000}
                                        placeholder="Write a message…"
                                        aria-label="Message"
                                        className="max-h-32 min-h-[44px] min-w-0 flex-1 resize-none bg-transparent px-2 py-3 text-sm text-[#12291f] outline-none"
                                    />

                                    <button
                                        type="submit"
                                        disabled={sending || (!body.trim() && files.length === 0)}
                                        aria-label="Send message"
                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#176B4D] text-white transition hover:bg-[#12583F] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                    >
                                        <Send size={18} className={sending ? 'animate-pulse' : ''} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between px-1 text-[11px] text-[#566860]">
                                    {error ? (
                                        <p role="alert" className="flex items-center gap-1 font-semibold text-red-600">
                                            <AlertCircle size={13} />
                                            {error}
                                        </p>
                                    ) : (
                                        <p>
                                            Enter to send · Shift+Enter for a new line · up to {limits.max_files} files,{' '}
                                            {limits.max_megabytes} MB each
                                        </p>
                                    )}
                                </div>
                            </div>
                        </form>
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
