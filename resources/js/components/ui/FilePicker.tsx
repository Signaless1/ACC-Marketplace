import { FileText, Film, Paperclip, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { formatBytes } from '../../lib/http';

interface FilePickerProps {
    files: File[];
    onChange: (files: File[]) => void;
    max: number;
    maxMegabytes: number;
    /** HTML accept attribute, e.g. "image/*,video/*". */
    accept: string;
    label?: string;
    /** "button" = compact paperclip (chat). "box" = drop-style area (forms). */
    variant?: 'button' | 'box';
    onReject?: (message: string) => void;
}

export function FilePreviews({
    files,
    onChange,
}: {
    files: File[];
    onChange: (files: File[]) => void;
}) {
    const urls = useMemo(
        () => files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null)),
        [files],
    );

    useEffect(() => () => urls.forEach((u) => u && URL.revokeObjectURL(u)), [urls]);

    if (files.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            {files.map((file, index) => (
                <div
                    key={`${file.name}-${index}`}
                    className="group relative flex h-16 items-center gap-2 overflow-hidden rounded-xl border border-[#dce6e0] bg-white pr-8"
                >
                    {urls[index] ? (
                        <img src={urls[index]!} alt="" className="h-16 w-16 object-cover" />
                    ) : (
                        <span className="flex h-16 w-14 items-center justify-center bg-[#EAF4EF] text-[#176B4D]">
                            {file.type.startsWith('video/') ? <Film size={20} /> : <FileText size={20} />}
                        </span>
                    )}
                    <span className="max-w-[120px] pr-1">
                        <span className="block truncate text-xs font-semibold text-[#12291f]">{file.name}</span>
                        <span className="block text-[11px] text-[#566860]">{formatBytes(file.size)}</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => onChange(files.filter((_, i) => i !== index))}
                        aria-label={`Remove ${file.name}`}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-[#d4623a]"
                    >
                        <X size={12} />
                    </button>
                </div>
            ))}
        </div>
    );
}

export default function FilePicker({
    files,
    onChange,
    max,
    maxMegabytes,
    accept,
    label = 'Attach',
    variant = 'button',
    onReject,
}: FilePickerProps) {
    const input = useRef<HTMLInputElement>(null);

    const add = (list: FileList | null) => {
        if (!list) return;

        const accepted: File[] = [];

        for (const file of Array.from(list)) {
            if (file.size > maxMegabytes * 1024 * 1024) {
                onReject?.(`"${file.name}" is larger than ${maxMegabytes} MB.`);
                continue;
            }
            accepted.push(file);
        }

        const merged = [...files, ...accepted];

        if (merged.length > max) {
            onReject?.(`You can attach up to ${max} files.`);
        }

        onChange(merged.slice(0, max));

        if (input.current) input.current.value = '';
    };

    return (
        <>
            <input
                ref={input}
                type="file"
                multiple
                accept={accept}
                className="hidden"
                onChange={(e) => add(e.target.files)}
            />

            {variant === 'button' ? (
                <button
                    type="button"
                    onClick={() => input.current?.click()}
                    disabled={files.length >= max}
                    aria-label={label}
                    title={label}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#43554c] transition hover:bg-[#EAF4EF] hover:text-[#176B4D] disabled:opacity-40"
                >
                    <Paperclip size={20} />
                </button>
            ) : (
                <button
                    type="button"
                    onClick={() => input.current?.click()}
                    disabled={files.length >= max}
                    className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[#9db8aa] bg-[#F6FAF7] px-4 py-2.5 text-sm font-semibold text-[#176B4D] transition hover:bg-[#EAF4EF] disabled:opacity-50"
                >
                    <Paperclip size={16} />
                    {label}
                    <span className="text-xs font-medium text-[#566860]">
                        ({files.length}/{max})
                    </span>
                </button>
            )}
        </>
    );
}
