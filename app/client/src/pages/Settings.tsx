import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    FiAlertTriangle,
    FiCheck,
    FiLogOut,
    FiMonitor,
    FiShield,
    FiUser,
} from 'react-icons/fi';
import {
    AccentButton,
    Badge,
    ConfirmDialog,
    Field,
    Input,
    SkeletonText,
    Surface,
} from '@/components/design-system';
import { PageHeader } from '@/components/common/layout';
import { useAuth } from '@/context/auth-context';
import { authApi } from '@/services/auth';
import { describeUserAgent, sessionsAPI, type ActiveSession } from '@/services/sessions';
import { useToast } from '@/context/toast-context';
import { getErrorMessage } from '@/utils/error';
import { formatDate, relativeTime } from '@/utils/format';

/**
 * `/settings` — account settings.
 *
 * **Everything here is enforced.** Per spec S-D1, a toggle ships only if it does
 * something; anything else is *absent*, not greyed out — a page of dead switches
 * reads as abandoned software and costs a reviewer's attention on every pass.
 *
 * So the ten inert `user_settings` columns (`emailNotifications`,
 * `twoFactorAuth`, `profileVisibility`, …) do not appear. They were also removed
 * from `updateSettingsSchema` server-side, so nothing can write them until the
 * feature that reads them exists.
 *
 * **Alert preferences are deliberately not here.** They live in
 * `/p/:slug/settings` because they are per-project (S-D4): "alert me about this
 * project" is the useful control; "alert me about everything" is not.
 *
 * Scope note: `sessionTimeout` is stored but not yet enforced (S-D2 needs the
 * 401-refresh path), so it is not surfaced as a control either.
 */
