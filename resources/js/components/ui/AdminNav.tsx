import { Link, usePage } from '@inertiajs/react';
import { Flag, LayoutDashboard, Package, ReceiptText, ShieldCheck, Users } from 'lucide-react';
import PageHeader from './PageHeader';

const tabs = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Reports', href: '/admin/reports', icon: Flag },
    { label: 'Transactions', href: '/admin/orders', icon: ReceiptText },
    { label: 'Listings', href: '/admin/listings', icon: Package },
    { label: 'Users', href: '/admin/users', icon: Users },
];

export default function AdminNav({ title, subtitle }: { title: string; subtitle?: string }) {
    const { url } = usePage();
    const path = url.split('?')[0];

    return (
        <>
            <PageHeader icon={ShieldCheck} title={title} subtitle={subtitle} />

            <nav className="-mt-2 mb-6 flex flex-wrap gap-2" aria-label="Admin sections">
                {tabs.map(({ label, href, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                            path === href
                                ? 'bg-pine-800 text-white'
                                : 'border border-mist-200 bg-white text-ink-2 hover:border-pine-700 hover:text-pine-800'
                        }`}
                    >
                        <Icon size={15} />
                        {label}
                    </Link>
                ))}
            </nav>
        </>
    );
}
