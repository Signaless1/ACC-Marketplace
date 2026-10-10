import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

interface ModalProps {
    title: string;
    onClose: () => void;
    children: ReactNode;
    wide?: boolean;
}

export default function Modal({ title, onClose, children, wide = false }: ModalProps) {
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto bg-slate-900/55 p-4"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(event) => event.stopPropagation()}
                className={`my-auto max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ${wide ? 'max-w-xl' : 'max-w-md'}`}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-sans text-lg font-bold text-[#12291f]">
                        {title}
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {children}
            </div>
        </div>
    );
}
