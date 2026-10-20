import { router } from '@inertiajs/react';
import { Scale } from 'lucide-react';
import { useState } from 'react';
import { useFilePicker } from './Attachments';
import EvidenceField from './EvidenceField';
import Modal from './Modal';

const MIN_DETAILS = 20;
const MAX_DETAILS = 1000;

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
    const picker = useFilePicker(5, 'review');

    const detailsLength = description.trim().length;
    const detailsOk = detailsLength >= MIN_DETAILS;

    const submit = () => {
        router.post(
            action,
            { reason, description: description.trim(), attachments: picker.files },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => {
                    setProcessing(true);
                    setErrors({});
                },
                onFinish: () => setProcessing(false),
                onError: (e) => setErrors(e),
                onSuccess: onClose,
            },
        );
    };

    const attachmentError = Object.entries(errors).find(([key]) => key.startsWith('attachments'))?.[1];

    return (
        <Modal title={title} onClose={onClose}>
            <div className="space-y-4">
                <p className="flex items-start gap-2.5 rounded-xl bg-sun-300/25 px-3.5 py-3 text-[13px] leading-relaxed text-pine-950 ring-1 ring-sun-400/40">
                    <Scale size={16} className="mt-0.5 shrink-0 text-sun-700" />
                    <span>
                        A person reviews every report, and the other side gets to respond. Knowingly false reports
                        can lead to limits on your own account.
                    </span>
                </p>

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
                    <label htmlFor="report-description" className="ui-label">What happened?</label>
                    <textarea
                        id="report-description"
                        rows={4}
                        maxLength={MAX_DETAILS}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={`ui-input ${errors.description ? 'ui-input-error' : ''}`}
                        placeholder="Stick to the facts: what was said or done, and when."
                    />
                    <div className="mt-1 flex justify-between gap-3">
                        {errors.description ? (
                            <p className="ui-error !mt-0">{errors.description}</p>
                        ) : (
                            <span className="text-xs text-ink-3">
                                {detailsOk ? 'Thank you, that is enough detail.' : `At least ${MIN_DETAILS} characters.`}
                            </span>
                        )}
                        <span className="ml-auto text-xs text-ink-3">
                            {description.length}/{MAX_DETAILS}
                        </span>
                    </div>
                </div>

                <EvidenceField picker={picker} error={attachmentError} disabled={processing} />

                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={onClose} className="ui-btn ui-btn-outline ui-btn-sm">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={!reason || !detailsOk || processing}
                        className="ui-btn ui-btn-danger ui-btn-sm"
                    >
                        {processing ? 'Submitting…' : 'Submit report'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
