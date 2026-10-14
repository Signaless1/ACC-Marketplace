import { Link } from '@inertiajs/react';

interface PaginationProps {
    links: { url: string | null; label: string; active: boolean }[];
}

export default function Pagination({ links }: PaginationProps) {
    if (links.length <= 3) return null;

    return (
        <nav className="mt-8 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
            {links.map((link, index) => {
                const label = link.label
                    .replace('&laquo; Previous', '‹')
                    .replace('Next &raquo;', '›');

                const className = `flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-semibold transition ${
                    link.active
                        ? 'bg-pine-800 text-white'
                        : link.url
                          ? 'border border-mist-200 bg-white text-ink-2 hover:border-pine-700 hover:text-pine-800'
                          : 'cursor-not-allowed border border-mist-100 bg-mist-50 text-mist-300'
                }`;

                return link.url ? (
                    <Link key={index} href={link.url} preserveScroll className={className}>
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
