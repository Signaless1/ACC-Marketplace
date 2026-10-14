import { router } from '@inertiajs/react';
import { useState } from 'react';
import { AttachmentDropzone } from './AttachmentPicker';
import RatingStars from './RatingStars';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

function RatingRow({
    title,
    hint,
    value,
    onChange,
    error,
}: {
    title: string;
    hint: string;
    value: number;
    onChange: (value: number) => void;
    error?: string;
}) {
    return (
        <div className="rounded-2xl border border-sand-200 bg-sand-100/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="text-sm font-bold text-ink-900">{title}</p>
                    <p className="text-xs text-ink-600">{hint}</p>
                </div>

                <div className="flex items-center gap-3">
                    <RatingStars
                        interactive
                        value={value}
                        onChange={onChange}
                        size={28}
                        label={title}
                    />
                    <span className="w-20 text-sm font-semibold text-brand-800">
                        {LABELS[value]}
                    </span>
                </div>
            </div>

            {error && (
                <p role="alert" className="mt-2 text-sm font-medium text-red-700">
                    {error}
                </p>
            )}
        </div>
    );
}

/**
 * The review form itself: rate the product, rate the seller, write a
 * comment and attach photos, videos or files as proof.
 */
export default function ReviewComposer({
    orderId,
    sellerName,
    idPrefix,
    onDone,
    onCancel,
}: {
    orderId: number;
    sellerName: string;
    idPrefix: string;
    onDone?: () => void;
    onCancel?: () => void;
}) {
    const [productRating, setProductRating] = useState(0);
    const [sellerRating, setSellerRating] = useState(0);
    const [comment, setComment] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        router.post(
            `/orders/${orderId}/review`,
            {
                rating: sellerRating,
                product_rating: productRating,
                comment,
                attachments: files,
            },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => {
                    setProcessing(true);
                    setErrors({});
                },
                onFinish: () => setProcessing(false),
                onError: (e) => setErrors(e as Record<string, string>),
                onSuccess: () => {
                    setProductRating(0);
                    setSellerRating(0);
                    setComment('');
                    setFiles([]);
                    onDone?.();
                },
            },
        );
    };

    const attachmentError =
        errors.attachments ??
        Object.entries(errors).find(([key]) => key.startsWith('attachments.'))?.[1];

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            <RatingRow
                title="How is the product?"
                hint="Quality, condition, and whether it matched the listing."
                value={productRating}
                onChange={setProductRating}
                error={errors.product_rating}
            />

            <RatingRow
                title={`How was ${sellerName}?`}
                hint="Communication, honesty, and ease of meeting up."
                value={sellerRating}
                onChange={setSellerRating}
                error={errors.rating}
            />

            <div>
                <div className="mb-1.5 flex items-center justify-between">
                    <label
                        htmlFor={`${idPrefix}-comment`}
                        className="text-sm font-bold text-ink-900"
                    >
                        Comment <span className="font-medium text-ink-600">(optional)</span>
                    </label>
                    <span className="text-xs text-ink-600">{comment.length}/1000</span>
                </div>

                <textarea
                    id={`${idPrefix}-comment`}
                    rows={4}
                    maxLength={1000}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Was it as described? Was the seller easy to deal with? Anything other students should know?"
                    className="w-full resize-y rounded-xl border border-sand-300 bg-white px-3.5 py-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-500 focus:border-brand-700 focus:ring-4 focus:ring-brand-700/15"
                />

                {errors.comment && (
                    <p role="alert" className="mt-1 text-sm font-medium text-red-700">
                        {errors.comment}
                    </p>
                )}
            </div>

            <div>
                <p className="mb-1.5 text-sm font-bold text-ink-900">
                    Photos, videos or files{' '}
                    <span className="font-medium text-ink-600">(optional)</span>
                </p>

                <AttachmentDropzone files={files} setFiles={setFiles} />

                {attachmentError && (
                    <p role="alert" className="mt-2 text-sm font-medium text-red-700">
                        {attachmentError}
                    </p>
                )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-xl border border-sand-300 px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-sand-100"
                    >
                        Cancel
                    </button>
                )}

                <button
                    type="submit"
                    disabled={productRating === 0 || sellerRating === 0 || processing}
                    className="rounded-xl bg-coral-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-coral-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {processing ? 'Posting…' : 'Post review'}
                </button>
            </div>
        </form>
    );
}
