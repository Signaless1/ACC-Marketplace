import { router } from '@inertiajs/react';
import { useState } from 'react';
import FilePicker, { FilePreviews } from './FilePicker';
import RatingStars from './RatingStars';

export interface ReviewableOrder {
    id: number;
    listing: { id: number; title: string } | null;
}

interface ReviewFormProps {
    sellerName: string;
    orders: ReviewableOrder[];
    /** Pre-select this order when it is in `orders`. */
    initialOrderId?: number | null;
    onDone?: () => void;
    onCancel?: () => void;
}

const LABELS = ['Tap a star', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/**
 * Review form: rate the product, rate the seller, write a comment and
 * attach photos/videos. The server decides who may review what.
 */
export default function ReviewForm({
    sellerName,
    orders,
    initialOrderId,
    onDone,
    onCancel,
}: ReviewFormProps) {
    const preselected = orders.find((o) => o.id === initialOrderId)?.id;
    const [orderId, setOrderId] = useState<number>(preselected ?? orders[0].id);
    const [productRating, setProductRating] = useState(0);
    const [sellerRating, setSellerRating] = useState(0);
    const [comment, setComment] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const current = orders.find((o) => o.id === orderId) ?? orders[0];

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        const form = new FormData();
        form.append('rating', String(sellerRating));
        form.append('product_rating', String(productRating));
        form.append('comment', comment);
        files.forEach((f) => form.append('attachments[]', f));

        router.post(`/orders/${orderId}/review`, form, {
            forceFormData: true,
            preserveScroll: true,
            onStart: () => {
                setProcessing(true);
                setErrors({});
            },
            onFinish: () => setProcessing(false),
            onError: (e) => setErrors(e),
            onSuccess: () => {
                setProductRating(0);
                setSellerRating(0);
                setComment('');
                setFiles([]);
                onDone?.();
            },
        });
    };

    const firstFileError = Object.entries(errors).find(([k]) => k.startsWith('attachments'))?.[1];

    return (
        <form onSubmit={submit} className="space-y-5">
            {orders.length > 1 ? (
                <div>
                    <label htmlFor="review-order" className="mb-1.5 block text-sm font-semibold text-[#2f4a3d]">
                        Which purchase are you reviewing?
                    </label>
                    <select
                        id="review-order"
                        value={orderId}
                        onChange={(e) => setOrderId(Number(e.target.value))}
                        className="w-full rounded-xl border border-[#cfdcd4] px-3 py-2.5 text-sm outline-none focus:border-[#176B4D]"
                    >
                        {orders.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.listing?.title ?? `Order #${o.id}`}
                            </option>
                        ))}
                    </select>
                </div>
            ) : (
                <p className="text-sm text-[#43554c]">
                    Purchase:{' '}
                    <span className="font-semibold text-[#12291f]">
                        {current.listing?.title ?? `Order #${current.id}`}
                    </span>
                </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-[#F6FAF7] p-4">
                    <p className="mb-1 text-sm font-bold text-[#12291f]">The product</p>
                    <RatingStars
                        interactive
                        value={productRating}
                        onChange={setProductRating}
                        size={28}
                        label="Product rating"
                    />
                    <p className="mt-1 text-xs font-medium text-[#43554c]">{LABELS[productRating]}</p>
                    {errors.product_rating && (
                        <p role="alert" className="mt-1 text-xs text-red-600">{errors.product_rating}</p>
                    )}
                </div>

                <div className="rounded-xl bg-[#F6FAF7] p-4">
                    <p className="mb-1 text-sm font-bold text-[#12291f]">The seller, {sellerName}</p>
                    <RatingStars
                        interactive
                        value={sellerRating}
                        onChange={setSellerRating}
                        size={28}
                        label={`Rating for ${sellerName}`}
                    />
                    <p className="mt-1 text-xs font-medium text-[#43554c]">{LABELS[sellerRating]}</p>
                    {errors.rating && (
                        <p role="alert" className="mt-1 text-xs text-red-600">{errors.rating}</p>
                    )}
                </div>
            </div>

            <div>
                <label htmlFor="review-comment" className="mb-1.5 block text-sm font-semibold text-[#2f4a3d]">
                    Your comment <span className="font-normal text-[#566860]">(optional)</span>
                </label>
                <textarea
                    id="review-comment"
                    rows={4}
                    maxLength={1000}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Was it as described? Was the seller easy to deal with?"
                    className="w-full rounded-xl border border-[#cfdcd4] px-3 py-2.5 text-sm outline-none focus:border-[#176B4D] focus:ring-2 focus:ring-[#176B4D]/15"
                />
                <p className="mt-1 text-right text-xs text-[#566860]">{comment.length}/1000</p>
                {errors.comment && <p role="alert" className="text-xs text-red-600">{errors.comment}</p>}
            </div>

            <div className="space-y-2">
                <FilePicker
                    variant="box"
                    label="Add photos or videos"
                    files={files}
                    onChange={setFiles}
                    max={4}
                    maxMegabytes={20}
                    accept="image/*,video/mp4,video/webm,video/quicktime"
                    onReject={(m) => setErrors((e) => ({ ...e, attachments: m }))}
                />
                <FilePreviews files={files} onChange={setFiles} />
                {firstFileError && <p role="alert" className="text-xs text-red-600">{firstFileError}</p>}
            </div>

            <div className="flex justify-end gap-2">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-xl border border-[#cfdcd4] px-4 py-2.5 text-sm font-semibold text-[#34483e] hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    disabled={productRating === 0 || sellerRating === 0 || processing}
                    className="rounded-xl bg-[#176B4D] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#12583F] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {processing ? 'Posting…' : 'Post review'}
                </button>
            </div>
        </form>
    );
}
