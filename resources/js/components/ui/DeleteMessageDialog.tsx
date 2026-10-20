import { User, Users } from 'lucide-react';
import Modal from './Modal';

interface DeleteMessageDialogProps {
    /** A short description of what is being deleted: the text, or "Photo", "Video"… */
    summary: string;
    /** How many photos, videos or files the message carries. */
    attachmentCount: number;
    /** The other person in the chat, for the "they will still see it" line. */
    otherName: string;
    /** True while the request is in flight. */
    processing: boolean;
    onDelete: (scope: 'me' | 'everyone') => void;
    onClose: () => void;
}

/**
 * Asks how a message should be deleted: for yourself only, or for everyone in
 * the chat. Both choices are always offered for your own messages, whether
 * they hold text, a photo or a video.
 */
export default function DeleteMessageDialog({
    summary,
    attachmentCount,
    otherName,
    processing,
    onDelete,
    onClose,
}: DeleteMessageDialogProps) {
    const withFiles = attachmentCount > 0;

    return (
        <Modal title="Delete message?" onClose={onClose} size="sm">
            <p className="line-clamp-3 break-words rounded-xl bg-mist-50 px-3.5 py-2.5 text-sm text-ink-2 ring-1 ring-mist-200">
                {summary}
            </p>

            <div className="mt-4 space-y-2.5">
                <button
                    type="button"
                    disabled={processing}
                    onClick={() => onDelete('everyone')}
                    className="w-full rounded-2xl border border-red-200 bg-red-50/60 p-4 text-left transition hover:border-red-300 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <span className="flex items-center gap-2 font-display text-[15px] font-extrabold text-red-700">
                        <Users size={17} /> Delete for everyone
                    </span>
                    <span className="mt-1.5 block text-[13px] leading-relaxed text-ink-2">
                        {withFiles
                            ? 'The message and its photos, videos or files disappear for both of you.'
                            : 'The message disappears for both of you.'}{' '}
                        If someone reports this chat, administrators can still review it for a limited time.
                    </span>
                </button>

                <button
                    type="button"
                    disabled={processing}
                    onClick={() => onDelete('me')}
                    className="w-full rounded-2xl border border-mist-200 bg-white p-4 text-left transition hover:border-pine-700/40 hover:bg-mist-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pine-700/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <span className="flex items-center gap-2 font-display text-[15px] font-extrabold text-pine-950">
                        <User size={17} /> Delete for me
                    </span>
                    <span className="mt-1.5 block text-[13px] leading-relaxed text-ink-2">
                        Only removes it from your view. {otherName} can still see it.
                    </span>
                </button>
            </div>

            <div className="mt-4 flex justify-end">
                <button type="button" onClick={onClose} className="ui-btn ui-btn-outline ui-btn-sm">
                    Cancel
                </button>
            </div>
        </Modal>
    );
}
