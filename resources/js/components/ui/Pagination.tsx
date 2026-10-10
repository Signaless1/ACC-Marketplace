import { Link } from '@inertiajs/react';

interface PaginationProps {
    links: { url: string | null; label: string; active: boolean }[];
}

export default function Pagination({ links }: PaginationProps) {
    if (links.length <= 3) {
        return null;
    }

    return (
        <nav
            className="mt-8 flex flex-wrap items-center justify-center gap-2"
            aria-label="Pagination"
        >
            {links.map((link, index) => {
                const label = link.label
                    .replace('&laquo; Previous', '‹')
                    .replace('Next &raquo;', '›');

                const className = `flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium ${
                    link.active
                        ? 'bg-[#176B4D] text-white'
                        : link.url
                          ? 'border border-[#DDE6E0] bg-white text-slate-600 hover:border-[#176B4D] hover:text-[#176B4D]'
                          : 'cursor-not-allowed border border-slate-100 bg-slate-50 text-slate-300'
                }`;

                return link.url ? (
                    <Link
                        key={index}
                        href={link.url}
                        preserveScroll
                        className={className}
                    >
                        {label}
                    </Link>
                ) : (
                    <span key={index} className={className}>
                        {label}
                    </span>
                );
            })}
        </nav>
    );
}
