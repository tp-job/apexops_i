/**
 * Note Type Definitions
 * 
 * Shared type definitions for the note system.
 * Extracted from NoteEditor.tsx and NoteDashboard.tsx for consistency.
 */

export type NoteBlockType = 'paragraph' | 'heading' | 'checklist' | 'quote' | 'code' | 'richText';

export interface BaseNoteBlock {
    id: string;
    type: NoteBlockType;
}

export interface ParagraphBlock extends BaseNoteBlock {
    type: 'paragraph';
    text: string;
}

export interface RichTextBlock extends BaseNoteBlock {
    type: 'richText';
    html: string;
}

export type NoteBlock = ParagraphBlock | RichTextBlock;

export interface Note {
    id: string;
    title: string;
    /**
     * Always plain text. A rich note keeps its formatting in `contentRich` and
     * projects a plain rendering here, so card previews and search keep working
     * on notes they know nothing about.
     */
    content: string;
    /**
     * A TipTap/ProseMirror document, or null for a note written as plain text.
     * Typed `unknown` on purpose — only `components/editor` knows its shape, and
     * spreading a node type through the app is how the two drift apart.
     */
    contentRich?: unknown | null;
    type: 'text' | 'image' | 'list' | 'link';
    isPinned: boolean;
    color?: string;
    tags?: string[];
    imageUrl?: string;
    linkUrl?: string;
    checklistItems?: ChecklistItem[];
    quote?: Quote;
    /** ISO date the note is planned for. Null/absent means unscheduled. */
    scheduledFor?: string | null;
    /** ISO deadline, independent of `scheduledFor`. */
    dueDate?: string | null;
    createdAt?: string;
    updatedAt?: string;
    blocks?: NoteBlock[];
}

export interface ChecklistItem {
    text: string;
    checked: boolean;
}

export interface Quote {
    text: string;
    author: string;
}
