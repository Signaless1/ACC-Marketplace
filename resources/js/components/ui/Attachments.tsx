import { FileText, Film, Paperclip, X } from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Attachment } from '../../types/shared';

/* ------------------------------------------------------------------ */
/*  Picking files (chat composer + review form)                        */
/* ------------------------------------------------------------------ */

export const CHAT_ACCEPT = 'image/*,video/mp4,video/webm,video/quicktime,.pdf,.txt,.docx,.xlsx,.pptx';
export const REVIEW_ACCEPT = 'image/*,video/mp4,video/webm,video/quicktime,.pdf';

const MAX_MB = 25;

export function useFilePicker(max: number, allowed: 'chat' | 'review') {
    const [files, setFiles] = useState<File[]>([]);
    const [problem, setProblem] = useState<string | null>(null);

    const okTypes =
        allowed === 'chat'
            ? /\.(jpe?g|png|webp|gif|mp4|webm|mov|pdf|txt|docx|xlsx|pptx)$/i
            : /\.(jpe?g|png|webp|gif|mp4|webm|mov|pdf)$/i;

    const add = (incoming: FileList | File[] | null) => {
        if (!incoming) return;

        const next = [...files];
        let message: string | null = null;

        for (const file of Array.from(incoming)) {
            if (!okTypes.test(file.name)) {
                message = `“${file.name}” is not a supported file type.`;
            } else if (file.size > MAX_MB * 1024 * 1024) {
                message = `“${file.name}” is larger than ${MAX_MB} MB.`;
            } else if (next.length >= max) {
                message = `You can attach up to ${max} files.`;
            } else {
                next.push(file);
            }
        }

        setFiles(next);
        setProblem(message);
    };

    return {
        files,
        problem,
        add,
        remove: (index: number) => {
            setFiles((current) => current.filter((_, i) => i !== index));
            setProblem(null);
        },
        clear: () => {
            setFiles([]);
            setProblem(null);
        },
    };
}

/** Previews of files that are about to be sent, each with a remove button. */
export function FilePreviews({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
    const urls = useMemo(
        () => files.map((file) => (file.type.startsWith('image/') ? URL.createObjectURL(file) : null)),
        [files],
    );

    useEffect(() => () => urls.forEach((url) => url && URL.revokeObjectURL(url)), [urls]);

    if (files.length === 0) return null;

    return (
        <ul className="flex flex-wrap gap-2.5">
            {files.map((file, index) => (
                <li
                    key={`${file.name}-${index}`}
                    className="group relative flex h-16 items-center gap-2 overflow-hidden rounded-xl border border-mist-200 bg-white pr-8"
                >
                    {urls[index] ? (
                        <img src={urls[index]!} alt="" className="h-16 w-16 object-cover" />
                    ) : (
                        <span className="flex h-16 w-14 items-center justify-center bg-mist-100 text-pine-700">
                            {file.type.startsWith('video/') ? <Film size={22} /> : <FileText size={22} />}
                        </span>
                    )}

                    <span className="max-w-[9rem] pl-1 leading-tight">
                        <span className="block truncate text-xs font-semibold text-ink">{file.name}</span>
                        <span className="block text-[11px] text-ink-3">
                            {(file.size / 1048576).toFixed(file.size > 1048576 ? 1 : 2)} MB
                        </span>
                    </span>

                    <button
                        type="button"
                        onClick={() => onRemove(index)}
                        aria-label={`Remove ${file.name}`}
                        className="absolute right-1 top-1 rounded-full bg-pine-950/70 p-1 text-white transition hover:bg-red-600"
                    >
                        <X size={12} />
                    </button>
                </li>
            ))}
        </ul>
    );
}

/** The paperclip / "add files" button wired to a hidden file input. */
export function AttachButton({
    onPick,
    accept,
    label = 'Attach files',
    variant = 'icon',
    disabled = false,
}: {
    onPick: (files: FileList | null) => void;
    accept: string;
    label?: string;
    variant?: 'icon' | 'button';
    disabled?: boolean;
}) {
    const ref = useRef<HTMLInputElement>(null);

    const handle = (event: ChangeEvent<HTMLInputElement>) => {
        onPick(event.target.files);
        event.target.value = ''; // allow picking the same file again
    };

    return (
        <>
            <input
                ref={ref}
                type="file"
                multiple
                accept={accept}
                onChange={handle}
                className="hidden"
                tabIndex={-1}
            />

            {variant === 'icon' ? (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => ref.current?.click()}
                    aria-label={label}
                    title={label}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-2 transition hover:bg-mist-100 hover:text-pine-800 disabled:opacity-50"
                >
                    <Paperclip size={20} />
                </button>
            ) : (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => ref.current?.click()}
                    className="ui-btn ui-btn-outline ui-btn-sm"
                >
                    <Paperclip size={15} />
                    {label}
                </button>
            )}
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  Showing files that were already sent                               */
/* ------------------------------------------------------------------ */

export function Lightbox({
    images,
    start,
    onClose,
}: {
    images: Attachment[];
    start: number;
    onClose: () => void;
}) {
    const [index, setIndex] = useState(start);
    const current = images[index];

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
            if (event.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length);
            if (event.key === 'ArrowLeft') setIndex((i) => (i - 1 + images.length) % images.length);
        };

        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [images.length, onClose]);

    return (
        <div
            className="ui-fade fixed inset-0 z-[130] flex items-center justify-center bg-pine-950/90 p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Image viewer"
        >
            <button
                type="button"
                onClick={onClose}
                aria-label="Close viewer"
                className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25"
            >
                <X size={22} />
            </button>

            {images.length > 1 && (
                <>
                    <button
                        type="button"
                        aria-label="Previous image"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIndex((i) => (i - 1 + images.length) % images.length);
                        }}
                        className="absolute left-3 rounded-full bg-white/15 px-3.5 py-2 text-2xl text-white transition hover:bg-white/25"
                    >
                        ‹
                    </button>
                    <button
                        type="button"
                        aria-label="Next image"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIndex((i) => (i + 1) % images.length);
                        }}
                        className="absolute right-3 rounded-full bg-white/15 px-3.5 py-2 text-2xl text-white transition hover:bg-white/25"
                    >
                        ›
                    </button>
                </>
            )}

            <img
                src={current.url}
                alt={current.original_name}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[88vh] max-w-full rounded-xl object-contain shadow-2xl"
            />

            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-4 py-1.5 text-xs font-medium text-white">
                {current.original_name}
                {images.length > 1 && ` · ${index + 1} / ${images.length}`}
            </p>
        </div>
    );
}

