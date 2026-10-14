import { useState } from 'react';
import ReviewComposer from './ReviewComposer';

export interface ReviewableOrder {
    id: number;
    listing: { id: number; title: string } | null;
}

interface ReviewFormProps {
    sellerName: string;
    orders: ReviewableOrder[];
    /** Pre-select this order when it is in `orders`. */
    initialOrderId?: number | null;
}

/**
 * Inline review form (profile page, product page). Eligibility is
 * enforced by the server; this only lists the orders it said are reviewable.
 */
export default function ReviewForm({
    sellerName,
    orders,
    initialOrderId,
}: ReviewFormProps) {
    const preselected = orders.find((o) => o.id === initialOrderId)?.id;
    const [orderId, setOrderId] = useState<number>(preselected ?? orders[0].id);

    return (
        <div className="space-y-4 rounded-2xl border border-sand-200 bg-white p-5 shadow-sm">
            {orders.length > 1 ? (
                <div>
                    <label
                        htmlFor="review-order"
                        className="mb-1.5 block text-sm font-bold text-ink-900"
                    >
                        Choose a transaction to review
                    </label>
                    <select
                        id="review-order"
                        value={orderId}
                        onChange={(e) => setOrderId(Number(e.target.value))}
                        className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-700 focus:ring-4 focus:ring-brand-700/15"
                    >
                        {orders.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.listing?.title ?? `Order #${o.id}`}
                            </option>
                        ))}
                    </select>
                </div>
            ) : (
                <p className="text-sm text-ink-600">
                    Order:{' '}
                    <span className="font-semibold text-ink-900">
                        {orders[0].listing?.title ?? `#${orders[0].id}`}
                    </span>
                </p>
            )}

            {/* key: switching orders starts a fresh form */}
            <ReviewComposer
                key={orderId}
                orderId={orderId}
                sellerName={sellerName}
                idPrefix="review-inline"
            />
        </div>
    );
}
