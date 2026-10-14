import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { KeyRound, Settings, UserRound } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import AppLayout from '../../Layouts/AppLayout';
import Avatar from '../../components/ui/Avatar';
import PageHeader, { Page } from '../../components/ui/PageHeader';
import PasswordInput from '../../components/ui/PasswordInput';
import {
    PH_PHONE_ERROR,
    PH_PHONE_HINT,
    PH_PHONE_PLACEHOLDER,
    normalizePhPhone,
    sanitizePhoneInput,
} from '../../lib/phone';
import type { SharedProps } from '../../types/shared';

function FieldError({ message }: { message?: string }) {
    return message ? <p role="alert" className="ui-error">{message}</p> : null;
}

export default function Edit() {
    const user = usePage<SharedProps>().props.auth.user!;
    const fileRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => () => {
        if (preview) URL.revokeObjectURL(preview);
    }, [preview]);

    const profile = useForm<{ name: string; phone: string; bio: string; avatar: File | null; remove_avatar: boolean }>({
        name: user.name,
        phone: user.phone ?? '',
        bio: user.bio ?? '',
        avatar: null,
        remove_avatar: false,
    });

    const password = useForm({ current_password: '', password: '', password_confirmation: '' });

    const submitProfile = (event: FormEvent) => {
        event.preventDefault();

        // Empty is fine only for accounts that never added a number.
        if (
            (profile.data.phone !== '' || user.phone) &&
            normalizePhPhone(profile.data.phone) === null
        ) {
            profile.setError('phone', PH_PHONE_ERROR);
            return;
        }

        // Multipart upload requires POST (PHP does not parse PUT bodies).
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

    const currentAvatar = profile.data.remove_avatar ? null : (preview ?? user.avatar_url);

    return (
        <AppLayout>
            <Head title="Settings" />

            <Page>
                <PageHeader icon={Settings} title="Settings" subtitle="Manage your public profile and account security" />

                <div className="mx-auto max-w-2xl space-y-6">
                    <form onSubmit={submitProfile} className="ui-card space-y-5 p-6 sm:p-7">
                        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-pine-950">
                            <UserRound size={19} className="text-pine-700" /> Profile
                        </h2>

                        <div className="flex items-center gap-4">
                            <Avatar name={profile.data.name || user.name} url={currentAvatar} size={76} />

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
                                        setPreview(file ? URL.createObjectURL(file) : null);
                                    }}
                                />
                                <button type="button" onClick={() => fileRef.current?.click()} className="ui-btn ui-btn-outline ui-btn-sm">
                                    Upload photo
                                </button>
                                {(user.avatar_url || preview) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            profile.setData('avatar', null);
                                            profile.setData('remove_avatar', true);
                                            setPreview(null);
                                        }}
                                        className="ui-btn ui-btn-danger-outline ui-btn-sm"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                        <FieldError message={profile.errors.avatar} />

                        <div>
                            <label htmlFor="name" className="ui-label">Name</label>
                            <input
                                id="name"
                                maxLength={60}
                                className={`ui-input ${profile.errors.name ? 'ui-input-error' : ''}`}
                                value={profile.data.name}
                                onChange={(e) => profile.setData('name', e.target.value)}
                            />
                            <FieldError message={profile.errors.name} />
                        </div>

                        <div>
                            <label htmlFor="email" className="ui-label">Email</label>
                            <input id="email" className="ui-input" value={user.email} disabled />
                        </div>

                        <div>
                            <label htmlFor="phone" className="ui-label">Mobile number</label>
                            <input
                                id="phone"
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel-national"
                                maxLength={13}
                                className={`ui-input ${profile.errors.phone ? 'ui-input-error' : ''}`}
                                value={profile.data.phone}
                                onChange={(e) => {
                                    profile.setData('phone', sanitizePhoneInput(e.target.value));
                                    if (profile.errors.phone) profile.clearErrors('phone');
                                }}
                                placeholder={PH_PHONE_PLACEHOLDER}
                            />
                            {profile.errors.phone ? (
                                <FieldError message={profile.errors.phone} />
                            ) : (
                                <p className="mt-1 text-xs text-ink-3">
                                    {PH_PHONE_HINT} Only you and the admins can see it.
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="bio" className="ui-label">Bio</label>
                            <textarea
                                id="bio"
                                rows={4}
                                maxLength={500}
                                className="ui-input"
                                value={profile.data.bio}
                                onChange={(e) => profile.setData('bio', e.target.value)}
                                placeholder="Tell buyers a little about yourself…"
                            />
                            <div className="mt-1 flex justify-between">
                                <FieldError message={profile.errors.bio} />
                                <span className="ml-auto text-xs text-ink-3">{profile.data.bio.length}/500</span>
                            </div>
                        </div>

                        <button type="submit" disabled={profile.processing} className="ui-btn ui-btn-primary">
                            {profile.processing ? 'Saving…' : 'Save changes'}
                        </button>
                    </form>

                    <form onSubmit={submitPassword} className="ui-card space-y-5 p-6 sm:p-7">
                        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-pine-950">
                            <KeyRound size={19} className="text-pine-700" /> Change password
                        </h2>

                        {(
                            [
                                ['current_password', 'Current password', 'current-password'],
                                ['password', 'New password', 'new-password'],
                                ['password_confirmation', 'Confirm new password', 'new-password'],
                            ] as const
                        ).map(([field, label, autoComplete]) => (
                            <div key={field}>
                                <label htmlFor={field} className="ui-label">{label}</label>
                                <PasswordInput
                                    id={field}
                                    autoComplete={autoComplete}
                                    maxLength={72}
                                    value={password.data[field]}
                                    onChange={(e) => password.setData(field, e.target.value)}
                                    hasError={Boolean(password.errors[field])}
                                />
                                <FieldError message={password.errors[field]} />
                            </div>
                        ))}
                        <p className="ui-hint">8 to 72 characters, with at least one letter and one number.</p>

                        <button type="submit" disabled={password.processing} className="ui-btn ui-btn-primary">
                            {password.processing ? 'Updating…' : 'Update password'}
                        </button>
                    </form>

                    <Link href={`/users/${user.id}`} className="inline-block text-sm font-bold text-pine-700 underline decoration-sun-500 decoration-2 underline-offset-4 hover:text-pine-900">
                        View my public profile
                    </Link>
                </div>
            </Page>
        </AppLayout>
    );
}
