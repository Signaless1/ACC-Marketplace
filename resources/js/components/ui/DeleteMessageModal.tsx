import { Trash2, Users } from 'lucide-react';
import Modal from './Modal';

interface DeleteMessageModalProps {
    /** A short excerpt so the person can tell which message this is. */
    preview: string;
    /** Only the sender may delete for everyone, and only while it is not already deleted. */
    canDeleteForEveryone: boolean;
    processing?: boolean;
    onDelete: (scope: 'me' | 'everyone') => void;
    onClose: () => void;
}

export default function DeleteMessageModal({
    preview,
    canDeleteForEveryone,
    processing = false,
    onDelete,
    onClose,
}: DeleteMessageModalProps) {
    return (
        <Modal title="Delete message?" onClose={onClose} size="sm">
            <p className="line-clamp-3 break-words rounded-xl bg-mist-50 px-3.5 py-2.5 text-sm text-ink-2 ring-1 ring-mist-200">
                {preview}
            </p>

            <div className="mt-5 flex flex-col gap-2">
                {canDeleteForEveryone && (
                    <button
                        type="button"
                        disabled={processing}
                        onClick={() => onDelete('everyone')}
                        className="ui-btn ui-btn-danger !h-auto w-full justify-start gap-2.5 !whitespace-normal !py-3 text-left"
                    >
                        <Users size={17} className="shrink-0" />
                        <span>
                            <span className="block font-bold">Delete for everyone</span>
                            <span className="block text-xs font-medium opacity-80">
                                Removed for you and the other person.
                            </span>
                        </span>
                    </button>
                )}

                <button
                    type="button"
                    disabled={processing}
                    onClick={() => onDelete('me')}
                    className="ui-btn ui-btn-outline !h-auto w-full justify-start gap-2.5 !whitespace-normal !py-3 text-left"
                >
                    <Trash2 size={17} className="shrink-0" />
                    <span>
                        <span className="block font-bold">Delete for me</span>
                        <span className="block text-xs font-medium text-ink-3">
                            Removed only from your view. The other person still sees it.
                        </span>
                    </span>
                </button>

                <button type="button" onClick={onClose} className="ui-btn ui-btn-ghost w-full">
                    Cancel
                </button>
            </div>
        </Modal>
    );
}
