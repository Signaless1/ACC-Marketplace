import { AttachButton, FilePreviews, REVIEW_ACCEPT, useFilePicker } from './Attachments';

interface EvidenceFieldProps {
    picker: ReturnType<typeof useFilePicker>;
    /** An error from the server for the attachments. */
    error?: string;
    disabled?: boolean;
}

/**
 * "Add evidence" for a report or a response: screenshots, photos, a short
 * video or a PDF. Files are stored privately; only the person who uploads
 * them and the marketplace admins can open them.
 */
export default function EvidenceField({ picker, error, disabled = false }: EvidenceFieldProps) {
    const problem = picker.problem ?? error;

    return (
        <div>
            <span className="ui-label">
                Evidence <span className="font-normal text-ink-3">(optional, but it helps)</span>
            </span>
            <p className="mb-2.5 text-[13px] leading-relaxed text-ink-3">
                Screenshots of the chat, photos, a short video or a PDF. Up to 5 files, 25 MB each. Only you and
                the administrators can open them.
            </p>

            <AttachButton
                variant="button"
                label="Add files"
                accept={REVIEW_ACCEPT}
                onPick={picker.add}
                disabled={disabled || picker.files.length >= 5}
            />

            {picker.files.length > 0 && (
                <div className="mt-3">
                    <FilePreviews files={picker.files} onRemove={picker.remove} />
                </div>
            )}

            {problem && (
                <p className="ui-error" role="alert">
                    {problem}
                </p>
            )}
        </div>
    );
}
