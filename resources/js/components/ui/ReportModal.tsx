import { router } from '@inertiajs/react';
import { useState } from 'react';
import Modal from './Modal';

interface ReportModalProps {
    /** e.g. /listings/5/report or /users/3/report */
    action: string;
    title: string;
    reasons: Record<string, string>;
    onClose: () => void;
    /** Optional explanation shown above the form. */
    note?: string;
}

export default function ReportModal({
    action,
    title,
    reasons,
    onClose,
    note,
}: ReportModalProps) {
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
                {note && (
                    <p className="rounded-xl bg-[#F3F8F5] p-3 text-sm text-[#34483e]">{note}</p>
                )}

                <div>
                    <label
                        htmlFor="report-reason"
                        className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                        Reason
                    </label>

                    <select
                        id="report-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#176B4D]"
                    >
                        <option value="">Select a reason…</option>
                        {Object.entries(reasons).map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        ))}
                    </select>

                    {errors.reason && (
                        <p className="mt-1 text-xs text-red-600">
                            {errors.reason}
                        </p>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="report-description"
                        className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                        Tell us what happened (optional)
                    </label>

                    <textarea
                        id="report-description"
                        rows={4}
                        maxLength={1000}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#176B4D]"
                        placeholder="Tell us what happened…"
                    />

                    {errors.description && (
                        <p className="mt-1 text-xs text-red-600">
                            {errors.description}
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={submit}
                        disabled={!reason || processing}
                        className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {processing ? 'Submitting…' : 'Submit report'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
