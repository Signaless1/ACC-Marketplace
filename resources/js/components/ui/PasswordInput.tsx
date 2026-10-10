import { Eye, EyeOff } from 'lucide-react';
import { InputHTMLAttributes, useState } from 'react';

interface PasswordInputProps
    extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    hasError?: boolean;
}

/** Password field with a show/hide toggle. */
export default function PasswordInput({
    hasError = false,
    className = '',
    ...props
}: PasswordInputProps) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative">
            <input
                {...props}
                type={visible ? 'text' : 'password'}
                className={`h-12 w-full rounded-xl border bg-white pl-4 pr-12 font-body text-[15px] text-pine-950 outline-none transition placeholder:text-pine-900/35 focus:ring-4 ${
                    hasError
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15'
                        : 'border-pine-900/20 focus:border-pine-700 focus:ring-pine-700/15'
                } ${className}`}
            />

            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? 'Hide password' : 'Show password'}
                aria-pressed={visible}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-pine-900/55 transition hover:text-pine-700 focus-visible:text-pine-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-700/40"
            >
                {visible ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
        </div>
    );
}
