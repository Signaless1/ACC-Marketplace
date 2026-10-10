import { usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { getJson } from '../lib/http';
import type { SharedProps } from '../types/shared';

export interface IncomingMessage {
    id: number;
    conversation_id: number;
    sender_name: string | null;
    sender_avatar_url: string | null;
    preview: string;
}

interface Summary {
    unread_count: number;
    latest: IncomingMessage | null;
}

// Survives page-to-page navigation so a message is announced only once.
let lastAnnouncedId: number | null = null;

const POLL_MS = 4000;

/**
 * Quietly asks the server for the unread count every few seconds (plain
 * fetch: no page reload, no progress bar, nothing flickers) and reports a
 * newly arrived message so the layout can show a pop-up.
 */
export function useMessagePolling() {
    const { props, url } = usePage<SharedProps>();
    const signedIn = Boolean(props.auth?.user);

    const [unread, setUnread] = useState<number>(props.unreadMessageCount ?? 0);
    const [incoming, setIncoming] = useState<IncomingMessage | null>(null);
    const urlRef = useRef(url);

    urlRef.current = url;

    // Server-rendered value wins whenever a page loads.
    useEffect(() => {
        setUnread(props.unreadMessageCount ?? 0);
    }, [props.unreadMessageCount]);

    useEffect(() => {
        if (!signedIn) {
            return;
        }

        let stopped = false;
        let timer: number | undefined;
        const controller = new AbortController();

        const tick = async () => {
            if (stopped || document.hidden) {
                return;
            }

            try {
                const summary = await getJson<Summary>('/messages/summary', controller.signal);

                if (stopped) {
                    return;
                }

                setUnread(summary.unread_count);

                const latest = summary.latest;

                if (latest) {
                    const viewingIt = urlRef.current.startsWith(`/messages/${latest.conversation_id}`);

                    if (lastAnnouncedId !== null && latest.id > lastAnnouncedId && !viewingIt) {
                        setIncoming(latest);
                    }

                    lastAnnouncedId = Math.max(lastAnnouncedId ?? 0, latest.id);
                } else if (lastAnnouncedId === null) {
                    lastAnnouncedId = 0;
                }
            } catch {
                // Offline or signed out: try again on the next tick.
            }
        };

        const schedule = () => {
            timer = window.setInterval(tick, POLL_MS);
        };

        const onVisible = () => {
            if (!document.hidden) {
                void tick();
            }
        };

        void tick();
        schedule();
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            stopped = true;
            controller.abort();
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [signedIn]);

    return { unread, incoming, dismissIncoming: () => setIncoming(null) };
}
