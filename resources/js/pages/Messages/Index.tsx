import { Head, Link } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import Avatar from '../../components/ui/Avatar';
import ImagePlaceholder from '../../components/ui/ImagePlaceholder';
import { getJson } from '../../lib/http';
import { formatPrice, timeAgo } from '../../types/shared';

interface UserData {
    id: number;
    name: string;
    avatar_url?: string | null;
}

interface Conversation {
    id: number;
    listing: {
        id: number;
        title: string;
        price: number;
        status: string;
        images: { id: number; path: string }[];
    };
    buyer: UserData;
    seller: UserData;
    messages_max_created_at: string | null;
    unread_messages_count: number;
    last_message_preview: string | null;
}

interface Props {
    conversations: Conversation[];
    currentUserId: number;
}

export default function Index({ conversations: initial, currentUserId }: Props) {
    const [conversations, setConversations] = useState(initial);

    useEffect(() => setConversations(initial), [initial]);

    // Quiet background refresh so new chats and unread dots appear on their own.
    useEffect(() => {
        let stopped = false;

        const tick = async () => {
            if (stopped || document.hidden) return;

            try {
                const data = await getJson<{ conversations: Conversation[] }>('/messages/list');
                if (!stopped) setConversations(data.conversations);
            } catch {
                // Retry on the next tick.
            }
        };

        const timer = window.setInterval(tick, 4000);

        return () => {
            stopped = true;
            window.clearInterval(timer);
        };
    }, []);

    return (
        <AppLayout>
            <Head title="Messages" />

            <div className="mx-auto max-w-4xl">
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#176B4D] text-white shadow-md">
                        <MessageCircle size={22} />
                    </div>
                    <div>
                        <h1 className="font-sans text-2xl font-bold tracking-tight text-[#12291f]">Messages</h1>
                        <p className="text-sm text-[#43554c]">Your conversations with buyers and sellers</p>
                    </div>
                </div>

                <div className="surface-card overflow-hidden">
                    {conversations.length === 0 ? (
                        <div className="flex min-h-[380px] flex-col items-center justify-center px-6 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF4EF] text-[#176B4D]">
                                <MessageCircle size={30} />
                            </div>
                            <h2 className="mt-5 font-sans text-lg font-bold text-[#12291f]">No conversations yet</h2>
                            <p className="mt-2 max-w-sm text-sm leading-6 text-[#43554c]">
                                When you message a seller, or someone messages you about a listing, it will appear
                                here.
                            </p>
                            <Link
                                href="/marketplace"
                                className="mt-6 rounded-xl bg-[#176B4D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#12583F]"
                            >
                                Browse Marketplace
                            </Link>
                        </div>
                    ) : (
                        <ul>
                            {conversations.map((conversation) => {
                                const other =
                                    conversation.buyer.id === currentUserId ? conversation.seller : conversation.buyer;
                                const unread = conversation.unread_messages_count;
                                const cover = conversation.listing.images?.[0];

                                return (
                                    <li key={conversation.id} className="border-b border-[#EAF0EC] last:border-0">
                                        <Link
                                            href={`/messages/${conversation.id}`}
                                            className={`flex items-center gap-4 px-5 py-4 transition hover:bg-[#F3F8F5] ${
                                                unread > 0 ? 'bg-[#F6FBF8]' : ''
                                            }`}
                                        >
                                            <div className="relative shrink-0">
                                                <Avatar name={other.name} url={other.avatar_url} size={50} />
                                                {unread > 0 && (
                                                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d4623a] px-1 text-[10px] font-bold text-white ring-2 ring-white">
                                                        {unread > 9 ? '9+' : unread}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-baseline justify-between gap-3">
                                                    <h2
                                                        className={`truncate font-sans text-sm ${
                                                            unread > 0 ? 'font-bold text-[#12291f]' : 'font-semibold text-[#2f4a3d]'
                                                        }`}
                                                    >
                                                        {other.name}
                                                    </h2>
                                                    {conversation.messages_max_created_at && (
                                                        <span className="shrink-0 text-xs text-[#566860]">
                                                            {timeAgo(conversation.messages_max_created_at)}
                                                        </span>
                                                    )}
                                                </div>

                                                <p
                                                    className={`mt-0.5 truncate text-sm ${
                                                        unread > 0 ? 'font-semibold text-[#12291f]' : 'text-[#43554c]'
                                                    }`}
                                                >
                                                    {conversation.last_message_preview ?? 'No messages yet'}
                                                </p>

                                                <p className="mt-0.5 truncate text-xs text-[#566860]">
                                                    Re: {conversation.listing.title} ·{' '}
                                                    {formatPrice(conversation.listing.price)}
                                                </p>
                                            </div>

                                            <div className="hidden h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#E1E9E4] sm:block">
                                                {cover ? (
                                                    <img
                                                        src={`/storage/${cover.path}`}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <ImagePlaceholder size={20} />
                                                )}
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
