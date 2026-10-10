import { Head, router, useForm, usePage } from '@inertiajs/react';
import { KeyRound, UserRound } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import Avatar from '../../components/ui/Avatar';
import type { SharedProps } from '../../types/shared';

const inputClass =
    'w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#176B4D] focus:ring-2 focus:ring-[#176B4D]/10';

function FieldError({ message }: { message?: string }) {
    return message ? (
        <p className="mt-1 text-xs text-red-600">{message}</p>
    ) : null;
}

export default function Edit() {
    const user = usePage<SharedProps>().props.auth.user!;
    const fileRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const profile = useForm<{
        name: string;
        bio: string;
        avatar: File | null;
        remove_avatar: boolean;
    }>({
        name: user.name,
        bio: user.bio ?? '',
        avatar: null,
        remove_avatar: false,
    });

    const password = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submitProfile = (event: FormEvent) => {
        event.preventDefault();

        // Multipart upload requires POST (PUT bodies are not parsed by PHP).
        profile.post('/settings/profile', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                profile.setData('avatar', null);
                profile.setData('remove_avatar', false);
                setPreview(null);
            },
        });
    };

    const submitPassword = (event: FormEvent) => {
        event.preventDefault();

        password.put('/settings/password', {
            preserveScroll: true,
            onSuccess: () => password.reset(),
        });
    };

    const currentAvatar = profile.data.remove_avatar
        ? null
        : (preview ?? user.avatar_url);

    return (
        <AppLayout>
            <Head title="Settings" />

            <div className="min-h-screen bg-[#F7F9F8] px-4 py-8 sm:px-6">
                <div className="mx-auto max-w-2xl space-y-8">
                    <div>
                        <h1 className="text-2xl font-bold text-[#17352A]">
                            Settings
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Manage your public profile and account security.
                        </p>
                    </div>

                    <form
                        onSubmit={submitProfile}
                        className="space-y-5 rounded-2xl border border-[#E1E9E4] bg-white p-6 shadow-sm"
                    >
                        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                            <UserRound size={18} className="text-[#176B4D]" />
                            Profile
                        </h2>

                        <div className="flex items-center gap-4">
                            <Avatar
                                name={profile.data.name || user.name}
                                url={currentAvatar}
                                size={72}
                            />

                            <div className="flex flex-wrap gap-2">
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] ?? null;
                                        profile.setData('avatar', file);
                                        profile.setData('remove_avatar', false);
                                        setPreview(
                                            file
                                                ? URL.createObjectURL(file)
                                                : null,
                                        );
                                    }}
                                />

                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                    Upload photo
                                </button>

                                {(user.avatar_url || preview) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            profile.setData('avatar', null);
                                            profile.setData(
                                                'remove_avatar',
                                                true,
                                            );
                                            setPreview(null);
                                        }}
                                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                        <FieldError message={profile.errors.avatar} />

                        <div>
                            <label
                                htmlFor="name"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Name
                            </label>
                            <input
                                id="name"
                                className={inputClass}
                                value={profile.data.name}
                                onChange={(e) =>
                                    profile.setData('name', e.target.value)
                                }
                            />
                            <FieldError message={profile.errors.name} />
                        </div>

                        <div>
                            <label
                                htmlFor="email"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                className={`${inputClass} bg-slate-50 text-slate-500`}
                                value={user.email}
                                disabled
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="bio"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Bio
                            </label>
                            <textarea
                                id="bio"
                                rows={4}
                                maxLength={500}
                                className={inputClass}
                                value={profile.data.bio}
                                onChange={(e) =>
                                    profile.setData('bio', e.target.value)
                                }
                                placeholder="Tell buyers a little about yourself…"
                            />
                            <div className="mt-1 flex justify-between">
                                <FieldError message={profile.errors.bio} />
                                <span className="ml-auto text-xs text-slate-400">
                                    {profile.data.bio.length}/500
                                </span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={profile.processing}
                            className="rounded-xl bg-[#176B4D] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#12583F] disabled:opacity-60"
                        >
                            {profile.processing ? 'Saving…' : 'Save changes'}
                        </button>
                    </form>

                    <form
                        onSubmit={submitPassword}
                        className="space-y-5 rounded-2xl border border-[#E1E9E4] bg-white p-6 shadow-sm"
                    >
                        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                            <KeyRound size={18} className="text-[#176B4D]" />
                            Change password
                        </h2>

                        {(
                            [
                                ['current_password', 'Current password'],
                                ['password', 'New password'],
                                ['password_confirmation', 'Confirm new password'],
                            ] as const
                        ).map(([field, label]) => (
                            <div key={field}>
                                <label
                                    htmlFor={field}
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    {label}
                                </label>
                                <input
                                    id={field}
                                    type="password"
                                    autoComplete={
                                        field === 'current_password'
                                            ? 'current-password'
                                            : 'new-password'
                                    }
                                    className={inputClass}
                                    value={password.data[field]}
                                    onChange={(e) =>
                                        password.setData(field, e.target.value)
                                    }
                                />
                                <FieldError message={password.errors[field]} />
                            </div>
                        ))}

                        <button
                            type="submit"
                            disabled={password.processing}
                            className="rounded-xl bg-[#176B4D] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#12583F] disabled:opacity-60"
                        >
                            {password.processing
                                ? 'Updating…'
                                : 'Update password'}
                        </button>
                    </form>

                    <button
                        type="button"
                        onClick={() => router.get(`/users/${user.id}`)}
                        className="text-sm font-medium text-[#176B4D] hover:underline"
                    >
                        View my public profile →
                    </button>
                </div>
            </div>
        </AppLayout>
    );
}