const Settings: FC = () => {
    // `updateProfile` from context, not the raw service: it writes through to the
    // shared user state, so the Topbar's name and initials update with the form.
    const { user, updateProfile } = useAuth();
    const toast = useToast();

    const [profile, setProfile] = useState({
        firstName: '', lastName: '', phone: '', company: '',
        position: '', location: '', timezone: '', bio: '',
    });
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [sessionsError, setSessionsError] = useState<string | null>(null);
    const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

    // Seed from the signed-in user. Keyed on id so a different account re-seeds.
    useEffect(() => {
        if (!user) return;
        setProfile({
            firstName: user.firstName ?? '',
            lastName: user.lastName ?? '',
            phone: user.phone ?? '',
            company: user.company ?? '',
            position: user.position ?? '',
            location: user.location ?? '',
            timezone: user.timezone ?? '',
            bio: user.bio ?? '',
        });
    }, [user?.id, user]);

    const loadSessions = useCallback(async () => {
        setLoadingSessions(true);
        try {
            const res = await sessionsAPI.list();
            setSessions(res.sessions);
            setSessionsError(null);
        } catch (err) {
            setSessionsError(getErrorMessage(err, 'Could not load sessions'));
        } finally {
            setLoadingSessions(false);
        }
    }, []);

    useEffect(() => {
        void loadSessions();
    }, [loadSessions]);

    const saveProfile = async () => {
        if (!profile.firstName.trim() || !profile.lastName.trim()) {
            setProfileError('First and last name are required.');
            return;
        }
        setSavingProfile(true);
        setProfileError(null);
        try {
            await updateProfile(profile);
            setProfileSaved(true);
            setTimeout(() => setProfileSaved(false), 2000);
        } catch (err) {
            setProfileError(getErrorMessage(err, 'Could not save profile'));
        } finally {
            setSavingProfile(false);
        }
    };

    const savePassword = async () => {
        if (!currentPassword || !newPassword) {
            setPasswordError('Both the current and new password are required.');
            return;
        }
        // Checked here purely to save a round trip — the server is what actually
        // enforces the password rules.
        if (newPassword !== confirmPassword) {
            setPasswordError('The new passwords do not match.');
            return;
        }
        setSavingPassword(true);
        setPasswordError(null);
        try {
            await authApi.changePassword(currentPassword, newPassword);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            toast.showSuccess('Password changed');
            // Other sessions may have been invalidated; re-read rather than guess.
            void loadSessions();
        } catch (err) {
            setPasswordError(getErrorMessage(err, 'Could not change password'));
        } finally {
            setSavingPassword(false);
        }
    };

    const revokeSession = async (id: number) => {
        try {
            await sessionsAPI.revoke(id);
            setSessions((prev) => prev.filter((s) => s.id !== id));
            toast.showSuccess('Session signed out');
        } catch (err) {
            toast.showError(getErrorMessage(err, 'Could not revoke session'));
        }
    };

    if (!user) return <SkeletonText lines={6} lineHeight="h-16" />;

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="Settings" subtitle="Your account. Project settings live on each project." />

            {/* ── Profile ─────────────────────────────────────────── */}
            <Surface variant="panel" padding="md" className="flex flex-col gap-5">
                <div className="flex items-center gap-2">
                    <FiUser size={15} className="text-gray-400" />
                    <h2 className="font-heading text-base font-bold text-brand-dark dark:text-white">
                        Profile
                    </h2>
                </div>

                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <Field label="First name" required id="first-name">
                        <Input
                            value={profile.firstName}
                            onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                            disabled={savingProfile}
                        />
                    </Field>
                    <Field label="Last name" required id="last-name">
                        <Input
                            value={profile.lastName}
                            onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                            disabled={savingProfile}
                        />
                    </Field>
                    <Field label="Email" hint="Changing your sign-in email is not available yet." id="email">
                        <Input value={user.email} disabled />
                    </Field>
                    <Field label="Phone" id="phone">
                        <Input
                            value={profile.phone}
                            onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                            disabled={savingProfile}
                        />
                    </Field>
                    <Field label="Company" id="company">
                        <Input
                            value={profile.company}
                            onChange={(e) => setProfile((p) => ({ ...p, company: e.target.value }))}
                            disabled={savingProfile}
                        />
                    </Field>
                    <Field label="Position" id="position">
                        <Input
                            value={profile.position}
                            onChange={(e) => setProfile((p) => ({ ...p, position: e.target.value }))}
                            disabled={savingProfile}
                        />
                    </Field>
                    <Field label="Location" id="location">
                        <Input
                            value={profile.location}
                            onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                            disabled={savingProfile}
                        />
                    </Field>
                    <Field label="Timezone" id="timezone">
                        <Input
                            value={profile.timezone}
                            onChange={(e) => setProfile((p) => ({ ...p, timezone: e.target.value }))}
                            disabled={savingProfile}
                        />
                    </Field>
                </div>

                {profileError && (
                    <p role="alert" className="text-xs font-medium text-global-red">
                        {profileError}
                    </p>
                )}

                <div className="flex items-center gap-3">
                    <AccentButton size="sm" onClick={saveProfile} disabled={savingProfile}>
                        {savingProfile ? 'Saving…' : 'Save profile'}
                    </AccentButton>
                    {profileSaved && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                            <FiCheck size={13} /> Saved
                        </span>
                    )}
                </div>
            </Surface>

            {/* ── Password ────────────────────────────────────────── */}
            <Surface variant="panel" padding="md" className="flex flex-col gap-5">
                <div className="flex items-center gap-2">
                    <FiShield size={15} className="text-gray-400" />
                    <h2 className="font-heading text-base font-bold text-brand-dark dark:text-white">
                        Password
                    </h2>
                </div>

                <form
                    className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void savePassword();
                    }}
                >
                    <Field label="Current password" required id="current-password">
                        <Input
                            type="password"
                            revealable
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            disabled={savingPassword}
                        />
                    </Field>
                    <div className="hidden sm:block" />
                    <Field
                        label="New password"
                        hint="At least 8 characters, with upper, lower and a digit."
                        required
                        id="new-password"
                    >
                        <Input
                            type="password"
                            revealable
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={savingPassword}
                        />
                    </Field>
                    <Field label="Confirm new password" required id="confirm-password">
                        <Input
                            type="password"
                            revealable
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={savingPassword}
                        />
                    </Field>
                    <button type="submit" className="sr-only" disabled={savingPassword}>
                        Change password
                    </button>
                </form>

                {passwordError && (
                    <p role="alert" className="text-xs font-medium text-global-red">
                        {passwordError}
                    </p>
                )}

                <div>
                    <AccentButton size="sm" onClick={savePassword} disabled={savingPassword}>
                        {savingPassword ? 'Changing…' : 'Change password'}
                    </AccentButton>
                </div>
            </Surface>

            {/* ── Sessions ────────────────────────────────────────── */}
            <Surface variant="panel" padding="md" className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <FiMonitor size={15} className="text-gray-400" />
                        <h2 className="font-heading text-base font-bold text-brand-dark dark:text-white">
                            Active sessions
                        </h2>
                    </div>
                    {sessions.length > 0 && (
                        <AccentButton
                            size="sm"
                            variant="ghost"
                            icon={<FiLogOut size={13} />}
                            onClick={() => setConfirmRevokeAll(true)}
                        >
                            Sign out everywhere
                        </AccentButton>
                    )}
                </div>

                <p className="max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                    Every sign-in creates a session. If you see one you do not recognise, sign it out
                    and change your password.
                </p>

                {sessionsError && (
                    <p className="flex items-center gap-2 text-sm text-global-red">
                        <FiAlertTriangle size={15} />
                        {sessionsError}
                    </p>
                )}

                {loadingSessions ? (
                    <SkeletonText lines={2} lineHeight="h-12" />
                ) : sessions.length === 0 ? (
                    <p className="text-sm text-gray-400">No active sessions.</p>
                ) : (
                    <div className="flex flex-col divide-y divide-gray-100 dark:divide-white/5">
                        {sessions.map((s) => (
                            <div key={s.id} className="flex items-center gap-3 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="flex items-center gap-2 text-sm font-medium text-brand-dark dark:text-gray-200">
                                        {describeUserAgent(s.userAgent)}
                                        {s.current && <Badge tone="accent">this device</Badge>}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-gray-400">
                                        {s.ipAddress ? `${s.ipAddress} · ` : ''}
                                        started {relativeTime(s.createdAt)} · expires{' '}
                                        {formatDate(s.expiresAt)}
                                    </p>
                                </div>
                                <AccentButton
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => void revokeSession(s.id)}
                                >
                                    Sign out
                                </AccentButton>
                            </div>
                        ))}
                    </div>
                )}
            </Surface>

            <p className="text-xs text-gray-400">
                Looking for alert settings? They are per project — open a project and choose{' '}
                <Link
                    to="/projects"
                    className="font-medium text-brand-dark underline underline-offset-2 dark:text-brand-accent"
                >
                    Projects
                </Link>{' '}
                → Settings.
            </p>

            <ConfirmDialog
                open={confirmRevokeAll}
                onOpenChange={setConfirmRevokeAll}
                title="Sign out everywhere?"
                description="Every session is ended, including this one. You will be asked to sign in again."
                confirmLabel="Sign out everywhere"
                destructive
                onConfirm={async () => {
                    await sessionsAPI.revokeAll();
                    // Deliberately a hard reload: the refresh token is gone, so the
                    // in-memory session is a lie the moment this returns.
                    window.location.assign('/login');
                }}
            />
        </div>
    );
};

export default Settings;
