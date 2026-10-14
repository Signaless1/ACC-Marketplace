import {
    FileText,
    Film,
    ImagePlus,
    Paperclip,
    UploadCloud,
    X,
} from 'lucide-react';
import {
    ChangeEvent,
    DragEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { formatBytes } from '../../types/shared';

export const ATTACHMENT_ACCEPT =
    '.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';

const ALLOWED_EXTENSIONS = ATTACHMENT_ACCEPT.split(',').map((ext) =>
    ext.replace('.', ''),
);

const extensionOf = (name: string) =>
    name.split('.').pop()?.toLowerCase() ?? '';

/**
 * Holds the "add files" logic shared by the chat box, the review form
 * and the report form: limits on count / size / type, with a message
 * when a file is turned away.
 */
export function useAttachmentPicker(
    files: File[],
    setFiles: (files: File[]) => void,
    max = 5,
    maxMb = 20,
) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState('');

    const addFiles = useCallback(
        (incoming: FileList | File[]) => {
            const next = [...files];
            const problems: string[] = [];

            for (const file of Array.from(incoming)) {
                if (!ALLOWED_EXTENSIONS.includes(extensionOf(file.name))) {
                    problems.push(`“${file.name}” is not a supported file type.`);
                } else if (file.size > maxMb * 1024 * 1024) {
                    problems.push(`“${file.name}” is larger than ${maxMb} MB.`);
                } else if (next.length >= max) {
                    problems.push(`You can attach up to ${max} files.`);
                    break;
                } else {
                    next.push(file);
                }
            }

            setFiles(next);
            setError(problems[0] ?? '');
        },
        [files, setFiles, max, maxMb],
    );

    const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            addFiles(event.target.files);
        }

        // Lets the same file be chosen again after removing it.
        event.target.value = '';
    };

    const input = (
        <input
            ref={inputRef}
            type="file"
            multiple
            accept={ATTACHMENT_ACCEPT}
            onChange={onInputChange}
            className="hidden"
            tabIndex={-1}
        />
    );

    return {
        input,
        error,
        addFiles,
        open: () => inputRef.current?.click(),
        remove: (index: number) => {
            setFiles(files.filter((_, i) => i !== index));
            setError('');
        },
        atLimit: files.length >= max,
    };
}

/** Thumbnails / chips for files that are about to be uploaded. */
export function AttachmentPreviews({
    files,
    onRemove,
}: {
    files: File[];
    onRemove: (index: number) => void;
}) {
    const urls = useMemo(
        () =>
            files.map((file) =>
                file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            ),
        [files],
    );

    useEffect(
        () => () => {
            urls.forEach((url) => url && URL.revokeObjectURL(url));
        },
        [urls],
    );

    if (files.length === 0) {
        return null;
    }

    return (
        <ul className="flex flex-wrap gap-2" aria-label="Files to upload">
            {files.map((file, index) => {
                const isVideo = file.type.startsWith('video/');

                return (
                    <li
                        key={`${file.name}-${file.size}-${index}`}
                        className="group relative flex items-center gap-2 overflow-hidden rounded-xl border border-sand-200 bg-white pr-9 shadow-sm"
                    >
                        {urls[index] ? (
                            <img
                                src={urls[index]!}
                                alt=""
                                className="h-14 w-14 object-cover"
                            />
                        ) : (
                            <span className="flex h-14 w-14 items-center justify-center bg-brand-50 text-brand-700">
                                {isVideo ? <Film size={22} /> : <FileText size={22} />}
                            </span>
                        )}

                        <span className="max-w-[9rem] py-1">
                            <span className="block truncate text-xs font-semibold text-ink-800">
                                {file.name}
                            </span>
                            <span className="block text-xs text-ink-500">
                                {formatBytes(file.size)}
                            </span>
                        </span>

                        <button
                            type="button"
                            onClick={() => onRemove(index)}
                            aria-label={`Remove ${file.name}`}
                            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900/80 text-white transition hover:bg-coral-600"
                        >
                            <X size={13} />
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

/** Small paperclip button used inside the chat composer. */
export function AttachButton({
    onClick,
    disabled,
}: {
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label="Attach photos, videos or files"
            title="Attach photos, videos or files"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-600 transition hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
            <Paperclip size={20} />
        </button>
    );
}

/** Full drag-and-drop area used by the review and report forms. */
export function AttachmentDropzone({
    files,
    setFiles,
    max = 5,
    label = 'Add photos, videos or files',
    hint,
}: {
    files: File[];
    setFiles: (files: File[]) => void;
    max?: number;
    label?: string;
    hint?: string;
}) {
    const picker = useAttachmentPicker(files, setFiles, max);
    const [dragging, setDragging] = useState(false);

    const onDrop = (event: DragEvent) => {
        event.preventDefault();
        setDragging(false);
        picker.addFiles(event.dataTransfer.files);
    };

    return (
        <div>
            {picker.input}

            <button
                type="button"
                onClick={picker.open}
                disabled={picker.atLimit}
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`flex w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-4 py-5 text-center transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    dragging
                        ? 'border-coral-600 bg-coral-50'
                        : 'border-sand-300 bg-sand-100/60 hover:border-brand-700 hover:bg-brand-50'
                }`}
            >
                <UploadCloud size={24} className="text-brand-700" />
                <span className="text-sm font-semibold text-ink-900">{label}</span>
                <span className="text-xs text-ink-600">
                    {hint ??
                        `Drag files here or click to browse · up to ${max} files, 20 MB each`}
                </span>
            </button>

            {picker.error && (
                <p role="alert" className="mt-2 text-sm font-medium text-red-700">
                    {picker.error}
                </p>
            )}

            <div className="mt-3">
                <AttachmentPreviews files={files} onRemove={picker.remove} />
            </div>
        </div>
    );
}

export { ImagePlus };
