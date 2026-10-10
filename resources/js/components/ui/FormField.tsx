import { AlertCircle } from 'lucide-react';
import { ReactNode } from 'react';

interface FormFieldProps {
    id: string;
    label: string;
    error?: string;
    hint?: string;
    children: ReactNode;
}

export const textInputClass = (hasError: boolean) =>
    `h-12 w-full rounded-xl border bg-white px-4 font-body text-[15px] text-pine-950 outline-none transition placeholder:text-pine-900/35 focus:ring-4 ${
        hasError
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15'
            : 'border-pine-900/20 focus:border-pine-700 focus:ring-pine-700/15'
    }`;

export default function FormField({
    id,
    label,
    error,
    hint,
    children,
}: FormFieldProps) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-1.5 block text-sm font-semibold text-pine-950"
            >
                {label}
            </label>

            {children}

            {error ? (
                <p
                    id={`${id}-error`}
                    role="alert"
                    className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-red-600"
                >
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    {error}
                </p>
            ) : hint ? (
                <p className="mt-1.5 text-[13px] text-pine-900/60">{hint}</p>
            ) : null}
        </div>
    );
}
