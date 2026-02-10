import { useState, useEffect, useRef, useCallback, type FC } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

// Types
interface Note {
    id: string;
    title: string;
    content: string;
    type: 'text' | 'image' | 'list' | 'link';
    isPinned: boolean;
    color?: string;
    tags: string[];
    imageUrl?: string;
    linkUrl?: string;
    checklistItems: { text: string; checked: boolean }[];
    quote: { text: string; author: string };
    updatedAt?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Toast Component
const Toast: FC<{ message: string; type: 'success' | 'error' | 'info'; onClose: () => void }> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';

    return (
        <div className={`fixed bottom-6 right-6 z-50 ${bgColor} text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up`}>
            <i className={`${type === 'success' ? 'ri-check-line' : type === 'error' ? 'ri-error-warning-line' : 'ri-information-line'} text-xl`}></i>
            <span className="font-medium">{message}</span>
            <button onClick={onClose} className="ml-2 hover:opacity-70">
                <i className="ri-close-line"></i>
            </button>
        </div>
    );
};

// Delete Confirmation Modal
const DeleteModal: FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; isDeleting: boolean }> = ({ isOpen, onClose, onConfirm, isDeleting }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-light-surface dark:bg-dark-surface rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-light-border dark:border-dark-border">
                <div className="flex items-center gap-4 mb-4">
                    <div className="size-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <i className="ri-delete-bin-line text-2xl text-red-500"></i>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">Delete Note</h3>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">This action cannot be undone</p>
                    </div>
                </div>
                <p className="text-light-text dark:text-dark-text mb-6">
                    Are you sure you want to delete this note? All content will be permanently removed.
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 transition-colors"
                        disabled={isDeleting}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-6 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {isDeleting ? (
                            <>
                                <i className="ri-loader-4-line animate-spin"></i>
                                Deleting...
                            </>
                        ) : (
                            <>
                                <i className="ri-delete-bin-line"></i>
                                Delete
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Toolbar Button Component with active state support
const ToolbarButton: FC<{
    icon: string;
    title?: string;
    className?: string;
    onClick?: () => void;
    isActive?: boolean;
    command?: string;
}> = ({ icon, title, className = '', onClick, isActive = false, command }) => (
    <button
        onClick={onClick}
        data-command={command}
        className={`p-1.5 rounded hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 transition-all duration-150 ${isActive
            ? 'bg-ember/10 text-ember dark:bg-ember/20'
            : 'text-light-text-secondary dark:text-dark-text-secondary'
            } ${className}`}
        title={title}
    >
        <i className={`${icon} text-lg`}></i>
    </button>
);

const ToolbarDivider: FC = () => (
    <div className="w-[1px] h-4 bg-light-border dark:bg-dark-border mx-1 shrink-0" />
);

const TabButton: FC<{ label: string; isActive?: boolean; onClick?: () => void }> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors ${isActive
            ? 'border-ember text-light-text-primary dark:text-dark-text-primary'
            : 'border-transparent text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
            }`}
    >
        {label}
    </button>
);

const NoteEditor: FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const noteId = searchParams.get('id');
    const isNewNote = !noteId;

    const [note, setNote] = useState<Note | null>(null);
    const [loading, setLoading] = useState(!isNewNote);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [lastSaved, setLastSaved] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [activeTab, setActiveTab] = useState('Insight');

    // Refs for contenteditable elements
    const editorRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLDivElement>(null);

    // Toolbar state
    const [toolbarState, setToolbarState] = useState({
        bold: false,
        italic: false,
        underline: false,
        strikeThrough: false,
    });

    // Show toast helper
    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type });
    }, []);

    // ========================================
    // Formatting Functions
    // ========================================

    const addClickFeedback = useCallback((buttonSelector: string) => {
        const button = document.querySelector(buttonSelector) as HTMLElement;
        if (button) {
            button.style.transform = 'scale(0.96)';
            button.style.transition = 'transform 0.12s ease';
            setTimeout(() => {
                button.style.transform = '';
            }, 100);
        }
    }, []);

    const execCommand = useCallback((command: string, value: string | null = null): boolean => {
        const editor = editorRef.current;
        if (!editor) return false;

        editor.focus();
        const result = document.execCommand(command, false, value ?? undefined);
        setTimeout(updateToolbarStates, 10);

        return result;
    }, []);

    const formatText = useCallback((command: string) => {
        addClickFeedback(`[data-command="${command}"]`);
        execCommand(command);
    }, [addClickFeedback, execCommand]);

    const insertList = useCallback((type: 'ul' | 'ol') => {
        addClickFeedback(`[data-command="${type}"]`);
        const command = type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList';
        execCommand(command);
    }, [addClickFeedback, execCommand]);

    const alignText = useCallback((alignment: 'justifyLeft' | 'justifyCenter' | 'justifyRight') => {
        addClickFeedback(`[data-command="${alignment}"]`);
        execCommand(alignment);
    }, [addClickFeedback, execCommand]);

    const insertLink = useCallback(() => {
        const url = prompt('Enter URL:');
        if (url) {
            execCommand('createLink', url);
            setTimeout(() => {
                const selection = window.getSelection();
                if (selection && selection.anchorNode) {
                    const link = selection.anchorNode.parentElement?.closest('a');
                    if (link) {
                        link.setAttribute('target', '_blank');
                        link.setAttribute('rel', 'noopener noreferrer');
                    }
                }
            }, 10);
        }
    }, [execCommand]);

    const insertImage = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                execCommand('insertImage', base64);
            };
            reader.readAsDataURL(file);
        };

        input.click();
    }, [execCommand]);

    const insertTable = useCallback((rows: number = 3, cols: number = 3) => {
        const editor = editorRef.current;
        if (!editor) return;

        let tableHtml = '<table class="editor-table" style="border-collapse: collapse; width: 100%; margin: 1rem 0;">';

        for (let i = 0; i < rows; i++) {
            tableHtml += '<tr>';
            for (let j = 0; j < cols; j++) {
                tableHtml += `<td style="border: 1px solid var(--color-light-border); padding: 8px; min-width: 80px;" contenteditable="true">&nbsp;</td>`;
            }
            tableHtml += '</tr>';
        }

        tableHtml += '</table>';
        execCommand('insertHTML', tableHtml);
    }, [execCommand]);

    const undoAction = useCallback(() => {
        addClickFeedback('[data-command="undo"]');
        execCommand('undo');
    }, [addClickFeedback, execCommand]);

    const redoAction = useCallback(() => {
        addClickFeedback('[data-command="redo"]');
        execCommand('redo');
    }, [addClickFeedback, execCommand]);

    const insertQuote = useCallback(() => {
        addClickFeedback('[data-command="quote"]');
        execCommand('formatBlock', 'blockquote');
    }, [addClickFeedback, execCommand]);

    const insertCode = useCallback(() => {
        addClickFeedback('[data-command="code"]');
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const selectedText = range.toString();

            if (selectedText) {
                const code = document.createElement('code');
                code.style.cssText = 'background: var(--color-dark-surface-2); padding: 2px 6px; border-radius: 4px; font-family: monospace;';
                code.textContent = selectedText;
                range.deleteContents();
                range.insertNode(code);
            } else {
                execCommand('insertHTML', '<code style="background: var(--color-dark-surface-2); padding: 2px 6px; border-radius: 4px; font-family: monospace;">&nbsp;</code>');
            }
        }
    }, [addClickFeedback, execCommand]);

    const insertHighlight = useCallback(() => {
        addClickFeedback('[data-command="highlight"]');
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const selectedText = range.toString();

            if (selectedText) {
                const mark = document.createElement('mark');
                mark.style.cssText = 'background: rgba(255, 213, 79, 0.4); padding: 2px 0;';
                mark.textContent = selectedText;
                range.deleteContents();
                range.insertNode(mark);
            }
        }
    }, [addClickFeedback]);

    const updateToolbarStates = useCallback(() => {
        const commandMap: Record<string, keyof typeof toolbarState> = {
            bold: 'bold',
            italic: 'italic',
            underline: 'underline',
            strikeThrough: 'strikeThrough',
        };

        const newState = { ...toolbarState };

        Object.keys(commandMap).forEach((cmd) => {
            try {
                newState[commandMap[cmd]] = document.queryCommandState(cmd);
            } catch {
                // Ignore errors
            }
        });

        setToolbarState(newState);
    }, []);

    // ========================================
    // Keyboard Shortcuts
    // ========================================
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!editorRef.current?.contains(document.activeElement) &&
                !titleRef.current?.contains(document.activeElement)) {
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        formatText('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        formatText('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        formatText('underline');
                        break;
                    case 'z':
                        if (e.shiftKey) {
                            e.preventDefault();
                            redoAction();
                        } else {
                            e.preventDefault();
                            undoAction();
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        redoAction();
                        break;
                    case 's':
                        e.preventDefault();
                        handleSave();
                        break;
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [formatText, undoAction, redoAction]);

    // Selection change listener
    useEffect(() => {
        const handleSelectionChange = () => {
            updateToolbarStates();
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, [updateToolbarStates]);

    // ========================================
    // API Functions
    // ========================================

    // Initialize new note or fetch existing
    useEffect(() => {
        if (isNewNote) {
            // Create empty note for new note
            setNote({
                id: '',
                title: '',
                content: '',
                type: 'text',
                isPinned: false,
                tags: [],
                checklistItems: [],
                quote: { text: '', author: '' }
            });
            setLoading(false);
        } else {
            // Fetch existing note
            const fetchNote = async () => {
                const token = localStorage.getItem('accessToken');
                try {
                    const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setNote(data);
                        if (data.updatedAt) setLastSaved(new Date(data.updatedAt).toLocaleTimeString());

                        setTimeout(() => {
                            if (editorRef.current && data.content) {
                                editorRef.current.innerHTML = data.content;
                            }
                            if (titleRef.current && data.title) {
                                titleRef.current.textContent = data.title;
                            }
                        }, 0);
                    } else {
                        showToast('Note not found', 'error');
                        navigate('/note');
                    }
                } catch (err) {
                    console.error('Error fetching note:', err);
                    showToast('Failed to load note', 'error');
                } finally {
                    setLoading(false);
                }
            };

            fetchNote();
        }
    }, [noteId, isNewNote, navigate, showToast]);

    // Save note (create or update)
    const handleSave = async () => {
        if (!note) return;

        const content = editorRef.current?.innerHTML || '';
        const title = titleRef.current?.textContent || '';

        if (!title && !content) {
            showToast('Please add a title or content', 'error');
            return;
        }

        setSaving(true);
        const token = localStorage.getItem('accessToken');

        try {
            if (isNewNote) {
                // Create new note
                const res = await fetch(`${API_BASE_URL}/api/notes`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title,
                        content,
                        type: 'text',
                        isPinned: note.isPinned,
                        tags: note.tags,
                        color: note.color
                    })
                });

                if (res.ok) {
                    const newNote = await res.json();
                    showToast('Note created successfully!', 'success');
                    // Navigate to edit mode with new note ID
                    navigate(`/note-editor?id=${newNote.id}`, { replace: true });
                } else {
                    const error = await res.json();
                    showToast(error.error || 'Failed to create note', 'error');
                }
            } else {
                // Update existing note
                const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title,
                        content,
                        checklistItems: note.checklistItems,
                        quote: note.quote,
                        tags: note.tags,
                        color: note.color,
                        isPinned: note.isPinned
                    })
                });

                if (res.ok) {
                    const updated = await res.json();
                    setNote(updated);
                    setLastSaved(new Date().toLocaleTimeString());
                    showToast('Note saved successfully!', 'success');
                } else {
                    const error = await res.json();
                    showToast(error.error || 'Failed to save note', 'error');
                }
            }
        } catch (err) {
            console.error('Error saving note:', err);
            showToast('Failed to save note', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Delete note
    const handleDelete = async () => {
        if (!noteId) return;

        setDeleting(true);
        const token = localStorage.getItem('accessToken');

        try {
            const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                showToast('Note deleted successfully!', 'success');
                setTimeout(() => {
                    navigate('/note');
                }, 1000);
            } else {
                const error = await res.json();
                showToast(error.error || 'Failed to delete note', 'error');
            }
        } catch (err) {
            console.error('Error deleting note:', err);
            showToast('Failed to delete note', 'error');
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    // Handle content changes
    const handleContentChange = useCallback(() => {
        if (editorRef.current && note) {
            setNote(prev => prev ? { ...prev, content: editorRef.current?.innerHTML || '' } : null);
        }
    }, [note]);

    const handleTitleChange = useCallback(() => {
        if (titleRef.current && note) {
            setNote(prev => prev ? { ...prev, title: titleRef.current?.textContent || '' } : null);
        }
    }, [note]);

    // ========================================
    // Render
    // ========================================
    if (loading) {
        return (
            <div className="flex-1 h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember"></div>
            </div>
        );
    }

    if (!note) {
        return (
            <div className="flex-1 h-screen flex flex-col items-center justify-center bg-light-bg dark:bg-dark-bg">
                <i className="ri-error-warning-line text-6xl text-light-text-secondary dark:text-dark-text-secondary mb-4"></i>
                <p className="text-xl text-light-text-secondary dark:text-dark-text-secondary">Note not found</p>
                <button onClick={() => navigate('/note')} className="mt-4 px-6 py-2 bg-ember text-white rounded-xl shadow-lg hover:bg-wine transition-all">
                    Go Back to Gallery
                </button>
            </div>
        );
    }

    return (
        <div className="font-inter text-light-text dark:text-dark-text antialiased h-screen flex flex-col overflow-hidden">
            {/* Toast */}
            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            )}

            {/* Delete Modal */}
            <DeleteModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                isDeleting={deleting}
            />

            {/* Header */}
            <header className="h-14 flex items-center justify-between px-4 border-b border-light-border dark:border-dark-border bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur-md shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/note')} className="size-10 flex items-center justify-center text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 rounded-xl transition-all">
                        <i className="ri-arrow-left-line text-2xl"></i>
                    </button>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-ember uppercase tracking-widest leading-none">
                            {isNewNote ? 'New Note' : 'Edit Note'}
                        </span>
                        <div className="flex items-center gap-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                            <i className="ri-folder-open-line"></i> Workspace <i className="ri-arrow-right-s-line"></i> {note.type}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-[10px] font-bold text-light-text-secondary/70 dark:text-dark-text-secondary/70 uppercase tracking-wider">Status</span>
                        <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary italic">
                            {saving ? 'Saving changes...' : isNewNote ? 'New note' : lastSaved ? `Last saved ${lastSaved}` : 'All changes saved'}
                        </span>
                    </div>

                    {/* Delete Button (only for existing notes) */}
                    {!isNewNote && (
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete note"
                        >
                            <i className="ri-delete-bin-line text-xl"></i>
                        </button>
                    )}

                    <div className="w-[1px] h-8 bg-light-border dark:bg-dark-border mx-1"></div>

                    <button
                        onClick={handleSave}
                        className={`px-6 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 ${saving ? 'bg-light-surface-2 text-light-text-secondary' : 'bg-gradient-to-r from-ember to-wine text-white hover:shadow-lg hover:shadow-ember/20 active:scale-95'}`}
                        disabled={saving}
                    >
                        {saving ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-save-3-line"></i>}
                        {saving ? 'Saving' : isNewNote ? 'Create Note' : 'Save Changes'}
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Main Editor Section */}
                <main className="flex-1 flex flex-col min-w-0 relative overflow-y-auto">
                    {/* Toolbar */}
                    <div className="sticky top-0 z-10 px-6 py-2 border-b border-light-border dark:border-dark-border bg-light-surface/50 dark:bg-dark-surface/50 backdrop-blur-md flex items-center justify-between">
                        <div className="flex items-center gap-1 flex-wrap">
                            {/* Undo/Redo Group */}
                            <div className="flex items-center gap-0.5">
                                <ToolbarButton icon="ri-arrow-go-back-line" title="Undo (Ctrl+Z)" command="undo" onClick={undoAction} />
                                <ToolbarButton icon="ri-arrow-go-forward-line" title="Redo (Ctrl+Y)" command="redo" onClick={redoAction} />
                            </div>

                            <ToolbarDivider />

                            {/* Text Formatting Group */}
                            <div className="flex items-center gap-0.5">
                                <ToolbarButton icon="ri-bold" title="Bold (Ctrl+B)" command="bold" isActive={toolbarState.bold} onClick={() => formatText('bold')} />
                                <ToolbarButton icon="ri-italic" title="Italic (Ctrl+I)" command="italic" isActive={toolbarState.italic} onClick={() => formatText('italic')} />
                                <ToolbarButton icon="ri-underline" title="Underline (Ctrl+U)" command="underline" isActive={toolbarState.underline} onClick={() => formatText('underline')} />
                                <ToolbarButton icon="ri-strikethrough" title="Strikethrough" command="strikeThrough" isActive={toolbarState.strikeThrough} onClick={() => formatText('strikeThrough')} />
                            </div>

                            <ToolbarDivider />

                            {/* Code & Highlight */}
                            <div className="flex items-center gap-0.5">
                                <ToolbarButton icon="ri-code-line" title="Code" command="code" onClick={insertCode} />
                                <ToolbarButton icon="ri-mark-pen-line" title="Highlight" command="highlight" onClick={insertHighlight} />
                            </div>

                            <ToolbarDivider />

                            {/* Lists Group */}
                            <div className="flex items-center gap-0.5">
                                <ToolbarButton icon="ri-list-unordered" title="Bullet List" command="ul" onClick={() => insertList('ul')} />
                                <ToolbarButton icon="ri-list-ordered" title="Numbered List" command="ol" onClick={() => insertList('ol')} />
                            </div>

                            <ToolbarDivider />

                            {/* Alignment Group */}
                            <div className="flex items-center gap-0.5">
                                <ToolbarButton icon="ri-align-left" title="Align Left" command="justifyLeft" onClick={() => alignText('justifyLeft')} />
                                <ToolbarButton icon="ri-align-center" title="Align Center" command="justifyCenter" onClick={() => alignText('justifyCenter')} />
                                <ToolbarButton icon="ri-align-right" title="Align Right" command="justifyRight" onClick={() => alignText('justifyRight')} />
                            </div>

                            <ToolbarDivider />

                            {/* Media/Other Group */}
                            <div className="flex items-center gap-0.5">
                                <ToolbarButton icon="ri-link" title="Insert Link" command="link" onClick={insertLink} />
                                <ToolbarButton icon="ri-image-line" title="Insert Image" command="image" onClick={insertImage} />
                                <ToolbarButton icon="ri-table-2" title="Insert Table" command="table" onClick={() => insertTable(3, 3)} />
                                <ToolbarButton icon="ri-double-quotes-r" title="Quote" command="quote" onClick={insertQuote} />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => setNote({ ...note, isPinned: !note.isPinned })}
                                className={`p-2 rounded-lg transition-all ${note.isPinned ? 'bg-ember/10 text-ember dark:bg-ember/20' : 'hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 text-light-text-secondary dark:text-dark-text-secondary'}`}
                            >
                                <i className={note.isPinned ? "ri-pushpin-2-fill text-xl" : "ri-pushpin-2-line text-xl"}></i>
                            </button>
                        </div>
                    </div>

                    <div className="max-w-[900px] mx-auto w-full px-8 lg:px-16 py-12 flex flex-col gap-6">
                        {/* Title Section */}
                        <div className="space-y-4">
                            <div
                                ref={titleRef}
                                contentEditable
                                suppressContentEditableWarning
                                onInput={handleTitleChange}
                                className="w-full bg-transparent border-none p-0 text-5xl font-black text-light-text-primary dark:text-dark-text-primary focus:ring-0 focus:outline-none leading-tight tracking-tight min-h-[60px] empty:before:content-['The_Title_of_Your_Note'] empty:before:text-light-text-secondary/30 dark:empty:before:text-dark-text-secondary/30"
                                data-placeholder="The Title of Your Note"
                            />

                            <div className="flex flex-wrap gap-2 items-center">
                                {note.tags?.map((tag, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo/5 dark:bg-indigo/20 text-indigo dark:text-indigo-muted text-xs font-bold border border-indigo/10 dark:border-indigo/30">
                                        <i className="ri-hashtag text-[10px]"></i>
                                        {tag}
                                        <button
                                            onClick={() => setNote({ ...note, tags: note.tags.filter(t => t !== tag) })}
                                            className="hover:text-ember transition-colors ml-1"
                                        >
                                            <i className="ri-close-line"></i>
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        const tag = prompt('Enter tag name:');
                                        if (tag && !note.tags.includes(tag)) {
                                            setNote({ ...note, tags: [...note.tags, tag] });
                                        }
                                    }}
                                    className="size-6 rounded-full border border-dashed border-light-text-secondary dark:border-dark-text-secondary flex items-center justify-center text-light-text-secondary dark:text-dark-text-secondary hover:border-ember hover:text-ember transition-all"
                                >
                                    <i className="ri-add-line"></i>
                                </button>
                            </div>
                        </div>

                        {/* Visual Divider */}
                        <div className="w-20 h-[2px] bg-light-border dark:bg-dark-border rounded-full"></div>

                        {/* Content Section */}
                        <div
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={handleContentChange}
                            className="w-full bg-transparent border-none p-0 text-xl leading-relaxed text-light-text-primary dark:text-dark-text-primary min-h-[50vh] focus:ring-0 focus:outline-none empty:before:content-['Start_putting_your_thoughts_here._Express_yourself_freely...'] empty:before:text-light-text-secondary/50 dark:empty:before:text-dark-text-secondary/50 prose prose-lg dark:prose-invert max-w-none
                            [&_blockquote]:border-l-4 [&_blockquote]:border-ember [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-light-text-secondary dark:[&_blockquote]:text-dark-text-secondary
                            [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
                            [&_a]:text-ember [&_a]:underline
                            [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-4
                            [&_table]:w-full [&_table]:border-collapse
                            [&_td]:border [&_td]:border-light-border dark:[&_td]:border-dark-border [&_td]:p-2
                            [&_th]:border [&_th]:border-light-border dark:[&_th]:border-dark-border [&_th]:p-2 [&_th]:bg-light-surface-2 dark:[&_th]:bg-dark-surface-2"
                            data-placeholder="Start putting your thoughts here. Express yourself freely..."
                        />
                    </div>
                </main>

                {/* Info Aside Panel */}
                <aside className="w-[320px] bg-light-surface/30 dark:bg-dark-surface/30 backdrop-blur-sm border-l border-light-border dark:border-dark-border hidden lg:flex flex-col shrink-0">
                    <div className="flex border-b border-light-border dark:border-dark-border">
                        <TabButton label="Insight" isActive={activeTab === 'Insight'} onClick={() => setActiveTab('Insight')} />
                        <TabButton label="Network" isActive={activeTab === 'Network'} onClick={() => setActiveTab('Network')} />
                        <TabButton label="Activity" isActive={activeTab === 'Activity'} onClick={() => setActiveTab('Activity')} />
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Word Count Stats */}
                        <div className="bg-light-surface-2 dark:bg-dark-surface-2 rounded-2xl p-5 border border-light-border dark:border-dark-border shadow-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-black text-light-text-secondary/60 dark:text-dark-text-secondary/60 tracking-tighter">Words</p>
                                    <p className="text-3xl font-black text-light-text-primary dark:text-dark-text-primary tabular-nums">
                                        {(editorRef.current?.textContent || '').split(/\s+/).filter(Boolean).length}
                                    </p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[10px] uppercase font-black text-light-text-secondary/60 dark:text-dark-text-secondary/60 tracking-tighter">Characters</p>
                                    <p className="text-3xl font-black text-light-text-primary dark:text-dark-text-primary tabular-nums">
                                        {(editorRef.current?.textContent || '').length}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-light-border dark:border-dark-border flex items-center justify-between text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                <span>Estimated Reading Time</span>
                                <span className="font-bold text-light-text-primary dark:text-dark-text-primary">
                                    {Math.max(1, Math.ceil((editorRef.current?.textContent || '').split(/\s+/).filter(Boolean).length / 200))} min
                                </span>
                            </div>
                        </div>

                        {/* Metadata Details */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] uppercase font-black text-light-text-secondary/60 dark:text-dark-text-secondary/60 tracking-widest px-1">Note Details</h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 transition-all group">
                                    <span className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary group-hover:text-ember transition-colors">Status</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${isNewNote ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                                        {isNewNote ? 'New' : 'Saved'}
                                    </span>
                                </div>
                                {!isNewNote && (
                                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 transition-all group">
                                        <span className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary group-hover:text-ember transition-colors">ID</span>
                                        <span className="text-xs font-mono text-light-text-secondary/50 dark:text-dark-text-secondary/50 truncate max-w-[140px]">{note.id}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 transition-all group">
                                    <span className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary group-hover:text-ember transition-colors">Type</span>
                                    <span className="px-2 py-0.5 rounded-full bg-light-surface-2 dark:bg-dark-surface-2 text-[10px] font-black uppercase text-light-text-secondary dark:text-dark-text-secondary tracking-tighter">
                                        {note.type}
                                    </span>
                                </div>
                                {note.updatedAt && (
                                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 transition-all group">
                                        <span className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary group-hover:text-ember transition-colors">Updated</span>
                                        <span className="text-xs text-light-text-primary dark:text-dark-text-primary font-bold">
                                            {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Keyboard Shortcuts */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] uppercase font-black text-light-text-secondary/60 dark:text-dark-text-secondary/60 tracking-widest px-1">Keyboard Shortcuts</h4>
                            <div className="space-y-2 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                <div className="flex justify-between">
                                    <span>Bold</span>
                                    <kbd className="px-2 py-0.5 bg-light-surface-2 dark:bg-dark-surface-2 rounded">Ctrl+B</kbd>
                                </div>
                                <div className="flex justify-between">
                                    <span>Italic</span>
                                    <kbd className="px-2 py-0.5 bg-light-surface-2 dark:bg-dark-surface-2 rounded">Ctrl+I</kbd>
                                </div>
                                <div className="flex justify-between">
                                    <span>Underline</span>
                                    <kbd className="px-2 py-0.5 bg-light-surface-2 dark:bg-dark-surface-2 rounded">Ctrl+U</kbd>
                                </div>
                                <div className="flex justify-between">
                                    <span>Save</span>
                                    <kbd className="px-2 py-0.5 bg-light-surface-2 dark:bg-dark-surface-2 rounded">Ctrl+S</kbd>
                                </div>
                            </div>
                        </div>

                        {/* Color Picker */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] uppercase font-black text-light-text-secondary/60 dark:text-dark-text-secondary/60 tracking-widest px-1">Themes</h4>
                            <div className="flex gap-3 px-1">
                                {['transparent', 'var(--color-global-red)', 'var(--color-global-yellow)', 'var(--color-global-green)', 'var(--color-global-blue)', 'var(--color-wine)'].map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setNote({ ...note, color: c })}
                                        className={`size-6 rounded-full border-2 transition-all hover:scale-110 active:scale-90 ${note.color === c ? 'border-ember scale-125' : 'border-light-border dark:border-dark-border'}`}
                                        style={{ backgroundColor: c === 'transparent' ? 'var(--color-light-bg)' : c }}
                                    ></button>
                                ))}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] uppercase font-black text-light-text-secondary/60 dark:text-dark-text-secondary/60 tracking-widest px-1">Quick Actions</h4>
                            <div className="space-y-2">
                                <button
                                    onClick={() => navigate('/note-editor')}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 transition-all text-left"
                                >
                                    <i className="ri-add-line text-ember"></i>
                                    <span className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Create New Note</span>
                                </button>
                                <button
                                    onClick={() => navigate('/note')}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 transition-all text-left"
                                >
                                    <i className="ri-gallery-view text-light-text-secondary dark:text-dark-text-secondary"></i>
                                    <span className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Back to Gallery</span>
                                </button>
                                {!isNewNote && (
                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-left"
                                    >
                                        <i className="ri-delete-bin-line text-red-500"></i>
                                        <span className="text-sm font-medium text-red-500">Delete Note</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Custom CSS for animations */}
            <style>{`
                @keyframes slide-up {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default NoteEditor;
