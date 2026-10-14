import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    text: string;
    action?: { label: string; href: string };
}

export default function EmptyState({ icon: Icon, title, text, action }: EmptyStateProps) {
    return (
        <div className="rounded-2xl border border-dashed border-mist-300 bg-white px-6 py-14 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-mist-100 text-pine-700">
                <Icon size={26} />
            </span>
            <h3 className="mt-4 font-display text-lg font-extrabold text-pine-950">{title}</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-2">{text}</p>
            {action && (
                <Link href={action.href} className="ui-btn ui-btn-primary mt-6">
                    {action.label}
                </Link>
            )}
        </div>
    );
}
