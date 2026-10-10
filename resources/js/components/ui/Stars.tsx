import RatingStars from './RatingStars';

interface StarsProps {
    value: number;
    size?: number;
}

/** Read-only star display. Kept for existing imports; see RatingStars. */
export default function Stars({ value, size = 16 }: StarsProps) {
    return <RatingStars value={value} size={size} />;
}
