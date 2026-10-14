import RatingStars from './RatingStars';

interface RatingSummaryProps {
    average: number;
    count: number;
    /** Number of reviews per star level, keyed 5..1. */
    distribution: Record<string, number>;
    title?: string;
}

export default function RatingSummary({
    average,
    count,
    distribution,
    title,
}: RatingSummaryProps) {
    return (
        <div className="rounded-2xl border border-sand-200 bg-white p-5 shadow-sm">
            {title && (
                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-600">
                    {title}
                </p>
            )}

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="text-center sm:w-36 sm:shrink-0">
                    <p className="text-5xl font-extrabold text-ink-900">
                        {average.toFixed(1)}
                    </p>
                    <div className="mt-2 flex justify-center">
                        <RatingStars value={average} size={18} />
                    </div>
                    <p className="mt-1 text-sm text-ink-600">
                        {count} rating{count === 1 ? '' : 's'}
                    </p>
                </div>

                <ul className="flex-1 space-y-1.5" aria-label="Rating breakdown">
                    {[5, 4, 3, 2, 1].map((star) => {
                        const n = distribution[String(star)] ?? 0;
                        const pct = count > 0 ? (n / count) * 100 : 0;

                        return (
                            <li key={star} className="flex items-center gap-3 text-sm">
                                <span className="w-14 shrink-0 font-medium text-ink-700">
                                    {star} star{star > 1 ? 's' : ''}
                                </span>
                                <div
                                    className="h-2.5 flex-1 overflow-hidden rounded-full bg-sand-200"
                                    role="progressbar"
                                    aria-valuemin={0}
                                    aria-valuemax={count}
                                    aria-valuenow={n}
                                    aria-label={`${n} of ${count} ratings are ${star} stars`}
                                >
                                    <div
                                        className="h-full rounded-full bg-amber-400"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className="w-8 shrink-0 text-right tabular-nums text-ink-700">
                                    {n}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
