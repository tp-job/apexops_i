import { z } from 'zod';

export const createNoteSchema = z.object({
    title: z.string().optional().default(''),
    content: z.string().optional().default(''),
    type: z.string().optional().default('text'),
    isPinned: z.boolean().optional().default(false),
    color: z.string().nullable().optional(),
    tags: z.array(z.any()).optional().default([]),
    imageUrl: z.string().nullable().optional(),
    linkUrl: z.string().nullable().optional(),
    checklistItems: z.array(z.any()).optional().default([]),
    quote: z.any().optional().default({}),
}).refine((data) => data.title || data.content, {
    message: 'Title or content is required',
});

export const updateNoteSchema = z.object({
    title: z.string().optional(),
    content: z.string().optional(),
    type: z.string().optional(),
    isPinned: z.boolean().optional(),
    color: z.string().nullable().optional(),
    tags: z.array(z.any()).optional(),
    imageUrl: z.string().nullable().optional(),
    linkUrl: z.string().nullable().optional(),
    checklistItems: z.array(z.any()).optional(),
    quote: z.any().optional(),
});
