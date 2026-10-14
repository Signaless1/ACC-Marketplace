import { Star } from 'lucide-react';
import { KeyboardEvent, useState } from 'react';

interface RatingStarsProps {
    /** Current value, 0–5. Fractions are allowed in display mode. */
    value: number;
    size?: number;
    /** When true the stars are a radio group the user can change. */
    interactive?: boolean;
    onChange?: (value: number) => void;
    /** Accessible name for the interactive group. */
    label?: string;
}

const STAR_VALUES = [1, 2, 3, 4, 5];
const FILLED = 'fill-amber-400 text-amber-400';
const EMPTY = 'text-slate-300';

/** Compact "★ 4.5 (12)" used on cards, or a quiet empty state. */
export function RatingBadge({
    average,
    count,
    size = 15,
    emptyLabel = 'No ratings yet',
}: {
    average: number | string | null | undefined;
    count: number | null | undefined;
    size?: number;
    emptyLabel?: string;
}) {
    const value = average === null || average === undefined ? null : Number(average);

    if (value === null || Number.isNaN(value) || !count) {
        return <span className="text-xs font-medium text-ink-500">{emptyLabel}</span>;
    }

    return (
        <span
            className="inline-flex items-center gap-1 text-sm"
            aria-label={`Rated ${value.toFixed(1)} out of 5 from ${count} rating${count === 1 ? '' : 's'}`}
        >
            <Star size={size} aria-hidden="true" className={FILLED} />
            <span className="font-bold text-ink-900">{value.toFixed(1)}</span>
            <span className="text-ink-500">({count})</span>
        </span>
    );
}

/**
 * Display mode: read-only stars (fractions render as filled when ≥ n − 0.25).
 * Interactive mode: accessible radio group — click, or use arrow keys / Home / End.
 */
export default function RatingStars({
    value,
    size = 16,
    interactive = false,
    onChange,
    label = 'Rating',
}: RatingStarsProps) {
    const [hover, setHover] = useState(0);

    if (!interactive) {
        return (
            <span
                className="inline-flex items-center gap-0.5"
                role="img"
                aria-label={`${value} out of 5 stars`}
            >
                {STAR_VALUES.map((n) => (
                    <Star
                        key={n}
                        size={size}
                        aria-hidden="true"
                        className={value >= n - 0.25 ? FILLED : EMPTY}
                    />
                ))}
            </span>
        );
    }

    const select = (next: number) => onChange?.(Math.min(5, Math.max(1, next)));

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        const current = value || 0;
        const keys: Record<string, number> = {
            ArrowRight: current + 1,
            ArrowUp: current + 1,
            ArrowLeft: current - 1,
            ArrowDown: current - 1,
            Home: 1,
            End: 5,
        };

        if (event.key in keys) {
            event.preventDefault();
            select(keys[event.key]);
        }
    };

    const shown = hover || value;

    return (
        <div
            role="radiogroup"
            aria-label={label}
            className="inline-flex items-center gap-1"
            onMouseLeave={() => setHover(0)}
        >
            {STAR_VALUES.map((n) => (
                <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={value === n}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    tabIndex={value === n || (value === 0 && n === 1) ? 0 : -1}
                    onMouseEnter={() => setHover(n)}
                    onClick={() => select(n)}
                    onKeyDown={onKeyDown}
                    className="rounded p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-coral-600"
                >
                    <Star
                        size={size}
                        aria-hidden="true"
                        className={shown >= n ? FILLED : EMPTY}
                    />
                </button>
            ))}
        </div>
    );
}
