import { z } from 'zod';

export const createLogSchema = z.object({
    level: z.string().optional().default('info'),
    message: z.string().min(1, 'Message is required'),
    source: z.string().optional().default('unknown'),
    stack: z.string().nullable().optional(),
});

export const batchLogSchema = z.object({
    logs: z.array(z.object({
        level: z.string().optional().default('info'),
        message: z.string().min(1),
        source: z.string().optional().default('unknown'),
        stack: z.string().nullable().optional(),
    })).min(1, 'logs array is required'),
});
