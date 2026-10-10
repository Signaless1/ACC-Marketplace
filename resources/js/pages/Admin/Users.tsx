import { Head, Link, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import AdminNav from '../../components/ui/AdminNav';
import Pagination from '../../components/ui/Pagination';
import { formatDate, Paginated } from '../../types/shared';

interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: 'user' | 'admin';
    suspended_at: string | null;
    created_at: string;
    listings_count: number;
}

interface Props {
    users: Paginated<AdminUser>;
    filters: { q: string };
}

export default function Users({ users, filters }: Props) {
    const [q, setQ] = useState(filters.q);

    const search = (event: FormEvent) => {
        event.preventDefault();
        router.get('/admin/users', q ? { q } : {}, { preserveState: true });
    };

    const toggleSuspend = (user: AdminUser) => {
        const suspending = !user.suspended_at;

        if (
            !window.confirm(
                suspending
                    ? `Suspend ${user.name}? They will be logged out and their listings hidden.`
                    : `Reinstate ${user.name}?`,
            )
        ) {
            return;
        }

        router.post(
            `/admin/users/${user.id}/${suspending ? 'suspend' : 'unsuspend'}`,
            {},
            { preserveScroll: true },
        );
    };

    return (
        <AppLayout>
            <Head title="Admin · Users" />

            <div className="min-h-screen bg-[#F7F9F8] px-4 py-8 sm:px-6">
                <div className="mx-auto max-w-6xl">
                    <AdminNav title="Users" />

                    <form onSubmit={search} className="mb-4 flex gap-2">
                        <input
                            type="search"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search by name or email…"
                            aria-label="Search users"
                            className="w-full max-w-sm rounded-xl border border-[#DDE6E0] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#176B4D]"
                        />
                        <button
                            type="submit"
                            className="rounded-xl bg-[#176B4D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12583F]"
                        >
                            Search
                        </button>
                    </form>

                    <div className="overflow-x-auto rounded-2xl border border-[#E1E9E4] bg-white shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                                <tr>
                                    <th className="px-5 py-3">User</th>
                                    <th className="px-5 py-3">Role</th>
                                    <th className="px-5 py-3">Listings</th>
                                    <th className="px-5 py-3">Joined</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.data.map((user) => (
                                    <tr key={user.id}>
                                        <td className="px-5 py-3">
                                            <Link
                                                href={`/users/${user.id}`}
                                                className="font-semibold text-slate-800 hover:text-[#176B4D]"
                                            >
                                                {user.name}
                                            </Link>
                                            <p className="text-xs text-slate-500">
                                                {user.email}
                                            </p>
                                        </td>
                                        <td className="px-5 py-3 capitalize">
                                            {user.role}
                                        </td>
                                        <td className="px-5 py-3">
                                            {user.listings_count}
                                        </td>
                                        <td className="px-5 py-3">
                                            {formatDate(user.created_at)}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                    user.suspended_at
                                                        ? 'bg-red-50 text-red-700'
                                                        : 'bg-emerald-50 text-emerald-700'
                                                }`}
                                            >
                                                {user.suspended_at
                                                    ? 'Suspended'
                                                    : 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            {user.role !== 'admin' && (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSuspend(user)}
                                                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                                                        user.suspended_at
                                                            ? 'border-[#176B4D] text-[#176B4D] hover:bg-[#EAF4EF]'
                                                            : 'border-red-200 text-red-600 hover:bg-red-50'
                                                    }`}
                                                >
                                                    {user.suspended_at
                                                        ? 'Reinstate'
                                                        : 'Suspend'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {users.data.length === 0 && (
                            <p className="px-5 py-10 text-center text-sm text-slate-500">
                                No users match your search.
                            </p>
                        )}
                    </div>

                    <Pagination links={users.links} />
                </div>
            </div>
        </AppLayout>
    );
}
