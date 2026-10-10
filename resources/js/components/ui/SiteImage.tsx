import { ImageIcon } from 'lucide-react';
import { useState } from 'react';

interface SiteImageProps {
    /** File name inside public/images, e.g. "acc_campus.png" */
    name: string;
    alt: string;
    /** Sizing/shape classes for the frame (aspect ratio, rounding, …) */
    className?: string;
    /** Classes for the <img> itself, e.g. "object-[65%_40%]" to move the crop */
    imageClassName?: string;
    eager?: boolean;
}

/**
 * Shows /images/<name>. If the file does not exist yet, it shows a
 * placeholder that prints the file name, so you know what to drop in.
 */
export default function SiteImage({
    name,
    alt,
    className = '',
    imageClassName = '',
    eager = false,
}: SiteImageProps) {
    const [failed, setFailed] = useState(false);

    // Callers may pass "absolute inset-0"; otherwise the frame is relative.
    const position = /\babsolute\b/.test(className) ? '' : 'relative';

    return (
        <div
            className={`${position} overflow-hidden bg-pine-800 ${className}`}
        >
            {failed ? (
                <div
                    role="img"
                    aria-label={alt}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-pine-700 to-pine-900 p-4 text-center text-white/75"
                >
                    <ImageIcon size={28} strokeWidth={1.5} />
                    <span className="break-all font-body text-xs font-medium">
                        {name}
                    </span>
                </div>
            ) : (
                <img
                    src={`/images/${name}`}
                    alt={alt}
                    loading={eager ? 'eager' : 'lazy'}
                    decoding="async"
                    onError={() => setFailed(true)}
                    className={`absolute inset-0 h-full w-full object-cover ${imageClassName}`}
                />
            )}
        </div>
    );
}
