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
    content: string;
    type: 'text' | 'image' | 'list' | 'link';
    isPinned: boolean;
    color?: string;
    tags?: string[];
    imageUrl?: string;
    linkUrl?: string;
    checklistItems?: ChecklistItem[];
    quote?: Quote;
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
