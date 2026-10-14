import { router, usePage } from '@inertiajs/react';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import type { LatestMessage, SharedProps } from '../types/shared';

export interface LiveState {
    unreadMessageCount: number;
    latestMessage: LatestMessage | null;
    pendingOrderCount: number;
    pendingReportCount: number;
}

const empty: LiveState = {
    unreadMessageCount: 0,
    latestMessage: null,
    pendingOrderCount: 0,
    pendingReportCount: 0,
};

const LiveContext = createContext<LiveState>(empty);

export const useLive = () => useContext(LiveContext);

const POLL_MS = 6000;

/**
 * Keeps the sidebar badges and the new-message pop-up fresh without a page
 * refresh. It polls a tiny JSON endpoint (a few COUNT queries), not the
 * page itself, so it is cheap and does not flicker.
 */
export function LiveProvider({ children }: { children: ReactNode }) {
    const props = usePage<SharedProps>().props;
    const loggedIn = Boolean(props.auth?.user);

    const [state, setState] = useState<LiveState>({
        unreadMessageCount: props.unreadMessageCount ?? 0,
        latestMessage: props.latestMessage ?? null,
        pendingOrderCount: props.pendingOrderCount ?? 0,
        pendingReportCount: props.pendingReportCount ?? 0,
    });

    // A normal page visit delivers fresh values: adopt them.
    useEffect(() => {
        setState({
            unreadMessageCount: props.unreadMessageCount ?? 0,
            latestMessage: props.latestMessage ?? null,
            pendingOrderCount: props.pendingOrderCount ?? 0,
            pendingReportCount: props.pendingReportCount ?? 0,
        });
    }, [
        props.unreadMessageCount,
        props.latestMessage?.id,
        props.pendingOrderCount,
        props.pendingReportCount,
    ]);

    useEffect(() => {
        if (!loggedIn) return;

        let stopped = false;
        let timer: number | undefined;
        let controller: AbortController | undefined;

        const poll = async () => {
            if (stopped) return;

            // Slow right down while the tab is in the background.
            if (document.visibilityState === 'hidden' || !navigator.onLine) {
                timer = window.setTimeout(poll, POLL_MS * 5);
                return;
            }

            controller = new AbortController();

            try {
                const response = await fetch('/live', {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'same-origin',
                    signal: controller.signal,
                });

                if (response.ok && !stopped) {
                    setState((await response.json()) as LiveState);
                }
            } catch {
                // Offline or interrupted: try again on the next tick.
            }

            if (!stopped) timer = window.setTimeout(poll, POLL_MS);
        };

        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                window.clearTimeout(timer);
                poll();
            }
        };

        timer = window.setTimeout(poll, POLL_MS);
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            stopped = true;
            window.clearTimeout(timer);
            controller?.abort();
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [loggedIn]);

    return <LiveContext.Provider value={state}>{children}</LiveContext.Provider>;
}

/**
 * Quietly re-fetch some of the current page's props every few seconds
 * (no progress bar, scroll and typed text are kept).
 */
export function useLiveReload(only: string[], interval = 4000) {
    const key = only.join('|');

    useEffect(() => {
        let stopped = false;
        let timer: number | undefined;

        const run = () => {
            if (stopped) return;

            if (document.visibilityState === 'hidden') {
                timer = window.setTimeout(run, interval * 4);
                return;
            }

            router.reload({
                // reload() already keeps scroll position and component state.
                only: key.split('|'),
                async: true,
                showProgress: false,
                onFinish: () => {
                    if (!stopped) timer = window.setTimeout(run, interval);
                },
            });
        };

        timer = window.setTimeout(run, interval);

        return () => {
            stopped = true;
            window.clearTimeout(timer);
        };
    }, [key, interval]);
}
