import { ImageIcon } from 'lucide-react';

/** Neutral stand-in shown wherever a listing has no photo yet. */
export default function ImagePlaceholder({
    label = 'No photo yet',
    size = 40,
    className = '',
}: {
    label?: string;
    size?: number;
    className?: string;
}) {
    return (
        <div
            role="img"
            aria-label={label}
            className={`flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#E4EFE8] to-[#F4EBD6] text-[#5f7a6c] ${className}`}
        >
            <ImageIcon size={size} strokeWidth={1.4} />
            {size >= 32 && <span className="text-xs font-medium">{label}</span>}
        </div>
    );
}
