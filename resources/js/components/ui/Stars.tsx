import { Star } from 'lucide-react';
import { useState } from 'react';

interface StarsProps {
    value: number;
    size?: number;
}

/** Read-only stars. Fractions round to the nearest half star. */
export default function Stars({ value, size = 16 }: StarsProps) {
    return (
        <span
            className="inline-flex items-center gap-0.5"
            role="img"
            aria-label={`${value} out of 5 stars`}
        >
            {[1, 2, 3, 4, 5].map((n) => {
                const fill = Math.max(0, Math.min(1, value - (n - 1)));
                const level = fill >= 0.75 ? 'full' : fill >= 0.25 ? 'half' : 'empty';

                return (
                    <span key={n} className="relative inline-block" style={{ width: size, height: size }}>
                        <Star size={size} className="absolute inset-0 text-mist-300" strokeWidth={1.6} />
                        {level !== 'empty' && (
                            <span
                                className="absolute inset-0 overflow-hidden"
                                style={{ width: level === 'half' ? '50%' : '100%' }}
                            >
                                <Star
                                    size={size}
                                    className="fill-sun-500 text-sun-500"
                                    strokeWidth={1.6}
                                />
                            </span>
                        )}
                    </span>
                );
            })}
        </span>
    );
}

interface RatingBadgeProps {
    average: number | string | null | undefined;
    count?: number;
    /** Text shown when there are no ratings yet. */
    emptyLabel?: string;
}

/** Compact "★ 4.8 (12)" used on cards. */
export function RatingBadge({ average, count = 0, emptyLabel = 'New' }: RatingBadgeProps) {
    const value = average === null || average === undefined ? null : Number(average);

    if (value === null || Number.isNaN(value) || count === 0) {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-3">
                <Star size={13} className="text-mist-300" strokeWidth={1.8} />
                {emptyLabel}
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink">
            <Star size={13} className="fill-sun-500 text-sun-500" strokeWidth={1.8} />
            {value.toFixed(1)}
            <span className="font-medium text-ink-3">({count})</span>
        </span>
    );
}

interface RatingInputProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    error?: string;
    hints?: string[];
}

const defaultHints = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/** Click-to-rate stars with a text hint, keyboard accessible. */
export function RatingInput({ label, value, onChange, error, hints = defaultHints }: RatingInputProps) {
    const [hover, setHover] = useState(0);
    const shown = hover || value;

    return (
        <div>
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-ink" id={`rating-${label}`}>
                    {label}
                </span>
                <span className="text-xs font-semibold text-pine-700">
                    {shown ? hints[shown - 1] : ''}
                </span>
            </div>

            <div
                className="mt-1 flex gap-1"
                role="radiogroup"
                aria-labelledby={`rating-${label}`}
                onMouseLeave={() => setHover(0)}
            >
                {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={value === n}
                        aria-label={`${n} star${n > 1 ? 's' : ''}`}
                        onMouseEnter={() => setHover(n)}
                        onClick={() => onChange(n)}
                        className="rounded-md p-0.5 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun-400/40"
                    >
                        <Star
                            size={32}
                            strokeWidth={1.6}
                            className={shown >= n ? 'fill-sun-500 text-sun-500' : 'text-mist-300'}
                        />
                    </button>
                ))}
            </div>

            {error && <p className="ui-error">{error}</p>}
        </div>
    );
}
