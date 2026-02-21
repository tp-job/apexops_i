import { useState, useEffect, useRef, type FC } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ShareNoteModal from './ShareNoteModal';
import { type Note, contentToBlocks, blocksToContent, fetchNoteById, createNote, updateNote, useNoteAutosave, fetchNotes as fetchAllNotes } from './utils';
import { isMockEnabled, isNetworkFailure } from '@/utils/offlineMock';
import { mockAiReply } from '@/utils/mockData';

// ── TipTap Editor ─────────────────────────────────────────────
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';

// ── Demo data ────────────────────────────────────────────────
const DEMO_ATTACHMENTS: Array<{ id: string; name: string; size: string; type: string }> = [
    { id: 'a1', name: 'Q3_Review.pdf', size: '2.4 MB', type: 'PDF' },
    { id: 'a2', name: 'Specs_v2.docx', size: '1.1 MB', type: 'DOCX' },
    { id: 'a3', name: 'Roadmap_Slides.pptx', size: '3.6 MB', type: 'PPTX' },
];

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface AiMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

interface NoteComment {
    id: string;
    author: string;
    text: string;
    message: string;
    line: number;
    selectedText: string;
    createdAt: string;
}

const generateAiReply = async (history: AiMessage[], prompt: string): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt,
                history: history.map((msg) => ({
                    role: msg.role,
                    text: msg.text,
                })),
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('AI API Error:', errorData);

            if (response.status === 429) {
                return '⚠️ Rate limit exceeded. Please wait a moment and try again.';
            }
            if (response.status === 403) {
                return '⚠️ AI service access denied. Please check your API key configuration.';
            }

            return errorData.error || 'Sorry, I encountered an error. Please try again.';
        }

        const data = await response.json();
        return data.text || "I couldn't generate a response.";
    } catch (error) {
        console.error('Generation failed', error);
        if (isMockEnabled() && isNetworkFailure(error)) {
            return mockAiReply(prompt);
        }
        return "Sorry, I couldn't connect to the AI service. Please check if the server is running.";
    }
};

