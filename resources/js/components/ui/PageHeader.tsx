import type { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    actions?: ReactNode;
}

/** Standard page container + title row used by every interior page. */
export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
    return (
        <div className={`mx-auto w-full px-4 py-7 sm:px-6 lg:px-8 ${wide ? 'max-w-[1400px]' : 'max-w-7xl'}`}>
            {children}
        </div>
    );
}

export default function PageHeader({ title, subtitle, icon: Icon, actions }: PageHeaderProps) {
    return (
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-4">
                {Icon && (
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pine-800 text-sun-300 shadow-sm">
                        <Icon size={24} />
                    </span>
                )}
                <div>
                    <h1 className="font-display text-[1.65rem] font-extrabold leading-tight text-pine-950 sm:text-3xl">
                        {title}
                    </h1>
                    {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
                </div>
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
