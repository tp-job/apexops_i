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
});

export const updateSettingsSchema = z.object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    bugAlerts: z.boolean().optional(),
    weeklyReports: z.boolean().optional(),
    teamUpdates: z.boolean().optional(),
    twoFactorAuth: z.boolean().optional(),
    sessionTimeout: z.number().int().positive().optional(),
    loginAlerts: z.boolean().optional(),
    profileVisibility: z.boolean().optional(),
    activityStatus: z.boolean().optional(),
    dataCollection: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
});
