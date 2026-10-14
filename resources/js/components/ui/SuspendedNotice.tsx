import { router, usePage } from '@inertiajs/react';
import { UserX } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SharedProps } from '../../types/shared';
import Modal from './Modal';

/**
 * Pop-up shown when the person tried to open a suspended user's profile, or
 * when their report was the one that got a user suspended.
 */
export default function SuspendedNotice() {
    const { flash } = usePage<SharedProps>().props;
    const [name, setName] = useState<string | null>(null);

    // Flash data only lives for one response, so copy it into state.
    useEffect(() => {
        if (flash?.suspended?.name) setName(flash.suspended.name);
    }, [flash?.suspended?.name]);

    if (!name) return null;

    const close = () => setName(null);

    return (
        <Modal title="User suspended" onClose={close} size="sm">
            <div className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <UserX size={18} />
                </span>
                <p className="text-sm leading-relaxed text-ink-2">
                    <strong className="font-semibold text-ink">{name}</strong> has been
                    suspended, so their profile can&apos;t be viewed. Our team will review
                    the reports.
                </p>
            </div>

            <div className="mt-6 flex justify-end">
                <button type="button" onClick={close} className="ui-btn ui-btn-primary ui-btn-sm">
                    OK
                </button>
            </div>
        </Modal>
    );
}
