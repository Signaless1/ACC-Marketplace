import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

interface ModalProps {
    title: string;
    onClose: () => void;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg';
}

const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl' };

export default function Modal({ title, onClose, children, size = 'md' }: ModalProps) {
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return (
        <div
            className="ui-fade fixed inset-0 z-[90] flex items-end justify-center bg-pine-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
            onMouseDown={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onMouseDown={(event) => event.stopPropagation()}
                className={`ui-pop flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-[var(--shadow-lift)] sm:rounded-3xl ${widths[size]}`}
            >
                <div className="flex shrink-0 items-center justify-between border-b border-mist-100 px-6 py-4">
                    <h2 className="font-display text-lg font-extrabold text-pine-950">{title}</h2>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded-lg p-1.5 text-ink-3 transition hover:bg-mist-100 hover:text-ink"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="thin-scroll overflow-y-auto px-6 py-5">{children}</div>
            </div>
        </div>
    );
}
