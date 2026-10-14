import { router } from '@inertiajs/react';
import { useState } from 'react';
import Modal from './Modal';

interface ReportModalProps {
    /** e.g. /listings/5/report or /users/3/report */
    action: string;
    title: string;
    reasons: Record<string, string>;
    onClose: () => void;
}

export default function ReportModal({ action, title, reasons, onClose }: ReportModalProps) {
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const submit = () => {
        router.post(
            action,
            { reason, description },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onError: (e) => setErrors(e),
                onSuccess: onClose,
            },
        );
    };

    return (
        <Modal title={title} onClose={onClose}>
            <div className="space-y-4">
                <div>
                    <label htmlFor="report-reason" className="ui-label">Reason</label>
                    <select
                        id="report-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className={`ui-input ${errors.reason ? 'ui-input-error' : ''}`}
                    >
                        <option value="">Select a reason…</option>
                        {Object.entries(reasons).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                    {errors.reason && <p className="ui-error">{errors.reason}</p>}
                </div>

                <div>
                    <label htmlFor="report-description" className="ui-label">
                        Details <span className="font-normal text-ink-3">(optional)</span>
                    </label>
                    <textarea
                        id="report-description"
                        rows={4}
                        maxLength={1000}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="ui-input"
                        placeholder="Tell us what happened…"
                    />
                    {errors.description && <p className="ui-error">{errors.description}</p>}
                </div>

                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={onClose} className="ui-btn ui-btn-outline ui-btn-sm">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={!reason || processing}
                        className="ui-btn ui-btn-danger ui-btn-sm"
                    >
                        {processing ? 'Submitting…' : 'Submit report'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
