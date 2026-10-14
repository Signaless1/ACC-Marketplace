import { Head, Link, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import AdminNav from '../../components/ui/AdminNav';
import Avatar from '../../components/ui/Avatar';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import { Page } from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDate, Paginated } from '../../types/shared';

interface AdminUser {
    id: number;
    name: string;
    email: string;
    avatar_url: string | null;
    role: 'user' | 'admin';
    suspended_at: string | null;
    suspension_reason: string | null;
    created_at: string;
    listings_count: number;
}

interface Props {
    users: Paginated<AdminUser>;
    filters: { q: string; status: string };
}

export default function Users({ users, filters }: Props) {
    const [q, setQ] = useState(filters.q);
    const [suspending, setSuspending] = useState<AdminUser | null>(null);
    const [reinstating, setReinstating] = useState<AdminUser | null>(null);
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);

    const go = (params: Record<string, string>) =>
        router.get(
            '/admin/users',
            Object.fromEntries(Object.entries(params).filter(([, v]) => v && v !== 'all')),
            { preserveState: true },
        );

    const search = (event: FormEvent) => {
        event.preventDefault();
        go({ q, status: filters.status });
    };

    const suspend = () => {
        if (!suspending) return;

        router.post(
            `/admin/users/${suspending.id}/suspend`,
            { reason },
            {
                preserveScroll: true,
                onStart: () => setBusy(true),
                onFinish: () => setBusy(false),
                onError: (e) => setErrors(e),
                onSuccess: () => {
                    setSuspending(null);
                    setReason('');
                    setErrors({});
                },
            },
        );
    };

    const reinstate = () => {
        if (!reinstating) return;

        router.post(`/admin/users/${reinstating.id}/unsuspend`, {}, {
            preserveScroll: true,
            onStart: () => setBusy(true),
            onFinish: () => {
                setBusy(false);
                setReinstating(null);
            },
        });
    };

    return (
        <AppLayout>
            <Head title="Admin · Users" />

            <Page>
                <AdminNav title="Users" subtitle="Search students and manage suspensions" />

                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <form onSubmit={search} className="relative min-w-[240px] max-w-md flex-1" role="search">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
                        <input
                            type="search"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search by name or email…"
                            aria-label="Search users"
                            className="ui-input !pl-10"
                        />
                    </form>

                    <select
                        value={filters.status}
                        onChange={(e) => go({ q, status: e.target.value })}
                        aria-label="Filter by status"
                        className="ui-input w-auto"
                    >
                        <option value="all">All accounts</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                    </select>
                </div>

                <div className="ui-card overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="border-b border-mist-100 bg-mist-50 text-xs font-bold uppercase tracking-wide text-ink-2">
                            <tr>
                                <th className="px-5 py-3">User</th>
                                <th className="px-5 py-3">Role</th>
                                <th className="px-5 py-3">Listings</th>
                                <th className="px-5 py-3">Joined</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-mist-100">
                            {users.data.map((user) => (
                                <tr key={user.id} className="align-top">
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={user.name} url={user.avatar_url} size={38} />
                                            <div className="min-w-0">
                                                <Link href={`/users/${user.id}`} className="block truncate font-bold text-ink hover:text-pine-700">
                                                    {user.name}
                                                </Link>
                                                <span className="block truncate text-xs text-ink-3">{user.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 capitalize text-ink-2">{user.role}</td>
                                    <td className="px-5 py-3.5 text-ink-2">{user.listings_count}</td>
                                    <td className="px-5 py-3.5 text-ink-2">{formatDate(user.created_at)}</td>
                                    <td className="px-5 py-3.5">
                                        <StatusBadge status={user.suspended_at ? 'suspended' : 'active'} />
                                        {user.suspension_reason && (
                                            <p className="mt-1.5 max-w-[16rem] text-xs text-ink-2">
                                                “{user.suspension_reason}”
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        {user.role !== 'admin' &&
                                            (user.suspended_at ? (
                                                <button type="button" onClick={() => setReinstating(user)} className="ui-btn ui-btn-outline ui-btn-sm">
                                                    Reinstate
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSuspending(user);
                                                        setReason('');
                                                        setErrors({});
                                                    }}
                                                    className="ui-btn ui-btn-danger-outline ui-btn-sm"
                                                >
                                                    Suspend
                                                </button>
                                            ))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {users.data.length === 0 && (
                        <p className="px-5 py-12 text-center text-sm text-ink-2">No users match your search.</p>
                    )}
                </div>

                <Pagination links={users.links} />
            </Page>

            {suspending && (
                <Modal title={`Suspend ${suspending.name}?`} onClose={() => setSuspending(null)}>
                    <p className="text-sm leading-relaxed text-ink-2">
                        They will be logged out and their listings will disappear from the marketplace. They will see
                        the reason below when they try to log in.
                    </p>

                    <div className="mt-4">
                        <label htmlFor="suspend-reason" className="ui-label">Reason (shown to the user)</label>
                        <textarea
                            id="suspend-reason"
                            rows={3}
                            maxLength={300}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className={`ui-input ${errors.reason ? 'ui-input-error' : ''}`}
                            placeholder="e.g. Repeated reports of selling counterfeit items"
                        />
                        <div className="mt-1 flex justify-between text-xs">
                            <span className="text-red-600">{errors.reason}</span>
                            <span className="text-ink-3">{reason.length}/300</span>
                        </div>
                    </div>

                    <div className="mt-5 flex justify-end gap-2">
                        <button type="button" onClick={() => setSuspending(null)} className="ui-btn ui-btn-outline ui-btn-sm">
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={suspend}
                            disabled={reason.trim().length < 5 || busy}
                            className="ui-btn ui-btn-danger ui-btn-sm"
                        >
                            {busy ? 'Suspending…' : 'Suspend account'}
                        </button>
                    </div>
                </Modal>
            )}

            {reinstating && (
                <ConfirmDialog
                    tone="primary"
                    title={`Reinstate ${reinstating.name}?`}
                    message="They will be able to log in again and their listings return to the marketplace."
                    confirmLabel="Reinstate"
                    processing={busy}
                    onConfirm={reinstate}
                    onClose={() => setReinstating(null)}
                />
            )}
        </AppLayout>
    );
}
