import { Link, usePage } from '@inertiajs/react';

const tabs = [
    { label: 'Overview', href: '/admin' },
    { label: 'Users', href: '/admin/users' },
    { label: 'Listings', href: '/admin/listings' },
    { label: 'Reports', href: '/admin/reports' },
];

export default function AdminNav({ title }: { title: string }) {
    const { url } = usePage();
    const path = url.split('?')[0];

    return (
        <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#17352A]">{title}</h1>

            <nav className="mt-4 flex flex-wrap gap-2" aria-label="Admin">
                {tabs.map((tab) => (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                            path === tab.href
                                ? 'bg-[#176B4D] text-white'
                                : 'border border-[#DDE6E0] bg-white text-slate-600 hover:border-[#176B4D] hover:text-[#176B4D]'
                        }`}
                    >
                        {tab.label}
                    </Link>
                ))}
            </nav>
        </div>
    );
}
