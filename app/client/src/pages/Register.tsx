import type { FC, FormEvent } from 'react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiLock, FiMail, FiUser } from 'react-icons/fi';
import { AccentButton, Field, Input, Surface } from '@/components/design-system';
import AuthShell from '@/components/auth/AuthShell';
import { useAuth } from '@/context/auth-context';
import {
    isClean,
    validateEmail,
    validateFirstName,
    validateLastName,
    validatePassword,
} from '@/utils/validators';

interface Errors {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
}

const PASSWORD_HINT = 'At least 8 characters, with an uppercase letter, a lowercase letter and a number.';

/**
 * Registration.
 *
 * The password rules are stated up front as a hint rather than revealed one
 * rejection at a time — the server enforces four separate constraints, and
 * discovering them serially is the worst version of this form.
 *
 * Last name is genuinely optional here because the server treats it as optional
 * (`registerSchema`), and marking it required client-side would invent a rule the
 * backend doesn't have.
 */
const Register: FC = () => {
    const { register, isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<Errors>({});
    const [submitted, setSubmitted] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';

    if (!authLoading && isAuthenticated) {
        return <Navigate to={from} replace />;
    }

    const validateAll = (v: { firstName: string; lastName: string; email: string; password: string }): Errors => ({
        firstName: validateFirstName(v.firstName),
        lastName: validateLastName(v.lastName),
        email: validateEmail(v.email),
        password: validatePassword(v.password),
    });

    const revalidate = (next: Partial<{ firstName: string; lastName: string; email: string; password: string }>) => {
        if (!submitted) return;
        setErrors(validateAll({ firstName, lastName, email, password, ...next }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
        setFormError(null);

        const nextErrors = validateAll({ firstName, lastName, email, password });
        setErrors(nextErrors);
        if (!isClean(nextErrors)) return;

        setSubmitting(true);
        try {
            await register(firstName.trim(), lastName.trim(), email.trim(), password);
            navigate(from, { replace: true });
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Could not create your account. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthShell
            title="Create your account"
            subtitle="Set up a workspace for your tickets, logs and notes."
            footer={
                <>
                    Already have an account?{' '}
                    <Link
                        to="/login"
                        className="rounded font-semibold text-brand-dark underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/40 dark:text-brand-accent dark:focus-visible:ring-brand-accent/50"
                    >
                        Sign in
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

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First name" error={errors.firstName} required id="register-first-name">
                        <Input
                            name="firstName"
                            autoComplete="given-name"
                            placeholder="Ada"
                            icon={<FiUser size={16} />}
                            value={firstName}
                            onChange={(e) => {
                                setFirstName(e.target.value);
                                revalidate({ firstName: e.target.value });
                            }}
                            disabled={submitting}
                        />
                    </Field>

                    <Field label="Last name" error={errors.lastName} id="register-last-name">
                        <Input
                            name="lastName"
                            autoComplete="family-name"
                            placeholder="Lovelace"
                            value={lastName}
                            onChange={(e) => {
                                setLastName(e.target.value);
                                revalidate({ lastName: e.target.value });
                            }}
                            disabled={submitting}
                        />
                    </Field>
                </div>

                <Field label="Email" error={errors.email} required id="register-email">
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

                <Field
                    label="Password"
                    hint={PASSWORD_HINT}
                    error={errors.password}
                    required
                    id="register-password"
                >
                    <Input
                        type="password"
                        name="password"
                        autoComplete="new-password"
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
                    {submitting ? 'Creating account…' : 'Create account'}
                </AccentButton>
            </form>
        </AuthShell>
    );
};

export default Register;
