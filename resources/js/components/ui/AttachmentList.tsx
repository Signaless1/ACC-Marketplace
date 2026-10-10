import { FileText, X } from 'lucide-react';
import { useState } from 'react';
import { formatBytes } from '../../lib/http';
import { AttachmentData } from '../../types/shared';

/** Shows images, videos and files attached to a message or review. */
export default function AttachmentList({
    attachments,
    tone = 'light',
}: {
    attachments: AttachmentData[];
    /** "dark" = shown inside a green bubble. */
    tone?: 'light' | 'dark';
}) {
    const [zoom, setZoom] = useState<AttachmentData | null>(null);

    if (!attachments || attachments.length === 0) {
        return null;
    }

    const media = attachments.filter((a) => a.kind !== 'file');
    const files = attachments.filter((a) => a.kind === 'file');

    return (
        <div className="mt-2 space-y-2">
            {media.length > 0 && (
                <div className={`grid gap-2 ${media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {media.map((a) =>
                        a.kind === 'image' ? (
                            <button
                                key={a.id}
                                type="button"
                                onClick={() => setZoom(a)}
                                className="overflow-hidden rounded-xl bg-black/5"
                                aria-label={`Open ${a.original_name}`}
                            >
                                <img
                                    src={a.url}
                                    alt={a.original_name}
                                    loading="lazy"
                                    className="max-h-64 w-full object-cover"
                                />
                            </button>
                        ) : (
                            <video
                                key={a.id}
                                src={a.url}
                                controls
                                preload="metadata"
                                className="max-h-64 w-full rounded-xl bg-black"
                            />
                        ),
                    )}
                </div>
            )}

            {files.map((a) => (
                <a
                    key={a.id}
                    href={a.url}
                    download={a.original_name}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                        tone === 'dark'
                            ? 'bg-white/15 text-white hover:bg-white/25'
                            : 'bg-[#EAF4EF] text-[#12583F] hover:bg-[#dcede4]'
                    }`}
                >
                    <FileText size={16} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{a.original_name}</span>
                    <span className="shrink-0 opacity-80">{formatBytes(a.size)}</span>
                </a>
            ))}

            {zoom && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4"
                    onClick={() => setZoom(null)}
                    role="dialog"
                    aria-modal="true"
                >
                    <button
                        type="button"
                        aria-label="Close preview"
                        className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/30"
                    >
                        <X size={20} />
                    </button>
                    <img
                        src={zoom.url}
                        alt={zoom.original_name}
                        className="max-h-full max-w-full rounded-lg object-contain"
                    />
                </div>
            )}
        </div>
    );
}
