const styles: Record<string, string> = {
    // orders
    pending: 'bg-sun-300/45 text-sun-800 ring-sun-500/30',
    confirmed: 'bg-sky-50 text-sky-800 ring-sky-300/50',
    completed: 'bg-mist-100 text-pine-700 ring-pine-600/25',
    cancelled: 'bg-slate-100 text-slate-600 ring-slate-300/60',
    // listings
    available: 'bg-mist-100 text-pine-700 ring-pine-600/25',
    reserved: 'bg-sun-300/45 text-sun-800 ring-sun-500/30',
    sold: 'bg-slate-100 text-slate-600 ring-slate-300/60',
    removed: 'bg-red-50 text-red-700 ring-red-300/60',
    // reports
    reviewing: 'bg-sky-50 text-sky-800 ring-sky-300/50',
    escalated: 'bg-violet-50 text-violet-800 ring-violet-300/50',
    resolved: 'bg-mist-100 text-pine-700 ring-pine-600/25',
    dismissed: 'bg-slate-100 text-slate-600 ring-slate-300/60',
    // users
    active: 'bg-mist-100 text-pine-700 ring-pine-600/25',
    suspended: 'bg-red-50 text-red-700 ring-red-300/60',
};

export default function StatusBadge({ status, label }: { status: string; label?: string }) {
    return (
        <span
            className={`ui-chip capitalize ring-1 ring-inset ${styles[status] ?? 'bg-slate-100 text-slate-600 ring-slate-300/60'}`}
        >
            {label ?? status}
        </span>
    );
}
