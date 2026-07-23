import { z } from 'zod';

export const createTicketSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().default(''),
    status: z.string().optional().default('open'),
    priority: z.string().optional().default('medium'),
    assignee: z.string().nullable().optional(),
    reporter: z.string().optional().default('System'),
    tags: z.array(z.any()).optional().default([]),
    relatedLogs: z.array(z.any()).optional().default([]),
});

export const updateTicketSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    assignee: z.string().nullable().optional(),
    tags: z.array(z.any()).optional(),
});
