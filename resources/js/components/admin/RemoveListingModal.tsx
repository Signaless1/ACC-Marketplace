import { router } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import Modal from '../ui/Modal';

/**
 * Takes a listing down with a reason the seller can read. It never
 * touches the seller's account.
 */
export default function RemoveListingModal({
    listingId,
    listingTitle,
    sellerName,
    reasons,
    onClose,
}: {
    listingId: number;
    listingTitle: string;
    sellerName: string;
    reasons: Record<string, string>;
    onClose: () => void;
}) {
    const [reason, setReason] = useState('');
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const noteRequired = reason === 'other';
    const canSubmit = reason !== '' && (!noteRequired || note.trim().length > 0);

    const submit = () =>
        router.post(
            `/admin/listings/${listingId}/remove`,
            { reason, note },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onError: (e) => setErrors(e as Record<string, string>),
                onSuccess: onClose,
            },
        );

    return (
        <Modal title="Remove this listing" onClose={onClose} size="md">
            <p className="text-sm text-ink-700">
                “<span className="font-bold text-ink-900">{listingTitle}</span>” by{' '}
                {sellerName} will be taken off the marketplace.
            </p>

            <fieldset className="mt-4">
                <legend className="mb-2 text-sm font-bold text-ink-900">
                    Reason (shown to the seller)
                </legend>

                <div className="grid gap-2">
                    {Object.entries(reasons).map(([key, label]) => (
                        <label
                            key={key}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                                reason === key
                                    ? 'border-brand-700 bg-brand-50 text-ink-900'
                                    : 'border-sand-300 text-ink-800 hover:border-brand-700'
                            }`}
                        >
                            <input
                                type="radio"
                                name="removal-reason"
                                value={key}
                                checked={reason === key}
                                onChange={() => setReason(key)}
                                className="h-4 w-4 accent-[#176b4d]"
                            />
                            {label}
                        </label>
                    ))}
                </div>

                {errors.reason && (
                    <p role="alert" className="mt-2 text-sm font-medium text-red-700">
                        {errors.reason}
                    </p>
                )}
            </fieldset>

            <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="removal-note" className="text-sm font-bold text-ink-900">
                        Note to the seller{' '}
                        <span className="font-medium text-ink-600">
                            {noteRequired ? '(required)' : '(optional)'}
                        </span>
                    </label>
                    <span className="text-xs text-ink-600">{note.length}/500</span>
                </div>

                <textarea
                    id="removal-note"
                    rows={3}
                    maxLength={500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What should they fix before posting again?"
                    className="w-full rounded-xl border border-sand-300 px-3.5 py-3 text-sm text-ink-900 outline-none placeholder:text-ink-500 focus:border-brand-700 focus:ring-4 focus:ring-brand-700/15"
                />

                {errors.note && (
                    <p role="alert" className="mt-1 text-sm font-medium text-red-700">
                        {errors.note}
                    </p>
                )}
            </div>

            <p className="mt-4 flex gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-ink-800">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand-700" />
                Only the listing is removed. {sellerName}’s account stays active,
                and you can restore the listing at any time.
            </p>

            <div className="mt-5 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-sand-300 px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-sand-100"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={submit}
                    disabled={!canSubmit || processing}
                    className="rounded-xl bg-coral-600 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-coral-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {processing ? 'Removing…' : 'Remove listing'}
                </button>
            </div>
        </Modal>
    );
}
