import { Download, FileText, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Attachment, formatBytes } from '../../types/shared';

/**
 * Shows files that were uploaded with a message, review or report:
 * images open in a lightbox, videos play inline, everything else is a
 * download chip.
 */
export default function AttachmentGallery({
    attachments,
    tone = 'light',
    size = 'md',
}: {
    attachments?: Attachment[] | null;
    /** `dark` is for chips that sit on a dark chat bubble. */
    tone?: 'light' | 'dark';
    size?: 'sm' | 'md';
}) {
    const [lightbox, setLightbox] = useState<Attachment | null>(null);

    useEffect(() => {
        if (!lightbox) {
            return;
        }

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setLightbox(null);
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [lightbox]);

    if (!attachments || attachments.length === 0) {
        return null;
    }

    const images = attachments.filter((a) => a.kind === 'image');
    const videos = attachments.filter((a) => a.kind === 'video');
    const files = attachments.filter((a) => a.kind === 'file');

    const thumb = size === 'sm' ? 'h-24 w-24' : 'h-28 w-28 sm:h-32 sm:w-32';

    return (
        <div className="space-y-2">
            {images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {images.map((image) => (
                        <button
                            key={image.id}
                            type="button"
                            onClick={() => setLightbox(image)}
                            className={`${thumb} overflow-hidden rounded-xl bg-sand-100 ring-1 ring-black/10 transition hover:opacity-90`}
                            aria-label={`View ${image.original_name}`}
                        >
                            <img
                                src={image.url}
                                alt={image.original_name}
                                loading="lazy"
                                className="h-full w-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}

            {videos.map((video) => (
                <video
                    key={video.id}
                    src={video.url}
                    controls
                    preload="metadata"
                    className="max-h-64 w-full max-w-sm rounded-xl bg-black"
                />
            ))}

            {files.map((file) => (
                <a
                    key={file.id}
                    href={file.url}
                    download={file.original_name}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex max-w-sm items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                        tone === 'dark'
                            ? 'border-white/30 bg-white/10 text-white hover:bg-white/20'
                            : 'border-sand-200 bg-white text-ink-800 hover:border-brand-700'
                    }`}
                >
                    <FileText size={20} className="shrink-0" />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                            {file.original_name}
                        </span>
                        <span
                            className={`block text-xs ${
                                tone === 'dark' ? 'text-white/85' : 'text-ink-500'
                            }`}
                        >
                            {formatBytes(file.size)}
                        </span>
                    </span>
                    <Download size={16} className="shrink-0" />
                </a>
            ))}

            {lightbox && (
                <div
                    className="fixed inset-0 z-[140] flex items-center justify-center bg-black/85 p-4"
                    onClick={() => setLightbox(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-label={lightbox.original_name}
                >
                    <button
                        type="button"
                        onClick={() => setLightbox(null)}
                        aria-label="Close preview"
                        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
                    >
                        <X size={22} />
                    </button>

                    <img
                        src={lightbox.url}
                        alt={lightbox.original_name}
                        onClick={(event) => event.stopPropagation()}
                        className="max-h-full max-w-full rounded-lg object-contain"
                    />
                </div>
            )}
        </div>
    );
}
