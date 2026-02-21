/**
 * Note API Utilities
 * 
 * This file contains all API-related functions for the note system.
 * Extracted from NoteEditor.tsx and NoteDashboard.tsx to improve code organization
 * without changing any behavior.
 */

import { isMockEnabled, isNetworkFailure, readOnlyOfflineMessage } from '@/utils/offlineMock';
import { mockNotes } from '@/utils/mockData';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Get the authorization token from localStorage
 */
const getAuthToken = (): string | null => {
    return localStorage.getItem('accessToken');
};

/**
 * Create authorization headers
 */
const getAuthHeaders = (token: string, includeContentType = false): HeadersInit => {
    const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`
    };

    if (includeContentType) {
        headers['Content-Type'] = 'application/json';
    }

    return headers;
};

// ============================================================================
// FETCH OPERATIONS
// ============================================================================

/**
 * Fetch all notes for the current user
 * Used by: NoteDashboard
 */
export const fetchNotes = async (): Promise<{ success: boolean; data?: any[]; error?: string }> => {
    const token = getAuthToken();
    if (!token) {
        return { success: false, error: 'No authentication token found' };
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/notes`, {
            headers: getAuthHeaders(token)
        });

        if (res.ok) {
            const data = await res.json();
            return { success: true, data };
        } else {
            return { success: false, error: 'Failed to fetch notes' };
        }
    } catch (err) {
        console.error('Error fetching notes:', err);
        if (isMockEnabled() && isNetworkFailure(err)) {
            return { success: true, data: mockNotes as any[] };
        }
        return { success: false, error: 'Failed to fetch notes' };
    }
};

/**
 * Fetch a single note by ID
 * Used by: NoteEditor
 */
export const fetchNoteById = async (noteId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    const token = getAuthToken();
    if (!token) {
        return { success: false, error: 'No authentication token found' };
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
            headers: getAuthHeaders(token)
        });

        if (res.ok) {
            const data = await res.json();
            return { success: true, data };
        } else {
            return { success: false, error: 'Note not found' };
        }
    } catch (err) {
        console.error('Error fetching note:', err);
        if (isMockEnabled() && isNetworkFailure(err)) {
            const found = (mockNotes as any[]).find((n) => String(n.id) === String(noteId));
            if (found) return { success: true, data: found };
            return { success: false, error: 'Note not found' };
        }
        return { success: false, error: 'Failed to load note' };
    }
};

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

interface CreateNoteParams {
    title: string;
    content: string;
    type?: 'text' | 'image' | 'list' | 'link';
    isPinned?: boolean;
    tags?: string[];
    color?: string;
}

/**
 * Create a new note
 * Used by: NoteDashboard, NoteEditor
 */
export const createNote = async (params: CreateNoteParams): Promise<{ success: boolean; data?: any; error?: string }> => {
    const token = getAuthToken();
    if (!token) {
        return { success: false, error: 'Please login to add notes' };
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/notes`, {
            method: 'POST',
            headers: getAuthHeaders(token, true),
            body: JSON.stringify({
                title: params.title,
                content: params.content,
                type: params.type || 'text',
                isPinned: params.isPinned || false,
                tags: params.tags || [],
                color: params.color
            })
        });

        if (res.ok) {
            const newNote = await res.json();
            return { success: true, data: newNote };
        } else {
            const error = await res.json();
            return { success: false, error: error.error || 'Failed to create note' };
        }
    } catch (err) {
        console.error('Error adding note:', err);
        if (isMockEnabled() && isNetworkFailure(err)) {
            return { success: false, error: readOnlyOfflineMessage() };
        }
        return { success: false, error: 'Failed to create note' };
    }
};

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

interface UpdateNoteParams {
    title?: string;
    content?: string;
    checklistItems?: { text: string; checked: boolean }[];
    quote?: { text: string; author: string };
    tags?: string[];
    color?: string;
    isPinned?: boolean;
}

/**
 * Update an existing note
 * Used by: NoteEditor
 */
export const updateNote = async (noteId: string, params: UpdateNoteParams): Promise<{ success: boolean; data?: any; error?: string }> => {
    const token = getAuthToken();
    if (!token) {
        return { success: false, error: 'No authentication token found' };
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(token, true),
            body: JSON.stringify(params)
        });

        if (res.ok) {
            const updated = await res.json();
            return { success: true, data: updated };
        } else {
            const error = await res.json();
            return { success: false, error: error.error || 'Failed to save note' };
        }
    } catch (err) {
        console.error('Error saving note:', err);
        if (isMockEnabled() && isNetworkFailure(err)) {
            return { success: false, error: readOnlyOfflineMessage() };
        }
        return { success: false, error: 'Failed to save note' };
    }
};

/**
 * Toggle the pin status of a note
 * Used by: NoteDashboard
 */
export const toggleNotePin = async (noteId: string, isPinned: boolean): Promise<{ success: boolean; error?: string }> => {
    const token = getAuthToken();
    if (!token) {
        return { success: false, error: 'No authentication token found' };
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
            method: 'PUT',
            headers: getAuthHeaders(token, true),
            body: JSON.stringify({ isPinned: !isPinned })
        });

        if (res.ok) {
            return { success: true };
        } else {
            return { success: false, error: 'Failed to toggle pin' };
        }
    } catch (err) {
        console.error('Error toggling pin:', err);
        if (isMockEnabled() && isNetworkFailure(err)) {
            return { success: false, error: readOnlyOfflineMessage() };
        }
        return { success: false, error: 'Failed to toggle pin' };
    }
};

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete a note by ID
 * Used by: NoteEditor, NoteDashboard
 */
export const deleteNote = async (noteId: string): Promise<{ success: boolean; error?: string }> => {
    const token = getAuthToken();
    if (!token) {
        return { success: false, error: 'Please login to delete notes' };
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token)
        });

        if (res.ok) {
            return { success: true };
        } else {
            const error = await res.json();
            return { success: false, error: error.error || 'Failed to delete note' };
        }
    } catch (err) {
        console.error('Error deleting note:', err);
        if (isMockEnabled() && isNetworkFailure(err)) {
            return { success: false, error: readOnlyOfflineMessage() };
        }
        return { success: false, error: 'Failed to delete note' };
    }
};
