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

    useEffect(() => {
        const incoming: ToastItem[] = [];

        if (flash?.success) {
            incoming.push({
                id: Date.now(),
                kind: 'success',
                message: flash.success,
            });
        }

        if (flash?.error) {
            incoming.push({
                id: Date.now() + 1,
                kind: 'error',
                message: flash.error,
            });
        }

        if (incoming.length === 0) {
            return;
        }

        setToasts((current) => [...current, ...incoming]);

        const timers = incoming.map((toast) =>
            window.setTimeout(() => dismiss(toast.id), 5000),
        );

        return () => timers.forEach((timer) => window.clearTimeout(timer));
    }, [flash?.success, flash?.error]);

    const dismiss = (id: number) =>
        setToasts((current) => current.filter((toast) => toast.id !== id));

    if (toasts.length === 0) {
        return null;
    }

    return (
        <div
            className="fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
            role="status"
            aria-live="polite"
        >
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${
                        toast.kind === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-red-200 bg-red-50 text-red-800'
                    }`}
                >
                    {toast.kind === 'success' ? (
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                    ) : (
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    )}

                    <p className="flex-1 font-medium">{toast.message}</p>

                    <button
                        type="button"
                        onClick={() => dismiss(toast.id)}
                        aria-label="Dismiss"
                        className="opacity-60 transition hover:opacity-100"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
}
