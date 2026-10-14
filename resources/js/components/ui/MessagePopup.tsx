import { Link, usePage } from '@inertiajs/react';
import { MessageCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { apiJson } from '../../lib/api';
import { usePolling } from '../../hooks/usePolling';

interface Summary {
    unread_count: number;
    latest: {
        id: number;
        conversation_id: number;
        sender_name: string | null;
        preview: string;
        created_at: string;
    } | null;
}

const STORAGE_KEY = 'acc:last-notified-message';
const POLL_MS = 5000;

const isViewing = (url: string, conversationId: number) =>
    new RegExp(`^/messages/${conversationId}(?:[/?#]|$)`).test(url);

/**
 * Polls the unread summary in the background (plain fetch, so there is
 * no progress bar or flicker), keeps the badge count current, and pops
 * up a small card when a new message arrives.
 */
export default function MessagePopup({
    onCount,
}: {
    onCount: (count: number) => void;
}) {
    const { url } = usePage();
    const [popup, setPopup] = useState<Summary['latest']>(null);
    const urlRef = useRef(url);
    const hideTimer = useRef<number | undefined>(undefined);

    urlRef.current = url;

    usePolling(async () => {
        const summary = await apiJson<Summary>('/messages/summary');

        onCount(summary.unread_count);

        const latest = summary.latest;

        if (!latest) {
            return;
        }

        const lastNotified = Number(sessionStorage.getItem(STORAGE_KEY) ?? 0);

        if (latest.id <= lastNotified) {
            return;
        }

        sessionStorage.setItem(STORAGE_KEY, String(latest.id));

        // No popup for the conversation the person is already reading.
        if (isViewing(urlRef.current, latest.conversation_id)) {
            return;
        }

        setPopup(latest);
    }, POLL_MS);

    useEffect(() => {
        if (!popup) {
            return;
        }

        window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(() => setPopup(null), 8000);

        return () => window.clearTimeout(hideTimer.current);
    }, [popup]);

    // Opening a conversation clears any popup that is still showing.
    useEffect(() => {
        if (popup && isViewing(url, popup.conversation_id)) {
            setPopup(null);
        }
    }, [url, popup]);

    if (!popup) {
        return null;
    }

    return (
        <div
            className="popup-in fixed bottom-5 right-5 z-[120] w-[calc(100%-2.5rem)] max-w-sm"
            role="status"
            aria-live="polite"
        >
            <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-white p-4 shadow-[0_18px_50px_rgba(16,36,26,0.22)]">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-600 text-white">
                    <MessageCircle size={20} />
                </span>

                <Link
                    href={`/messages/${popup.conversation_id}`}
                    className="min-w-0 flex-1"
                >
                    <p className="text-sm font-bold text-ink-900">
                        New message
                        {popup.sender_name ? ` from ${popup.sender_name}` : ''}
                    </p>

                    <p className="mt-0.5 line-clamp-2 break-words text-sm text-ink-600">
                        {popup.preview || 'Open the conversation to read it.'}
                    </p>

                    <span className="mt-2 inline-block text-xs font-bold text-coral-700 underline-offset-2 hover:underline">
                        Open conversation
                    </span>
                </Link>

                <button
                    type="button"
                    onClick={() => setPopup(null)}
                    aria-label="Dismiss notification"
                    className="rounded-lg p-1 text-ink-500 transition hover:bg-sand-100 hover:text-ink-900"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
}
