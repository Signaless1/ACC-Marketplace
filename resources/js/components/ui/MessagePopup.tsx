import { Link } from '@inertiajs/react';
import { MessageCircle, X } from 'lucide-react';
import { useEffect } from 'react';
import type { IncomingMessage } from '../../hooks/useMessagePolling';
import Avatar from './Avatar';

interface MessagePopupProps {
    message: IncomingMessage | null;
    onDismiss: () => void;
}

/** "New message" pop-up shown in the corner when a chat arrives. */
export default function MessagePopup({ message, onDismiss }: MessagePopupProps) {
    useEffect(() => {
        if (!message) {
            return;
        }

        const timer = window.setTimeout(onDismiss, 8000);

        return () => window.clearTimeout(timer);
    }, [message, onDismiss]);

    if (!message) {
        return null;
    }

    return (
        <div
            role="status"
            aria-live="polite"
            className="toast-in no-print fixed bottom-5 right-5 z-[110] w-[calc(100%-2.5rem)] max-w-sm"
        >
            <div className="flex items-start gap-3 rounded-2xl border border-[#cfe3d8] bg-white p-4 shadow-[0_18px_50px_rgba(10,58,41,0.22)]">
                <Link
                    href={`/messages/${message.conversation_id}`}
                    onClick={onDismiss}
                    className="flex min-w-0 flex-1 items-start gap-3"
                >
                    <span className="relative">
                        <Avatar
                            name={message.sender_name ?? '?'}
                            url={message.sender_avatar_url}
                            size={42}
                        />
                        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#d4623a] text-white ring-2 ring-white">
                            <MessageCircle size={11} />
                        </span>
                    </span>

                    <span className="min-w-0">
                        <span className="block text-sm font-bold text-[#12291f]">
                            {message.sender_name ?? 'New message'}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-sm text-[#43554c]">
                            {message.preview}
                        </span>
                        <span className="mt-1.5 block text-xs font-semibold text-[#176B4D]">
                            Tap to reply
                        </span>
                    </span>
                </Link>

                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss notification"
                    className="rounded-lg p-1 text-[#566860] transition hover:bg-slate-100"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
