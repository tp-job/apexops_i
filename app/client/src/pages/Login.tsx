import type { FC, FormEvent } from 'react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiLock, FiMail } from 'react-icons/fi';
import { AccentButton, Field, Input, Surface } from '@/components/design-system';
import AuthShell from '@/components/auth/AuthShell';
import { useAuth } from '@/context/auth-context';
import { isClean, validateEmail, validateLoginPassword } from '@/utils/validators';

interface Errors {
    email?: string;
    password?: string;
}

/**
 * Sign-in.
 *
 * Field errors are only computed on submit, not on every keystroke — telling
 * someone their email is invalid while they're still on the third character is
 * noise. After a failed submit the field re-validates as they type, so the error
 * clears the moment it's fixed.
 *
 * The server's message is shown verbatim for the form-level error. It already
 * distinguishes "invalid email or password" (401) from "account is deactivated"
 * (403), and paraphrasing would lose that.
 */
const Login: FC = () => {
    const { login, isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<Errors>({});
    const [submitted, setSubmitted] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Where the guard bounced them from, if anywhere.
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';

    // Already signed in (e.g. opened /login in a second tab) — don't show a form
    // they don't need. `replace` so Back doesn't return to it.
    if (!authLoading && isAuthenticated) {
        return <Navigate to={from} replace />;
    }

    const revalidate = (next: Partial<{ email: string; password: string }>) => {
        if (!submitted) return;
        const values = { email, password, ...next };
        setErrors({
            email: validateEmail(values.email),
            password: validateLoginPassword(values.password),
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
        setFormError(null);

        const nextErrors: Errors = {
            email: validateEmail(email),
            password: validateLoginPassword(password),
        };
        setErrors(nextErrors);
        if (!isClean(nextErrors)) return;

        setSubmitting(true);
        try {
            await login(email.trim(), password);
            navigate(from, { replace: true });
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Could not sign in. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthShell
            title="Sign in"
            subtitle="Welcome back. Your workspace is where you left it."
            footer={
                <>
                    No account yet?{' '}
                    <Link
                        to="/register"
                        className="rounded font-semibold text-brand-dark underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/40 dark:text-brand-accent dark:focus-visible:ring-brand-accent/50"
                    >
                        Create one
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                {formError && (
                    <Surface variant="panel" radius="xl" padding="sm">
                        <p role="alert" className="flex items-start gap-2.5 text-sm text-brand-dark dark:text-gray-200">
                            <FiAlertCircle className="mt-0.5 shrink-0 text-global-red" size={16} aria-hidden />
                            {formError}
                        </p>
                    </Surface>
                )}

                <Field label="Email" error={errors.email} required id="login-email">
                    <Input
                        type="email"
                        name="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        icon={<FiMail size={16} />}
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            revalidate({ email: e.target.value });
                        }}
                        disabled={submitting}
                    />
                </Field>

                <Field label="Password" error={errors.password} required id="login-password">
                    <Input
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        icon={<FiLock size={16} />}
                        revealable
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            revalidate({ password: e.target.value });
                        }}
                        disabled={submitting}
                    />
                </Field>

                <AccentButton type="submit" disabled={submitting} className="mt-1 w-full">
                    {submitting ? 'Signing in…' : 'Sign in'}
                </AccentButton>
            </form>
        </AuthShell>
    );
};

export default Login;
