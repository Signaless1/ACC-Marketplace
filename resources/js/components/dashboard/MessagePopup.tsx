import { Link, usePage } from '@inertiajs/react';
import { MessageCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLive } from '../../lib/live';
import type { LatestMessage } from '../../types/shared';

/**
 * Slides in when a new message arrives while you are somewhere else in
 * the app. It never shows for messages already waiting when the page loads.
 */
export default function MessagePopup() {
    const { latestMessage } = useLive();
    const { url } = usePage();
    const lastSeen = useRef<number | undefined>(undefined);
    const [popup, setPopup] = useState<LatestMessage | null>(null);

    useEffect(() => {
        // First value after load: remember it, do not announce it.
        if (lastSeen.current === undefined) {
            lastSeen.current = latestMessage?.id ?? 0;
            return;
        }

        if (!latestMessage || latestMessage.id <= lastSeen.current) return;

        lastSeen.current = latestMessage.id;

        if (url.startsWith(`/messages/${latestMessage.conversation_id}`)) return;

        setPopup(latestMessage);
        const timer = window.setTimeout(() => setPopup(null), 9000);

        return () => window.clearTimeout(timer);
    }, [latestMessage?.id]);

    if (!popup) return null;

    return (
        <div
            className="ui-slide-in fixed bottom-4 right-4 z-[110] w-[calc(100%-2rem)] max-w-sm"
            role="status"
            aria-live="polite"
        >
            <div className="flex items-start gap-3 rounded-2xl border border-mist-200 bg-white p-4 shadow-[var(--shadow-lift)]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine-800 text-white">
                    <MessageCircle size={19} />
                </span>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">
                        New message from {popup.sender ?? 'someone'}
                    </p>
                    {popup.listing && (
                        <p className="truncate text-xs text-ink-3">About: {popup.listing}</p>
                    )}
                    <p className="mt-1 line-clamp-2 text-sm text-ink-2">{popup.preview}</p>

                    <Link
                        href={`/messages/${popup.conversation_id}`}
                        onClick={() => setPopup(null)}
                        className="mt-2.5 inline-flex text-[13px] font-bold text-pine-700 underline decoration-sun-500 decoration-2 underline-offset-4 hover:text-pine-900"
                    >
                        Open conversation
                    </Link>
                </div>

                <button
                    type="button"
                    onClick={() => setPopup(null)}
                    aria-label="Dismiss"
                    className="rounded-md p-1 text-ink-3 transition hover:bg-mist-100 hover:text-ink"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
