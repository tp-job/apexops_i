import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiAlertTriangle, FiClock, FiMail, FiUserPlus } from 'react-icons/fi';
import { AccentButton, Badge, Surface } from '@/components/design-system';
import { invitesAPI } from '@/services/team';
import { ApiError } from '@/api/request';
import { useAuth } from '@/context/auth-context';
import { getErrorMessage } from '@/utils/error';
import { formatDate } from '@/utils/format';
import type { InvitePreview } from '@/types/team';

type Dead = { kind: 'notFound' | 'gone'; message: string };

/**
 * `/invite/:token` — the accept screen.
 *
 * **Inside `ProtectedRoute`, outside `AppLayout`.** Inside the guard because an
 * invite can only be accepted by an authenticated account, and the guard already
 * carries `state.from`, so a signed-out visitor is sent to `/login` and returned
 * to this exact URL afterwards — the "signed-out → login-then-return" path costs
 * nothing extra. Outside the layout because an invitee may have zero projects,
 * and the workspace chrome would render a nav rail and a project switcher with
 * nothing in them.
 *
 * Four terminal states, and the wrong-address one is the reason `GET` exists at
 * all: `emailMatches` comes back on the preview, so the screen can say *"this was
 * sent to someone else"* before anyone clicks Accept and collects a 403. The
 * dead-link state deliberately does not distinguish expired from revoked from
 * already-accepted — the server folds all three into 410, because telling whoever
 * holds a leaked link *why* it failed is a small oracle about the project.
 */
const InviteAccept: FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [preview, setPreview] = useState<InvitePreview | null>(null);
    const [dead, setDead] = useState<Dead | null>(null);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [acceptError, setAcceptError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (!token) {
            setDead({ kind: 'notFound', message: 'That invite link is missing its token.' });
            setLoading(false);
            return;
        }

        void (async () => {
            try {
                const res = await invitesAPI.preview(token);
                if (!cancelled) setPreview(res);
            } catch (err) {
                if (cancelled) return;
                const status = err instanceof ApiError ? err.status : 0;
                setDead({
                    kind: status === 410 ? 'gone' : 'notFound',
                    message: getErrorMessage(err, 'That invite link could not be read.'),
                });
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [token]);

    const accept = async () => {
        if (!token) return;
        setAccepting(true);
        setAcceptError(null);
        try {
            const res = await invitesAPI.accept(token);
            // Straight into the workspace they just joined. Issues, not overview:
            // the same reason it is the landing route everywhere else.
            navigate(`/p/${res.project.slug}/issues`, { replace: true });
        } catch (err) {
            // 409 (archived since the link was minted) and 410 (revoked while this
            // screen was open) both land here — the message is the server's.
            setAcceptError(getErrorMessage(err, 'Could not accept this invite'));
        } finally {
            setAccepting(false);
        }
    };

    const shell = (children: React.ReactNode) => (
        <main className="grid min-h-screen place-items-center bg-light-bg px-4 py-10 dark:bg-dark-bg">
            <Surface variant="panel" padding="md" className="w-full max-w-md">
                {children}
            </Surface>
        </main>
    );

    if (loading) {
        return shell(
            <div className="flex items-center gap-3 py-6" role="status" aria-live="polite">
                <span
                    className="h-5 w-5 animate-spin rounded-full border-2 border-brand-dark/15 border-t-brand-dark dark:border-white/15 dark:border-t-brand-accent"
                    aria-hidden
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">Checking this invite…</span>
            </div>
        );
    }

    if (dead) {
        return shell(
            <div className="flex flex-col gap-4">
                <span
                    aria-hidden
                    className="grid h-11 w-11 place-items-center rounded-2xl bg-black/5 text-gray-400 dark:bg-white/10 dark:text-gray-500"
                >
                    {dead.kind === 'gone' ? <FiClock size={19} /> : <FiAlertTriangle size={19} />}
                </span>
                <div>
                    <h1 className="font-heading text-lg font-bold text-brand-dark dark:text-white">
                        {dead.kind === 'gone' ? 'This invite is no longer valid' : 'Invite not found'}
                    </h1>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                        {dead.kind === 'gone'
                            ? 'It has expired, been revoked, or already been used. Ask whoever invited you to send a new link — they expire after seven days.'
                            : 'Check that you copied the whole link. If it was split across two lines in a chat message, the end is probably missing.'}
                    </p>
                </div>
                <div>
                    <AccentButton size="sm" variant="ghost" onClick={() => navigate('/projects')}>
                        Go to your projects
                    </AccentButton>
                </div>
            </div>
        );
    }

    if (!preview) return shell(<p className="text-sm text-gray-500">Nothing to show.</p>);

    // Bound to the address, not to whoever holds the link (T-D1). Surfaced from
    // the preview so nobody has to click Accept to discover it.
    if (!preview.emailMatches) {
        return shell(
            <div className="flex flex-col gap-4">
                <span
                    aria-hidden
                    className="grid h-11 w-11 place-items-center rounded-2xl bg-black/5 text-gray-400 dark:bg-white/10 dark:text-gray-500"
                >
                    <FiMail size={19} />
                </span>
                <div>
                    <h1 className="font-heading text-lg font-bold text-brand-dark dark:text-white">
                        This invite was sent to another address
                    </h1>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                        It is bound to <strong className="font-semibold">{preview.email}</strong>, and
                        you are signed in as{' '}
                        <strong className="font-semibold">{user?.email ?? 'another account'}</strong>.
                        That binding is deliberate — a link forwarded into the wrong channel should be
                        a dead link, not a way in.
                    </p>
                </div>
                <p className="text-xs text-gray-400">
                    Sign in as {preview.email} and open the link again, or ask for an invite to the
                    address you actually use.
                </p>
                <div className="flex flex-wrap gap-2">
                    <AccentButton size="sm" variant="ghost" onClick={() => navigate('/projects')}>
                        Go to your projects
                    </AccentButton>
                </div>
            </div>
        );
    }

    return shell(
        <div className="flex flex-col gap-5">
            <span
                aria-hidden
                className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-accent/20 text-brand-dark dark:text-brand-accent"
            >
                <FiUserPlus size={19} />
            </span>

            <div>
                <h1 className="font-heading text-lg font-bold text-brand-dark dark:text-white">
                    Join {preview.project.name}
                </h1>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                    {preview.invitedBy || 'Someone'} invited {preview.email} to this project.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Badge tone="outline">{preview.role}</Badge>
                <span>· expires {formatDate(preview.expiresAt)}</span>
            </div>

            <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                {preview.role === 'admin'
                    ? 'As an admin you can change project settings, rotate the ingest key and manage members.'
                    : 'As a member you can triage issues, comment and file tickets. Project settings stay read-only.'}
            </p>

            {acceptError && (
                <p role="alert" className="text-xs font-medium text-global-red">
                    {acceptError}
                </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <AccentButton onClick={accept} disabled={accepting}>
                    {accepting ? 'Joining…' : 'Accept invite'}
                </AccentButton>
                <Link
                    to="/projects"
                    className="rounded text-xs font-medium text-gray-500 underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/30 dark:text-gray-400"
                >
                    Not now
                </Link>
            </div>
        </div>
    );
};

export default InviteAccept;
