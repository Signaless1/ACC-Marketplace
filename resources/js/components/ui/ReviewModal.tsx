import { router } from '@inertiajs/react';
import { useState } from 'react';
import { AttachButton, FilePreviews, REVIEW_ACCEPT, useFilePicker } from './Attachments';
import Modal from './Modal';
import { RatingInput } from './Stars';

interface ReviewModalProps {
    orderId: number;
    sellerName: string;
    listingTitle: string;
    onClose: () => void;
}

export default function ReviewModal({ orderId, sellerName, listingTitle, onClose }: ReviewModalProps) {
    const [productRating, setProductRating] = useState(0);
    const [sellerRating, setSellerRating] = useState(0);
    const [comment, setComment] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const picker = useFilePicker(4, 'review');

    const submit = () => {
        router.post(
            `/orders/${orderId}/review`,
            {
                product_rating: productRating,
                rating: sellerRating,
                comment,
                attachments: picker.files,
            },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onError: (e) => setErrors(e),
                onSuccess: onClose,
            },
        );
    };

    const attachmentError = Object.entries(errors).find(([key]) => key.startsWith('attachments'))?.[1];

    return (
        <Modal title="Rate your purchase" onClose={onClose} size="lg">
            <p className="mb-5 text-sm text-ink-2">
                How did it go with <strong className="text-ink">{listingTitle}</strong>?
            </p>

            <div className="space-y-5">
                <RatingInput
                    label="The product"
                    value={productRating}
                    onChange={setProductRating}
                    error={errors.product_rating}
                />
                <RatingInput
                    label={`The seller (${sellerName})`}
                    value={sellerRating}
                    onChange={setSellerRating}
                    error={errors.rating}
                    hints={['Poor', 'Fair', 'Good', 'Very good', 'Excellent']}
                />

                <div>
                    <label htmlFor="review-comment" className="ui-label">
                        Your review <span className="font-normal text-ink-3">(optional)</span>
                    </label>
                    <textarea
                        id="review-comment"
                        rows={4}
                        maxLength={1000}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className={`ui-input ${errors.comment ? 'ui-input-error' : ''}`}
                        placeholder="Was it as described? Was the seller easy to meet?"
                    />
                    <div className="mt-1 flex justify-between text-xs text-ink-3">
                        <span>{errors.comment}</span>
                        <span>{comment.length}/1000</span>
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between">
                        <span className="ui-label !mb-0">Photos or video</span>
                        <AttachButton
                            variant="button"
                            label="Add files"
                            accept={REVIEW_ACCEPT}
                            onPick={picker.add}
                        />
                    </div>
                    <p className="ui-hint !mt-1">Up to 4 files, 25 MB each. Photos, videos or PDF.</p>

                    <div className="mt-3">
                        <FilePreviews files={picker.files} onRemove={picker.remove} />
                    </div>

                    {(picker.problem || attachmentError) && (
                        <p className="ui-error">{picker.problem ?? attachmentError}</p>
                    )}
                </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-mist-100 pt-4">
                <button type="button" onClick={onClose} className="ui-btn ui-btn-outline ui-btn-sm">
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={submit}
                    disabled={productRating === 0 || sellerRating === 0 || processing}
                    className="ui-btn ui-btn-primary ui-btn-sm"
                >
                    {processing ? 'Posting…' : 'Post review'}
                </button>
            </div>
        </Modal>
    );
}
