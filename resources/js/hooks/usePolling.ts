import { useEffect, useRef } from 'react';

/**
 * Calls `task` every `intervalMs` while the tab is visible.
 *
 * - runs immediately when the tab becomes visible again, so nothing is stale
 * - never overlaps (the next run is scheduled after the previous one ends)
 * - backs off (up to 30s) while requests are failing, e.g. offline
 */
export function usePolling(
    task: () => Promise<void>,
    intervalMs: number,
    enabled = true,
) {
    const taskRef = useRef(task);

    taskRef.current = task;

    useEffect(() => {
        if (!enabled) {
            return;
        }

        let stopped = false;
        let timer: number | undefined;
        let failures = 0;

        const schedule = () => {
            if (stopped) {
                return;
            }

            const delay = Math.min(30000, intervalMs * 2 ** Math.min(failures, 4));

            timer = window.setTimeout(run, delay);
        };

        const run = async () => {
            if (stopped) {
                return;
            }

            if (document.visibilityState === 'hidden') {
                schedule();

                return;
            }

            try {
                await taskRef.current();
                failures = 0;
            } catch {
                failures += 1;
            }

            schedule();
        };

        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                window.clearTimeout(timer);
                void run();
            }
        };

        document.addEventListener('visibilitychange', onVisible);
        schedule();

        return () => {
            stopped = true;
            window.clearTimeout(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [intervalMs, enabled]);
}
