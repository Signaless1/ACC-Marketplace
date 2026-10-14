import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import Modal from './Modal';

interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmLabel: string;
    tone?: 'danger' | 'primary';
    /** Show an optional free-text box and pass its value to onConfirm. */
    askReason?: string;
    processing?: boolean;
    onConfirm: (reason: string) => void;
    onClose: () => void;
}

export default function ConfirmDialog({
    title,
    message,
    confirmLabel,
    tone = 'danger',
    askReason,
    processing = false,
    onConfirm,
    onClose,
}: ConfirmDialogProps) {
    const [reason, setReason] = useState('');

    return (
        <Modal title={title} onClose={onClose} size="sm">
            <div className="flex gap-3">
                {tone === 'danger' && (
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                        <AlertTriangle size={18} />
                    </span>
                )}
                <p className="text-sm leading-relaxed text-ink-2">{message}</p>
            </div>

            {askReason && (
                <div className="mt-4">
                    <label htmlFor="confirm-reason" className="ui-label">
                        {askReason}
                    </label>
                    <textarea
                        id="confirm-reason"
                        rows={3}
                        maxLength={255}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="ui-input"
                        placeholder="Optional"
                    />
                </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={onClose} className="ui-btn ui-btn-outline ui-btn-sm">
                    Keep it
                </button>
                <button
                    type="button"
                    disabled={processing}
                    onClick={() => onConfirm(reason)}
                    className={`ui-btn ui-btn-sm ${tone === 'danger' ? 'ui-btn-danger' : 'ui-btn-primary'}`}
                >
                    {processing ? 'Working…' : confirmLabel}
                </button>
            </div>
        </Modal>
    );
}