/** Photos, videos and file chips for a message or a review. */
export function AttachmentGrid({
    attachments,
    tone = 'light',
}: {
    attachments: Attachment[];
    /** `dark` is for use inside a green chat bubble. */
    tone?: 'light' | 'dark';
}) {
    const [viewer, setViewer] = useState<number | null>(null);

    if (!attachments || attachments.length === 0) return null;

    const images = attachments.filter((a) => a.kind === 'image');
    const videos = attachments.filter((a) => a.kind === 'video');
    const files = attachments.filter((a) => a.kind === 'file');

    return (
        <div className="space-y-2">
            {images.length > 0 && (
                <div
                    className={`grid gap-1.5 ${
                        images.length === 1 ? 'max-w-[260px] grid-cols-1' : 'max-w-[320px] grid-cols-2'
                    }`}
                >
                    {images.map((image, i) => (
                        <button
                            key={image.id}
                            type="button"
                            onClick={() => setViewer(i)}
                            aria-label={`View ${image.original_name}`}
                            className="overflow-hidden rounded-xl bg-mist-100 ring-1 ring-black/5 transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun-400/50"
                        >
                            <img
                                src={image.url}
                                alt={image.original_name}
                                loading="lazy"
                                className={`w-full object-cover ${images.length === 1 ? 'max-h-72' : 'aspect-square'}`}
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
                    playsInline
                    className="max-h-72 w-full max-w-[320px] rounded-xl bg-black"
                />
            ))}

            {files.map((file) => (
                <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex max-w-[320px] items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                        tone === 'dark'
                            ? 'border-white/25 bg-white/10 text-white hover:bg-white/20'
                            : 'border-mist-200 bg-mist-50 text-ink hover:border-pine-700'
                    }`}
                >
                    <FileText size={20} className="shrink-0" />
                    <span className="min-w-0 leading-tight">
                        <span className="block truncate text-[13px] font-semibold">{file.original_name}</span>
                        <span className={`block text-[11px] ${tone === 'dark' ? 'text-white/75' : 'text-ink-3'}`}>
                            {file.human_size}
                        </span>
                    </span>
                </a>
            ))}

            {viewer !== null && (
                <Lightbox images={images} start={viewer} onClose={() => setViewer(null)} />
            )}
        </div>
    );
}