const NoteEditor: FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const noteId = searchParams.get('id');
    const isNewNote = !noteId;

    const [note, setNote] = useState<Note | null>(null);
    const [loading, setLoading] = useState(!isNewNote);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<string | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [activeRightTab, setActiveRightTab] = useState<'Context' | 'Assistant' | 'Comments'>('Context');
    const [zoom, setZoom] = useState(1);
    const [wordCount, setWordCount] = useState(0);
    const [notesList, setNotesList] = useState<Note[]>([]);
    const [notesLoading, setNotesLoading] = useState(false);
    const [sidebarSearch, setSidebarSearch] = useState('');
    const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
    const [aiInput, setAiInput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [comments, setComments] = useState<NoteComment[]>([]);
    const [newCommentText, setNewCommentText] = useState('');
    const [showCommentDialog, setShowCommentDialog] = useState(false);
    const [commentButtonPosition, setCommentButtonPosition] = useState({ x: 0, y: 0, visible: false });
    const [selectedText, setSelectedText] = useState('');
    const [selectedLine, setSelectedLine] = useState(0);
    const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null);
    const commentDialogRef = useRef<HTMLDivElement>(null);
    const dialogDragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
    const [isDraggingDialog, setIsDraggingDialog] = useState(false);

    const titleRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4] },
            }),
            Underline,
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            Link.configure({
                openOnClick: true,
                linkOnPaste: true,
            }),
            Image.configure({
                inline: false,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Table.configure({
                resizable: true,
                lastColumnResizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content: '',
        autofocus: 'end',
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            const text = editor.getText();
            setNote(prev => prev ? { ...prev, content: html } : prev);
            const words = text
                .split(/\s+/)
                .map(w => w.trim())
                .filter(Boolean).length;
            setWordCount(words);
        },
        onSelectionUpdate: ({ editor }) => {
            const { from, to } = editor.state.selection;
            const selectedText = editor.state.doc.textBetween(from, to);
            
            if (selectedText.trim().length > 0) {
                // 计算行号：计算选中文本之前的换行符数量
                const textBeforeSelection = editor.state.doc.textBetween(0, from);
                const lineNumber = textBeforeSelection.split('\n').length;
                
                setSelectedText(selectedText);
                setSelectedLine(lineNumber);
                setSelectionRange({ from, to });
                
            } else {
                setSelectedText('');
                setSelectedLine(0);
                setSelectionRange(null);
            }
        },
    });

    // Initial load
    useEffect(() => {
        if (!editor) return;

        if (isNewNote) {
            const initialBlocks = contentToBlocks('');
            const initial: Note = {
                id: '',
                title: '',
                content: '',
                type: 'text',
                isPinned: false,
                tags: ['React', 'Docs'],
                checklistItems: [],
                quote: { text: '', author: '' },
                blocks: initialBlocks,
            };
            setNote(initial);
            editor.commands.setContent('', { emitUpdate: false });
            setWordCount(0);
            setLoading(false);
        } else {
            const fetchNote = async () => {
                try {
                    const result = await fetchNoteById(noteId!);
                    if (result.success && result.data) {
                        const data = result.data as Note;
                        const blocks = contentToBlocks(data.content || '');
                        setNote({ ...data, blocks });
                        if (data.updatedAt) setLastSaved(new Date(data.updatedAt).toLocaleTimeString());
                        editor.commands.setContent(data.content || '', { emitUpdate: false });
                        const text = editor.getText();
                        const words = text
                            .split(/\s+/)
                            .map(w => w.trim())
                            .filter(Boolean).length;
                        setWordCount(words);
                        if (titleRef.current) {
                            titleRef.current.textContent = data.title || '';
                        }
                    }
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };
            void fetchNote();
        }
    }, [noteId, isNewNote, editor]);

    const autosaveStatus = useNoteAutosave({
        noteId,
        enabled: !isNewNote && !!note,
        title: note?.title || '',
        content: note?.content || '',
    });

    // Load notes list for left sidebar
    useEffect(() => {
        const loadNotes = async () => {
            setNotesLoading(true);
            try {
                const res = await fetchAllNotes();
                if (res.success && res.data) {
                    setNotesList(res.data as Note[]);
                }
            } catch (err) {
                console.error('Error loading notes list:', err);
            } finally {
                setNotesLoading(false);
            }
        };
        void loadNotes();
    }, []);

    const handleSave = async () => {
        if (!note || !editor) return;
        setSaving(true);
        const rawContent = editor.getHTML();
        const blocks = contentToBlocks(rawContent);
        const content = blocksToContent(blocks);
        const title = titleRef.current?.textContent || note.title || '';
        try {
            if (isNewNote) {
                const result = await createNote({ title, content, type: 'text', isPinned: note.isPinned, tags: note.tags });
                if (result.success && result.data) {
                    const created = result.data as Note;
                    navigate(`/note-editor?id=${created.id}`, { replace: true });
                    setLastSaved(new Date().toLocaleTimeString());
                }
            } else {
                const result = await updateNote(noteId!, { title, content });
                if (result.success && result.data) {
                    setLastSaved(new Date().toLocaleTimeString());
                }
            }
        } catch (err) { console.error(err); } finally { setSaving(false); }
    };

    useEffect(() => {
        // Reset per-note ephemeral state when切换笔记
        setComments([]);
        setNewCommentText('');
        setAiMessages([]);
        setAiInput('');
        setShowCommentDialog(false);
        setSelectedText('');
        setSelectedLine(0);
        setSelectionRange(null);
        setCommentButtonPosition(prev => ({ ...prev, visible: false }));
    }, [noteId]);

    const handleSendAi = async () => {
        const text = aiInput.trim();
        if (!text) return;
        const baseHistory = aiMessages;
        const userMsg: AiMessage = {
            id: String(Date.now()),
            role: 'user',
            text,
            timestamp: Date.now(),
        };
        const historyWithUser = [...baseHistory, userMsg];
        setAiMessages(historyWithUser);
        setAiInput('');
        setAiLoading(true);
        const replyText = await generateAiReply(historyWithUser, text);
        const replyMsg: AiMessage = {
            id: String(Date.now() + 1),
            role: 'model',
            text: replyText,
            timestamp: Date.now(),
        };
        setAiMessages((prev) => [...prev, replyMsg]);
        setAiLoading(false);
    };

    const handleOpenCommentDialog = () => {
        if (!selectedText.trim() || !selectionRange) return;
        const dialogWidth = 400;
        const dialogHeight = 320;
        const padding = 24;
        const toolbarHeight = 80;
        const x = Math.max(padding, Math.min(window.innerWidth - dialogWidth - padding, (window.innerWidth - dialogWidth) / 2));
        const y = Math.max(padding, Math.min(window.innerHeight - dialogHeight - padding, toolbarHeight + 16));
        setCommentButtonPosition({ x, y, visible: false });
        setShowCommentDialog(true);
    };

    const handleAddComment = () => {
        const text = newCommentText.trim();
        if (!text || !selectedText) return;
        const comment: NoteComment = {
            id: String(Date.now()),
            author: 'Viewer',
            text: selectedText,
            message: text,
            line: selectedLine,
            selectedText: selectedText,
            createdAt: new Date().toISOString(),
        };
        setComments((prev) => [...prev, comment]);
        setNewCommentText('');
        setShowCommentDialog(false);
        setCommentButtonPosition(prev => ({ ...prev, visible: false }));
        dialogDragRef.current = null;
        setIsDraggingDialog(false);
        // 清除选中
        if (editor && selectionRange) {
            editor.commands.setTextSelection({ from: selectionRange.to, to: selectionRange.to });
            editor.commands.blur();
        }
        setSelectedText('');
        setSelectedLine(0);
        setSelectionRange(null);
    };

    const handleCancelComment = () => {
        setShowCommentDialog(false);
        setNewCommentText('');
        setCommentButtonPosition(prev => ({ ...prev, visible: false }));
        dialogDragRef.current = null;
        setIsDraggingDialog(false);
        // 清除选中
        if (editor && selectionRange) {
            editor.commands.setTextSelection({ from: selectionRange.to, to: selectionRange.to });
            editor.commands.blur();
        }
        setSelectedText('');
        setSelectedLine(0);
        setSelectionRange(null);
    };

    const handleAddCommentFromSidebar = () => {
        const text = newCommentText.trim();
        if (!text) return;
        const comment: NoteComment = {
            id: String(Date.now()),
            author: 'Viewer',
            text: '',
            message: text,
            line: 0,
            selectedText: '',
            createdAt: new Date().toISOString(),
        };
        setComments((prev) => [...prev, comment]);
        setNewCommentText('');
    };

    // ปิด Comment dialog เมื่อคลิกนอกหรือกด Escape
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (commentDialogRef.current && !commentDialogRef.current.contains(target) && showCommentDialog) {
                handleCancelComment();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && showCommentDialog) {
                handleCancelComment();
            }
        };

        if (showCommentDialog) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('keydown', handleEscape);
            };
        }
    }, [showCommentDialog, editor]);

    useEffect(() => {
        if (!showCommentDialog) return;

        const onMouseMove = (e: MouseEvent) => {
            const d = dialogDragRef.current;
            if (!d) return;
            setCommentButtonPosition({
                x: d.startLeft + (e.clientX - d.startX),
                y: d.startTop + (e.clientY - d.startY),
                visible: false,
            });
        };

        const onMouseUp = () => {
            dialogDragRef.current = null;
            setIsDraggingDialog(false);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [showCommentDialog]);

    if (loading) return (
        <div className="flex-1 h-screen flex items-center justify-center bg-dark-bg text-blue-primary">
            <span className="material-symbols-outlined text-5xl animate-spin">loader_2</span>
        </div>
    );

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-dark-bg transition-colors duration-300 font-sans antialiased text-light-text dark:text-dark-text">
            {/* Glass Header */}
            <header className="h-14 bg-white/60 dark:bg-dark-bg/60 backdrop-blur-md fixed top-0 w-full z-50 flex items-center justify-between px-6 border-b border-light-border dark:border-dark-border">
                        <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/note')}>
                        <div className="w-8 h-8 bg-linear-to-br from-blue-primary to-blue-secondary rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-primary/20">S</div>
                        <span className="font-bold text-lg text-light-text-primary dark:text-white tracking-tight">SmartNote</span>
                    </div>
                    <div className="hidden lg:flex items-center text-sm text-light-text-secondary dark:text-dark-text-secondary font-medium h-full">
                        <span className="mx-2 opacity-30">/</span>
                        <span className="hover:text-light-text-primary dark:hover:text-white cursor-pointer">Workspace</span>
                        <span className="mx-2 opacity-30">/</span>
                        <span className="text-light-text-primary dark:text-white font-bold">{note?.title || 'Untitled'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowShareModal(true)}
                        className="bg-blue-primary hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-primary/10"
                    >
                        <span className="material-symbols-outlined text-sm">share</span>
                        SHARE
                    </button>
                    <div className="h-6 w-px bg-light-border dark:bg-dark-border"></div>
                    <div className="flex -space-x-2">
                        <img className="w-8 h-8 rounded-full border-2 border-white dark:border-dark-bg ring-1 ring-light-border dark:ring-dark-border" src="https://i.pravatar.cc/100?u=1" alt="U1" />
                        <img className="w-8 h-8 rounded-full border-2 border-white dark:border-dark-bg ring-1 ring-light-border dark:ring-dark-border" src="https://i.pravatar.cc/100?u=2" alt="U2" />
                    </div>
                </div>
            </header>

            <div className="flex flex-1 pt-14 h-full">
                {/* Left Sidebar - All Notes */}
                <aside className="w-64 bg-light-bg/20 dark:bg-dark-bg/50 flex flex-col shrink-0 hidden md:flex border-r border-light-border dark:border-dark-border overflow-y-auto custom-scrollbar">
                    <div className="p-4 flex flex-col gap-4 h-full">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-[0.2em]">
                                    All Notes
                                </p>
                                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                    {notesLoading ? 'Loading…' : `${notesList.length} documents`}
                                </p>
                            </div>
                            <button
                                onClick={() => navigate('/note-editor')}
                                className="p-1.5 rounded-lg hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 text-light-text-secondary dark:text-dark-text-secondary"
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <span className="absolute inset-y-0 left-2 flex items-center text-light-text-secondary dark:text-dark-text-secondary">
                                <span className="material-symbols-outlined text-[18px]">search</span>
                            </span>
                            <input
                                value={sidebarSearch}
                                onChange={(e) => setSidebarSearch(e.target.value)}
                                placeholder="Filter notes…"
                                className="w-full pl-8 pr-3 py-2 rounded-lg bg-light-surface-2 dark:bg-dark-surface-2 border border-light-border dark:border-dark-border text-xs text-light-text-primary dark:text-dark-text-primary placeholder:text-light-text-secondary dark:placeholder:text-dark-text-secondary focus:outline-none focus:ring-1 focus:ring-blue-primary/40"
                            />
                        </div>

                        {/* Notes list */}
                        <div className="flex-1 min-h-0 space-y-3">
                            {(() => {
                                const query = sidebarSearch.trim().toLowerCase();
                                const filtered = notesList.filter((n) => {
                                    if (!query) return true;
                                    return (
                                        (n.title || '').toLowerCase().includes(query) ||
                                        (n.content || '').toLowerCase().includes(query)
                                    );
                                });
                                const pinned = filtered.filter((n) => n.isPinned);
                                const others = filtered.filter((n) => !n.isPinned);
                                const renderGroup = (label: string, items: Note[]) => (
                                    items.length > 0 && (
                                        <div key={label}>
                                            <p className="px-1 mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-light-text-secondary dark:text-dark-text-secondary">
                                                {label}
                                            </p>
                                            <div className="space-y-1">
                                                {items.map((n) => {
                                                    const active = String(n.id) === (noteId ?? '');
                                                    return (
                                                        <button
                                                            key={n.id}
                                                            type="button"
                                                            onClick={() => navigate(`/note-editor?id=${n.id}`)}
                                                            className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors ${
                                                                active
                                                                    ? 'bg-blue-primary/10 text-blue-primary'
                                                                    : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-surface-2 dark:hover:bg-dark-surface-2'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-[16px]">
                                                                    description
                                                                </span>
                                                                <span className="truncate text-[13px]">
                                                                    {n.title || 'Untitled'}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )
                                );

                                if (!notesLoading && filtered.length === 0) {
                                    return (
                                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary px-1">
                                            No notes found.
                                        </p>
                                    );
                                }

                                return (
                                    <>
                                        {renderGroup('Pinned', pinned)}
                                        {renderGroup(pinned.length ? 'Others' : 'Notes', others)}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </aside>

                {/* Main Hybrid Editor */}
                <main className="flex-1 flex flex-col bg-dark-bg relative shadow-2xl z-10 rounded-tl-3xl overflow-hidden border-l border-t border-dark-border/50 transition-all">
                    {/* Editor Toolbar (Word-like Ribbon - simplified) */}
                    <div className="sticky top-0 z-10 w-full bg-dark-bg/95 backdrop-blur-md px-6 lg:px-8 py-3 flex items-center justify-between border-b border-dark-border">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]">
                                <span className="px-2.5 py-1 rounded-md bg-blue-primary/15 text-blue-primary border border-blue-primary/30">Home</span>
                                <span className="px-2.5 py-1 rounded-md text-dark-text-secondary hover:bg-dark-surface/80 hover:text-white transition-colors cursor-pointer">Insert</span>
                                <span className="px-2.5 py-1 rounded-md text-dark-text-secondary hover:bg-dark-surface/80 hover:text-white transition-colors cursor-pointer">Layout</span>
                                <span className="px-2.5 py-1 rounded-md text-dark-text-secondary hover:bg-dark-surface/80 hover:text-white transition-colors cursor-pointer hidden md:inline-flex">View</span>
                                <div className="w-px h-4 bg-dark-border/60 mx-0.5" aria-hidden />
                                <button
                                    type="button"
                                    onClick={handleOpenCommentDialog}
                                    disabled={!selectedText.trim()}
                                    title={selectedText.trim() ? 'Add comment for selection' : 'Select text to add comment'}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                                        selectedText.trim()
                                            ? 'bg-blue-primary text-white hover:bg-blue-secondary cursor-pointer'
                                            : 'text-dark-text-secondary/60 cursor-not-allowed opacity-70'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">comment</span>
                                    <span>Comment</span>
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Undo / Redo */}
                                <div className="flex items-center gap-1 rounded-xl bg-dark-surface/60 px-1 py-0.5 border border-dark-border/70">
                                    <button
                                        disabled={!editor}
                                        onClick={() => editor?.chain().focus().undo().run()}
                                        className="p-1.5 rounded-lg hover:bg-dark-surface text-dark-text-secondary hover:text-blue-primary transition-colors disabled:opacity-40"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">undo</span>
                                    </button>
                                    <button
                                        disabled={!editor}
                                        onClick={() => editor?.chain().focus().redo().run()}
                                        className="p-1.5 rounded-lg hover:bg-dark-surface text-dark-text-secondary hover:text-blue-primary transition-colors disabled:opacity-40"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">redo</span>
                                    </button>
                                </div>

                                {/* Font & heading group */}
                                <div className="hidden md:flex items-center gap-1 rounded-xl bg-dark-surface/60 px-2 py-0.5 border border-dark-border/70">
                                    {/* Heading levels */}
                                    {( [1, 2, 3] as const ).map((lvl) => (
                                        <button
                                            key={lvl}
                                            disabled={!editor}
                                            onClick={() => editor?.chain().focus().setHeading({ level: lvl }).run()}
                                            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                                editor?.isActive('heading', { level: lvl })
                                                    ? 'bg-blue-primary text-white'
                                                    : 'text-dark-text-secondary hover:bg-dark-surface hover:text-blue-primary'
                                            }`}
                                        >
                                            H{lvl}
                                        </button>
                                    ))}
                                    <div className="h-4 w-px bg-dark-border mx-1" />
                                    {/* Inline styles */}
                                    <button
                                        disabled={!editor}
                                        onClick={() => editor?.chain().focus().toggleBold().run()}
                                        className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                            editor?.isActive('bold')
                                                ? 'bg-blue-primary text-white'
                                                : 'text-dark-text-secondary hover:bg-dark-surface hover:text-blue-primary'
                                        }`}
                                    >
                                        B
                                    </button>
                                    <button
                                        disabled={!editor}
                                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                                        className={`px-2 py-1 rounded-lg text-xs font-semibold italic transition-colors ${
                                            editor?.isActive('italic')
                                                ? 'bg-blue-primary text-white'
                                                : 'text-dark-text-secondary hover:bg-dark-surface hover:text-blue-primary'
                                        }`}
                                    >
                                        I
                                    </button>
                                    <button
                                        disabled={!editor}
                                        onClick={() => editor?.chain().focus().toggleUnderline().run()}
                                        className={`px-2 py-1 rounded-lg text-xs font-semibold underline transition-colors ${
                                            editor?.isActive('underline')
                                                ? 'bg-blue-primary text-white'
                                                : 'text-dark-text-secondary hover:bg-dark-surface hover:text-blue-primary'
                                        }`}
                                    >
                                        U
                                    </button>
                                    <div className="h-4 w-px bg-dark-border mx-1" />
                                    <button
                                        disabled={!editor}
                                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                                        className="p-1.5 rounded-lg hover:bg-dark-surface text-dark-text-secondary hover:text-blue-primary transition-colors disabled:opacity-40"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                                    </button>
                                    <button
                                        disabled={!editor}
                                        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                                        className="p-1.5 rounded-lg hover:bg-dark-surface text-dark-text-secondary hover:text-blue-primary transition-colors disabled:opacity-40"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">format_list_numbered</span>
                                    </button>
                                </div>

                                {/* Paragraph / alignment */}
                                <div className="hidden lg:flex items-center gap-1 rounded-xl bg-dark-surface/60 px-2 py-0.5 border border-dark-border/70">
                                    <button
                                        disabled={!editor}
                                        onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                                        className={`p-1.5 rounded-lg transition-colors ${
                                            editor?.isActive({ textAlign: 'left' })
                                                ? 'bg-blue-primary/10 text-blue-primary'
                                                : 'text-dark-text-secondary hover:bg-dark-surface hover:text-blue-primary'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">format_align_left</span>
                                    </button>
                                    <button
                                        disabled={!editor}
                                        onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                                        className={`p-1.5 rounded-lg transition-colors ${
                                            editor?.isActive({ textAlign: 'center' })
                                                ? 'bg-blue-primary/10 text-blue-primary'
                                                : 'text-dark-text-secondary hover:bg-dark-surface hover:text-blue-primary'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">format_align_center</span>
                                    </button>
                                    <button
                                        disabled={!editor}
                                        onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                                        className={`p-1.5 rounded-lg transition-colors ${
                                            editor?.isActive({ textAlign: 'right' })
                                                ? 'bg-blue-primary/10 text-blue-primary'
                                                : 'text-dark-text-secondary hover:bg-dark-surface hover:text-blue-primary'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">format_align_right</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-dark-text-secondary uppercase tracking-widest">
                                {saving || autosaveStatus === 'saving'
                                    ? 'Saving...'
                                    : autosaveStatus === 'error'
                                        ? 'Autosave failed'
                                        : lastSaved
                                            ? `Last saved: ${lastSaved}`
                                            : 'All changes saved'}
                            </span>
                            <button onClick={handleSave} className="p-2 rounded-lg bg-blue-primary/10 text-blue-primary hover:bg-blue-primary hover:text-white transition-all"><span className="material-symbols-outlined text-[20px]">save</span></button>
                        </div>
                    </div>

                    {/* Editor Canvas */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pt-8 pb-6 bg-dark-bg">
                        <div className="min-h-full flex flex-col items-center px-4">
                            {/* Title row */}
                            <div className="w-full max-w-[960px] flex items-start justify-center mb-6">
                                <div className="flex-1">
                                    <h1
                                        ref={titleRef}
                                        contentEditable
                                        suppressContentEditableWarning
                                        onInput={() => {
                                            const text = titleRef.current?.textContent || '';
                                            setNote(prev => prev ? { ...prev, title: text } : prev);
                                        }}
                                        className="text-3xl md:text-4xl font-extrabold text-white outline-none tracking-tight leading-tight empty:before:content-[attr(data-placeholder)] empty:before:text-dark-text-secondary"
                                        data-placeholder="Document title"
                                    ></h1>
                                </div>
                            </div>

                            {/* Word-like page */}
                            <div className="relative w-full flex justify-center">
                                <div className="pointer-events-none absolute inset-x-0 top-4 mx-auto max-w-[860px] h-6 rounded-full bg-white/5 blur-xl" />
                                <div
                                    className="relative bg-dark-bg rounded-[2px] shadow-2xl border border-dark-border/50 overflow-hidden"
                                    style={{
                                        width: 816,
                                        minHeight: 1056,
                                        transform: `scale(${zoom})`,
                                        transformOrigin: 'top center',
                                        transition: 'transform 150ms ease-out',
                                    }}
                                >
                                    <div className="h-10 border-b border-dark-border/50 bg-dark-surface/60 flex items-center px-8 text-[10px] text-dark-text-secondary font-mono uppercase tracking-[0.18em]">
                                        <span>Document</span>
                                        <span className="mx-3 h-px w-6 bg-dark-border/50" />
                                        <span>Note content</span>
                                    </div>
                                    <div className="px-16 py-10 space-y-10 relative bg-dark-bg">
                                        <EditorContent
                                            editor={editor as Editor | null}
                                            className="prose prose-invert max-w-none prose-lg outline-none font-medium text-white min-h-[400px] prose-headings:text-white prose-p:text-white prose-strong:text-white prose-em:text-white prose-code:text-white prose-pre:bg-dark-surface-2 prose-pre:text-white prose-blockquote:text-dark-text-secondary prose-blockquote:border-dark-border"
                                        />

                                        {/* Comment Dialog */}
                                        {showCommentDialog && selectedText.trim() && (
                                            <div
                                                ref={commentDialogRef}
                                                className="fixed z-[100] bg-dark-bg rounded-xl shadow-2xl border border-dark-border/50 p-5 min-w-[320px] max-w-[400px] backdrop-blur-sm"
                                                style={{
                                                    left: `${commentButtonPosition.x}px`,
                                                    top: `${commentButtonPosition.y}px`,
                                                    animation: 'fadeInScale 0.2s ease-out',
                                                }}
                                            >
                                                <div
                                                    className={`mb-4 select-none ${isDraggingDialog ? 'cursor-grabbing' : 'cursor-grab'}`}
                                                    onMouseDown={(e) => {
                                                        if ((e.target as HTMLElement).closest('button')) return;
                                                        e.preventDefault();
                                                        dialogDragRef.current = {
                                                            startX: e.clientX,
                                                            startY: e.clientY,
                                                            startLeft: commentButtonPosition.x,
                                                            startTop: commentButtonPosition.y,
                                                        };
                                                        setIsDraggingDialog(true);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-primary/20 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-blue-primary text-lg">comment</span>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-semibold text-white">Comment</h3>
                                                            <p className="text-[10px] text-dark-text-secondary">Add a comment for this selection</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="mb-4 p-3 bg-dark-surface-2/50 rounded-lg border border-dark-border/30 text-xs">
                                                    <div className="flex items-start gap-2 mb-2">
                                                        <span className="text-dark-text-secondary font-medium min-w-[40px]">Line:</span>
                                                        <span className="text-white font-mono">{selectedLine}</span>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-dark-text-secondary font-medium min-w-[40px]">Text:</span>
                                                        <span className="text-white italic break-words">
                                                            "{selectedText.length > 60 ? selectedText.substring(0, 60) + '...' : selectedText}"
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="mb-4">
                                                    <label className="block text-xs font-semibold text-dark-text-secondary mb-2 uppercase tracking-wider">
                                                        Message
                                                    </label>
                                                    <textarea
                                                        value={newCommentText}
                                                        onChange={(e) => setNewCommentText(e.target.value)}
                                                        placeholder="Enter your comment message..."
                                                        rows={4}
                                                        className="w-full resize-none rounded-lg border border-dark-border bg-dark-surface-2 px-3 py-2.5 text-sm text-white placeholder:text-dark-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-blue-primary/50 focus:border-blue-primary/50 transition-all"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                                e.preventDefault();
                                                                handleAddComment();
                                                            }
                                                            if (e.key === 'Escape') {
                                                                e.preventDefault();
                                                                handleCancelComment();
                                                            }
                                                        }}
                                                    />
                                                    <p className="mt-1.5 text-[10px] text-dark-text-secondary/70">
                                                        Press <kbd className="px-1.5 py-0.5 bg-dark-surface rounded text-[10px] font-mono">⌘/Ctrl + Enter</kbd> to submit
                                                    </p>
                                                </div>
                                                
                                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-border/30">
                                                    <button
                                                        type="button"
                                                        onClick={handleCancelComment}
                                                        className="px-4 py-2 rounded-lg text-xs font-medium bg-dark-surface-2 text-dark-text-secondary hover:text-white hover:bg-dark-surface transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleAddComment}
                                                        disabled={!newCommentText.trim()}
                                                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-primary text-white hover:bg-blue-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-lg shadow-blue-primary/20 hover:shadow-xl hover:shadow-blue-primary/30"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">add_comment</span>
                                                        Add Comment
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status bar */}
                    <div className="h-10 px-4 md:px-6 flex items-center justify-between border-t border-dark-border bg-dark-bg/95 text-[11px] font-mono text-dark-text-secondary">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px]">description</span>
                                {wordCount} words
                            </span>
                            <span className="hidden sm:flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-primary"></span>
                                {saving || autosaveStatus === 'saving'
                                    ? 'Saving...'
                                    : autosaveStatus === 'error'
                                        ? 'Autosave failed'
                                        : lastSaved
                                            ? `Saved at ${lastSaved}`
                                            : 'All changes saved'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="hidden sm:inline-flex">Zoom</span>
                            <input
                                type="range"
                                min={0.7}
                                max={1.4}
                                step={0.05}
                                value={zoom}
                                onChange={(e) => setZoom(parseFloat(e.target.value))}
                                className="w-24 accent-blue-primary"
                            />
                            <span className="w-10 text-right">{Math.round(zoom * 100)}%</span>
                        </div>
                    </div>
                </main>

                {/* Right Sidebar (Context & AI) */}
                <aside className="w-80 bg-light-bg/20 dark:bg-dark-bg/50 flex flex-col shrink-0 hidden xl:flex border-l border-light-border dark:border-dark-border">
                    <div className="flex items-center px-6 pt-6 pb-2 gap-4">
                        {(['Context', 'Assistant', 'Comments'] as const).map(tab => {
                            const label = tab === 'Assistant' ? 'AI Assistant' : tab;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveRightTab(tab)}
                                    className={`text-[10px] font-bold uppercase tracking-widest pb-2 transition-all ${activeRightTab === tab ? 'text-light-text-primary dark:text-white border-b-2 border-blue-primary' : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-white'}`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {activeRightTab === 'Context' && (
                            <div className="space-y-6">
                                {/* Attachments & References */}
                                <section>
                                    <div className="flex items-center justify-between gap-4 mb-4">
                                        <div>
                                            <h2 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
                                                Attachments &amp; References
                                            </h2>
                                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                                Linked files that provide context for this note.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-light-surface-2 dark:bg-dark-surface-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary hover:bg-light-surface dark:hover:bg-dark-surface transition-colors"
                                        >
                                            + Add file
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {DEMO_ATTACHMENTS.map((att) => (
                                            <div
                                                key={att.id}
                                                className="flex items-center gap-3 rounded-xl border border-light-border dark:border-dark-border bg-light-surface-2/60 dark:bg-dark-surface-2/60 px-4 py-3"
                                            >
                                                <div className="w-9 h-9 rounded-lg bg-orange-primary/10 text-orange-primary flex items-center justify-center text-xs font-bold">
                                                    {att.type}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate text-light-text-primary dark:text-dark-text-primary">
                                                        {att.name}
                                                    </p>
                                                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                                        {att.size}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <div className="pt-6 border-t border-light-border dark:border-dark-border">
                                    <label className="text-[10px] font-black text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-[0.2em] mb-4 block">File Meta</label>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-orange-primary/10 dark:bg-orange-primary/30 flex items-center justify-center text-orange-primary"><span className="material-symbols-outlined text-sm">folder</span></div>
                                            <div><div className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary font-bold">FOLDER</div><div className="text-sm font-medium">Product / 2026</div></div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-primary/10 dark:bg-blue-primary/30 flex items-center justify-center text-blue-primary"><span className="material-symbols-outlined text-sm">schedule</span></div>
                                            <div><div className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary font-bold">STATUS</div><div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-primary"></div><span className="text-sm font-medium">In Progress</span></div></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-light-border dark:border-dark-border">
                                    <label className="text-[10px] font-black text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-[0.2em] mb-4 block">Deployment Info</label>
                                    <div className="bg-black/20 dark:bg-white/2 p-4 rounded-xl border border-light-border dark:border-dark-border font-mono text-[11px] space-y-2">
                                        <div className="flex justify-between"><span>CREATED</span><span className="text-light-text-secondary dark:text-dark-text-secondary">FEB 15, 2026</span></div>
                                        <div className="flex justify-between"><span>TAGS</span><span className="text-blue-primary">#REACT #DOCS</span></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeRightTab === 'Assistant' && (
                            <div className="flex flex-col h-full text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                <div className="flex-1 space-y-3 overflow-y-auto pb-4">
                                    {aiMessages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex mb-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs whitespace-pre-wrap ${
                                                    msg.role === 'user'
                                                        ? 'bg-blue-primary text-white rounded-br-sm'
                                                        : 'bg-light-surface-2 dark:bg-dark-surface-2 text-light-text-primary dark:text-dark-text-primary rounded-bl-sm'
                                                }`}
                                            >
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))}
                                    {aiMessages.length === 0 && !aiLoading && (
                                        <div className="mt-8 text-xs text-center text-light-text-secondary dark:text-dark-text-secondary">
                                            <span className="material-symbols-outlined text-3xl mb-2 block opacity-30">smart_toy</span>
                                            Ask the assistant to summarize or refactor this note.
                                        </div>
                                    )}
                                    {aiLoading && (
                                        <div className="flex items-center gap-2 text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-primary animate-bounce" />
                                            <span className="w-2 h-2 rounded-full bg-orange-primary animate-bounce delay-150" />
                                            <span className="w-2 h-2 rounded-full bg-blue-secondary animate-bounce delay-300" />
                                            <span>Thinking…</span>
                                        </div>
                                    )}
                                </div>
                                <div className="border-t border-light-border dark:border-dark-border pt-3 mt-2">
                                    <div className="flex items-end gap-2">
                                        <textarea
                                            value={aiInput}
                                            onChange={(e) => setAiInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    void handleSendAi();
                                                }
                                            }}
                                            rows={2}
                                            placeholder="Ask AI about this note…"
                                            className="flex-1 resize-none rounded-lg border border-light-border dark:border-dark-border bg-light-surface-2 dark:bg-dark-surface-2 px-3 py-2 text-xs text-light-text-primary dark:text-dark-text-primary placeholder:text-light-text-secondary dark:placeholder:text-dark-text-secondary focus:outline-none focus:ring-1 focus:ring-blue-primary/40"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => void handleSendAi()}
                                            disabled={!aiInput.trim() || aiLoading}
                                            className="shrink-0 px-3 py-2 rounded-lg bg-blue-primary text-white text-xs font-semibold hover:bg-blue-secondary disabled:opacity-60"
                                        >
                                            Send
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeRightTab === 'Comments' && (
                            <div className="flex flex-col h-full text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                <div className="flex-1 space-y-3 overflow-y-auto pb-4">
                                    {comments.length > 0 ? (
                                        comments.map((c) => (
                                            <div
                                                key={c.id}
                                                className="flex items-start gap-2 rounded-xl bg-light-surface-2 dark:bg-dark-surface-2 px-3 py-2"
                                            >
                                                <div className="w-7 h-7 rounded-full bg-blue-primary/10 text-blue-primary flex items-center justify-center text-[11px] font-bold shrink-0">
                                                    V
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <span className="text-xs font-semibold text-light-text-primary dark:text-dark-text-primary">
                                                            Viewer
                                                        </span>
                                                        <span className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary">
                                                            {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    {c.line > 0 && (
                                                        <div className="mb-1.5 text-[10px] font-semibold text-blue-primary">
                                                            Line {c.line}
                                                        </div>
                                                    )}
                                                    {c.selectedText && (
                                                        <div className="mb-1.5 px-2 py-1 bg-light-bg dark:bg-dark-bg rounded border border-light-border dark:border-dark-border">
                                                            <p className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary font-mono italic">
                                                                "{c.selectedText.length > 60 ? c.selectedText.substring(0, 60) + '...' : c.selectedText}"
                                                            </p>
                                                        </div>
                                                    )}
                                                    <p className="mt-1 text-xs text-light-text-primary dark:text-dark-text-primary whitespace-pre-wrap">
                                                        {c.message || c.text}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="mt-8 text-xs text-center text-light-text-secondary dark:text-dark-text-secondary">
                                            <p className="mb-2">No comments yet.</p>
                                            <p className="text-[10px]">Select text in the editor to add a comment, or use the form below.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="border-t border-light-border dark:border-dark-border pt-3 mt-2">
                                    <div className="flex flex-col gap-2">
                                        <textarea
                                            value={newCommentText}
                                            onChange={(e) => setNewCommentText(e.target.value)}
                                            rows={2}
                                            placeholder="Add a general comment…"
                                            className="w-full resize-none rounded-lg border border-light-border dark:border-dark-border bg-light-surface-2 dark:bg-dark-surface-2 px-3 py-2 text-xs text-light-text-primary dark:text-dark-text-primary placeholder:text-light-text-secondary dark:placeholder:text-dark-text-secondary focus:outline-none focus:ring-1 focus:ring-blue-primary/40"
                                        />
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={handleAddCommentFromSidebar}
                                                disabled={!newCommentText.trim()}
                                                className="px-3 py-1.5 rounded-lg bg-orange-primary text-white text-xs font-semibold hover:bg-wine disabled:opacity-60"
                                            >
                                                Add comment
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* Modals */}
            <ShareNoteModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                noteTitle={note?.title || 'Untitled'}
            />
        </div>
    );
};

export default NoteEditor;
