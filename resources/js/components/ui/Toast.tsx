import { usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SharedProps } from '../../types/shared';

interface ToastItem {
    id: number;
    kind: 'success' | 'error';
    message: string;
}

export default function Toast() {
    const { flash } = usePage<SharedProps>().props;
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const dismiss = (id: number) =>
        setToasts((current) => current.filter((toast) => toast.id !== id));

    useEffect(() => {
        const incoming: ToastItem[] = [];

        if (flash?.success) {
            incoming.push({ id: Date.now(), kind: 'success', message: flash.success });
        }

        if (flash?.error) {
            incoming.push({ id: Date.now() + 1, kind: 'error', message: flash.error });
        }

        if (incoming.length === 0) return;

        setToasts((current) => [...current, ...incoming]);

        const timers = incoming.map((toast) =>
            window.setTimeout(() => dismiss(toast.id), 5500),
        );

        return () => timers.forEach((timer) => window.clearTimeout(timer));
    }, [flash?.success, flash?.error]);

    if (toasts.length === 0) return null;

    return (
        <div
            className="pointer-events-none fixed right-4 top-4 z-[120] print:hidden flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
            role="status"
            aria-live="polite"
        >
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`ui-slide-in pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white px-4 py-3.5 text-sm shadow-[var(--shadow-lift)] ${
                        toast.kind === 'success'
                            ? 'border-pine-600/30'
                            : 'border-red-300'
                    }`}
                >
                    <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                            toast.kind === 'success'
                                ? 'bg-mist-100 text-pine-700'
                                : 'bg-red-50 text-red-600'
                        }`}
                    >
                        {toast.kind === 'success' ? (
                            <CheckCircle2 size={16} />
                        ) : (
                            <AlertCircle size={16} />
                        )}
                    </span>

                    <p className="flex-1 pt-0.5 font-medium text-ink">
                        {toast.message}
                    </p>

                    <button
                        type="button"
                        onClick={() => dismiss(toast.id)}
                        aria-label="Dismiss"
                        className="rounded-md p-0.5 text-ink-3 transition hover:bg-mist-100 hover:text-ink"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
}
