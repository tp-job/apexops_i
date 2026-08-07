import { z } from 'zod';

const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number');

export const registerSchema = z
    .object({
        firstName: z.string().max(100).optional(),
        lastName: z.string().max(100).optional(),
        name: z.string().max(200).optional(),
        email: z.string().email('Invalid email format').max(255),
        password: passwordSchema,
    })
    .refine((data) => data.firstName?.trim() || data.name?.trim(), {
        message: 'First name or full name is required',
        path: ['firstName'],
    });

export const loginSchema = z.object({
    email: z.string().email('Invalid email format').max(255),
    password: z.string().min(1, 'Password is required').max(128),
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const updateProfileSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    position: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    timezone: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
    gender: z.string().nullable().optional(),
    birthDate: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    /**
     * Theme, persisted per account (spec D7) so the choice follows you to a new
     * browser instead of living only in that browser's localStorage.
     *
     * An enum, not a free string: this value is applied to `documentElement`, and
     * an unrecognised one would leave the app in neither theme. Compare `timezone`
     * above, which is still a string only because rows already hold display
     * formats like `"Asia/Bangkok (GMT+7)"` — the UI narrows it to a Select.
     */
    theme: z.enum(['light', 'dark', 'system']).optional(),
});

/**
 * Account settings — **only fields that are actually enforced** (spec S-D1).
 *
 * The `user_settings` table still has eight more columns
 * (`emailNotifications`, `pushNotifications`, `bugAlerts`, `weeklyReports`,
 * `teamUpdates`, `twoFactorAuth`, `loginAlerts`, `profileVisibility`,
 * `activityStatus`, `dataCollection`). Nothing reads them, so they are inert.
 * They are deliberately **absent here rather than dropped**: removing them from
 * this schema means nothing can write them until the feature that consumes them
 * lands, and that is the cheap, reversible half of the change. Dropping the
 * columns would be a migration that buys nothing.
 *
 * Notification preferences are **not** here on purpose — they are per-project
 * (spec S-D4, `alertOnRegression` / `webhookUrl` on `Project`), because "alert me
 * about this project" is the useful control and "alert me about everything" is not.
 *
 * `sessionTimeout` became **enforced** in Sprint 5 (2026-08-04) and is now the
 * only field here that means anything — which is exactly the bar S-D1 sets.
 */
export const updateSettingsSchema = z
    .object({
        /**
         * Idle timeout in minutes. **Enforced** as of Sprint 5: it sizes the access
         * token's `expiresIn` *and* the refresh token's sliding window
         * (`lib/sessions.ts`, spec D1).
         *
         * Both halves matter. Shortening only the access token enforces nothing
         * observable — the client silently re-issues it — so the setting would have
         * stayed decorative with more machinery behind it. Bounding the refresh
         * row is what turns it into a real idle timeout.
         *
         * Unblocked by Sprint 3's 401-refresh-and-retry path. Before that, cutting
         * token life would simply have logged people out mid-task.
         */
        sessionTimeout: z.number().int().min(5).max(480).optional(),
    })
    .refine((body) => Object.keys(body).length > 0, { message: 'No settings to update' });

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
});
