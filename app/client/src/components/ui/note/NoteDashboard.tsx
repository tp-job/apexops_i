import { useState, useEffect, useMemo, memo, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIcon } from '@/utils/iconMapping';

import {
    type Note,
    fetchNotes as apiFetchNotes,
    createNote as apiCreateNote,
    toggleNotePin as apiToggleNotePin,
    deleteNote as apiDeleteNote,
    type NormalizedNotes,
    emptyNotesState,
    normalizeNotes,
    upsertNote,
    removeNote,
    getFilteredNotes,
    splitPinnedNotes,
} from './utils';

// Import reusable components
import Toast from '@/components/common/alert/Toast';
import ConfirmationModal from '@/components/common/alert/ConfirmationModal';
import SidebarLink, { type SidebarItem } from '@/components/layouts/SidebarLink';

// Sample data (kept for sidebar structure)
const sidebarItems: SidebarItem[] = [
    { icon: 'ri-lightbulb-fill', label: 'Notes', isActive: true },
    { icon: 'ri-notification-3-fill', label: 'Reminders' },
];

const labelItems: SidebarItem[] = [
    { icon: 'ri-price-tag-3-fill', label: 'Personal', isLabel: true },
    { icon: 'ri-price-tag-3-fill', label: 'Work', isLabel: true },
    { icon: 'ri-price-tag-3-fill', label: 'Ideas', isLabel: true },
    { icon: 'ri-edit-fill', label: 'Edit labels' },
];

const bottomItems: SidebarItem[] = [
    { icon: 'ri-archive-stack-fill', label: 'Archive' },
    { icon: 'ri-delete-bin-5-fill', label: 'Trash' },
];

// Components
const IconButton: FC<{ icon: string; size?: number; className?: string; title?: string; onClick?: () => void }> = ({
    icon,
    size = 20,
    className = '',
    title,
    onClick,
}) => {
    const IconComponent = getIcon(icon);
    return (
        <button
            className={`p-2.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-brand-dark transition-all duration-200 border border-transparent hover:border-white/10 ${className}`}
            title={title}
            onClick={onClick}
        >
            {IconComponent ? (
                <IconComponent className="transition-colors duration-200" style={{ fontSize: size }} />
            ) : (
                <i className={`${icon} transition-colors duration-200`} style={{ fontSize: size }}></i>
            )}
        </button>
    );
};

const NoteActionButtons: FC<{ hoverBgClass?: string; onDelete?: () => void }> = ({ onDelete }) => (
    <div className="flex items-center justify-between px-3 py-3 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
        <div className="flex gap-1">
            {['ri-file-add-fill', 'ri-user-add-fill', 'ri-palette-fill', 'ri-image-add-line', 'ri-inbox-archive-fill', 'ri-delete-bin-fill'].map((iconClass) => {
                const IconComponent = getIcon(iconClass);
                return (
                    <button
                        key={iconClass}
                        onClick={iconClass === 'ri-delete-bin-fill' ? onDelete : (e) => { e.stopPropagation(); }}
                        className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-brand-dark transition-all border border-transparent hover:border-white/10"
                    >
                        {IconComponent ? (
                            <IconComponent className="transition-colors duration-200" style={{ fontSize: 16 }} />
                        ) : (
                            <i className={`${iconClass} transition-colors duration-200`} style={{ fontSize: 16 }}></i>
                        )}
                    </button>
                );
            })}
        </div>
    </div>
);

NoteActionButtons.displayName = 'NoteActionButtons';

const NoteCardComponent: FC<{ note: Note; onTogglePin: (id: string) => void; onDelete: (id: string) => void; onClick: () => void }> = ({ note, onTogglePin, onDelete, onClick }) => {
    const isSpecial = note.color === 'red';

    return (
        <div
            onClick={onClick}
            className={`break-inside-avoid relative group flex flex-col rounded-3xl border border-white/10 transition-all duration-300 cursor-pointer overflow-hidden ${
                isSpecial ? 'bg-brand-accent/10 border-brand-accent/20' : 'glass-panel hover:bg-white/5'
            } hover:shadow-xl hover:-translate-y-1 hover:border-white/20`}
        >
            {/* Image Header */}
            {note.type === 'image' && note.imageUrl && (
                <div
                    className="h-40 w-full rounded-t-xl bg-cover bg-center"
                    style={{ backgroundImage: `url('${note.imageUrl}')` }}
                />
            )}

            {/* Link Preview */}
            {note.type === 'link' && (
                <a className="block bg-light-surface-2 dark:bg-dark-surface-2 h-32 rounded-t-xl relative overflow-hidden" href={note.linkUrl}>
                    <div className="absolute inset-0 flex items-center justify-center">
                        {(() => {
                            const LinkIcon = getIcon('ri-link-line');
                            return LinkIcon ? (
                                <LinkIcon className="text-light-text-secondary dark:text-dark-text-secondary transition-colors duration-200" style={{ fontSize: 48 }} />
                            ) : (
                                <span className="material-symbols-outlined text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 48 }}>
                                    link
                                </span>
                            );
                        })()}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2 text-white text-xs truncate">
                        {note.linkUrl}
                    </div>
                </a>
            )}

            {/* Content */}
            <div className="p-5 flex flex-col gap-3">
                <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-brand-dark text-sm uppercase tracking-wide line-clamp-2 leading-snug">
                        {note.title}
                    </h3>
                    <button
                        onClick={(e) => { e.stopPropagation(); onTogglePin(note.id); }}
                        className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all p-2 bg-white/5 hover:bg-white/10 rounded-xl -mt-1 -mr-1 border border-transparent hover:border-white/10"
                    >
                        {(() => {
                            const PinIcon = getIcon(note.isPinned ? 'ri-pushpin-2-fill' : 'ri-pushpin-2-line');
                            return PinIcon ? (
                                <PinIcon className={`transition-colors duration-200 ${note.isPinned ? 'text-brand-accent' : 'text-gray-400'}`} style={{ fontSize: 18 }} />
                            ) : (
                                <i className={note.isPinned ?"ri-pushpin-2-fill" :"ri-pushpin-2-line"} style={{ fontSize: 18 }}></i>
                            );
                        })()}
                    </button>
                </div>

                {/* Regular text content */}
                {note.content && !note.quote && (
                    <p className="text-xs font-medium text-gray-400 leading-relaxed whitespace-pre-line line-clamp-[10]">
                        {note.content}
                    </p>
                )}

                {/* Quote */}
                {note.quote && (
                    <div className="border-l-2 border-brand-accent pl-3 my-1">
                        <p className="text-xs text-brand-dark leading-relaxed italic font-heading">"{note.quote.text}"
                        </p>
                        <p className="text-[10px] font-bold text-gray-500 mt-2 uppercase tracking-widest">- {note.quote.author}</p>
                    </div>
                )}

                {/* Checklist */}
                {note.type === 'list' && note.checklistItems && (
                    <ul className="space-y-2 mt-1">
                        {note.checklistItems.slice(0, 5).map((item, idx) => {
                            const CheckboxIcon = getIcon(item.checked ? 'ri-checkbox-fill' : 'ri-checkbox-line');
                            return (
                                <li key={idx} className="flex items-center gap-2">
                                    {CheckboxIcon ? (
                                        <CheckboxIcon className={`transition-colors duration-200 ${item.checked ? 'text-brand-accent' : 'text-gray-400/50'}`} style={{ fontSize: 16 }} />
                                    ) : (
                                        <span className="material-symbols-outlined text-gray-400/50" style={{ fontSize: 16 }}>
                                            {item.checked ? 'check_box' : 'check_box_outline_blank'}
                                        </span>
                                    )}
                                    <span className={`text-xs font-medium ${item.checked ? 'text-gray-500 line-through' : 'text-gray-400'}`}>
                                        {item.text}
                                    </span>
                                </li>
                            );
                        })}
                        {note.checklistItems.length > 5 && (
                            <li className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-6">
                                + {note.checklistItems.length - 5} more items
                            </li>
                        )}
                    </ul>
                )}

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                        {note.tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center rounded-xl bg-white/5 px-2 py-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest border border-white/5"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <NoteActionButtons onDelete={() => onDelete(note.id)} />
        </div>
    );
};

const NoteCard = memo(NoteCardComponent);
NoteCard.displayName = 'NoteCard';

const NoteDashboard: FC = () => {
    const navigate = useNavigate();
    const [searchValue, setSearchValue] = useState('');
    const [notesState, setNotesState] = useState<NormalizedNotes>(emptyNotesState);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [filter, setFilter] = useState('All');
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; noteId: string; noteTitle: string }>({ isOpen: false, noteId: '', noteTitle: '' });
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type });
    };

    const fetchNotes = async () => {
        setLoading(true);
        const result = await apiFetchNotes();
        if (result.success && result.data) {
            setNotesState(normalizeNotes(result.data as Note[]));
        } else if (result.error) {
            showToast(result.error, 'error');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    const handleAddNote = async () => {
        if (!title && !content) {
            showToast('Please add a title or content', 'error');
            return;
        }
        setIsAdding(true);
        try {
            const result = await apiCreateNote({ title, content, type: 'text' });
            if (result.success && result.data) {
                const newNote = result.data as Note;
                setNotesState(prev => upsertNote(prev, newNote));
                setTitle('');
                setContent('');
                showToast('Note created successfully!', 'success');
            } else {
                showToast(result.error || 'Failed to create note', 'error');
            }
        } catch (err) {
            console.error('Error adding note:', err);
            showToast('Failed to create note', 'error');
        } finally {
            setIsAdding(false);
        }
    };

    const handleTogglePin = async (id: string) => {
        const note = notesState.byId[id];
        if (!note) return;
        try {
            const result = await apiToggleNotePin(id, note.isPinned);
            if (result.success) {
                const updated: Note = { ...note, isPinned: !note.isPinned };
                setNotesState(prev => upsertNote(prev, updated));
            } else if (result.error) {
                showToast(result.error, 'error');
            }
        } catch (err) {
            console.error('Error toggling pin:', err);
        }
    };

    const openDeleteModal = (id: string, noteTitle: string) => {
        setDeleteModal({ isOpen: true, noteId: id, noteTitle });
    };

    const handleDeleteNote = async () => {
        const { noteId } = deleteModal;
        if (!noteId) return;

        setIsDeleting(true);
        try {
            const result = await apiDeleteNote(noteId);
            if (result.success) {
                setNotesState(prev => removeNote(prev, noteId));
                showToast('Note deleted successfully!', 'success');
                setDeleteModal({ isOpen: false, noteId: '', noteTitle: '' });
            } else {
                showToast(result.error || 'Failed to delete note', 'error');
            }
        } catch (err) {
            console.error('Error deleting note:', err);
            showToast('Failed to delete note', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredNotes = useMemo(
        () => getFilteredNotes(notesState, searchValue, filter),
        [notesState, searchValue, filter],
    );

    const { pinned: pinnedNotes, others: otherNotes } = useMemo(
        () => splitPinnedNotes(filteredNotes),
        [filteredNotes],
    );

    // Simple windowed rendering for large collections
    const MAX_RENDERED_NOTES = 200;
    const visiblePinnedNotes = pinnedNotes.slice(0, MAX_RENDERED_NOTES);
    const visibleOtherNotes = otherNotes.slice(0, MAX_RENDERED_NOTES);

    return (
        <div className="font-sans text-brand-dark min-h-screen flex flex-col">
            {/* Toast */}
            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, noteId: '', noteTitle: '' })}
                onConfirm={handleDeleteNote}
                isConfirming={isDeleting}
                title="Delete Note"
                message={
                    <>
                        Are you sure you want to delete {deleteModal.noteTitle ? `"${deleteModal.noteTitle}"` : 'this note'}? All content will be permanently removed.
                    </>
                }
                confirmText="Delete"
                confirmBtnColor="bg-brand-accent text-brand-dark hover:-accent/40"
                icon="ri-delete-bin-line"
                iconBgColor="bg-brand-accent/10"
                iconColor="text-brand-dark"
            />


            {/* Header */}
            <header className="glass-panel flex items-center justify-between whitespace-nowrap rounded-3xl px-6 py-4 shrink-0 z-20 mb-5">
                <div className="flex items-center gap-4">
                    <IconButton icon="ri-menu-line" />
                    <div className="flex items-center gap-3">
                        <div className="size-10 flex items-center justify-center bg-brand-accent rounded-xl text-brand-dark shadow-lg -accent/20">
                            {(() => {
                                const ListCheckIcon = getIcon('ri-list-check');
                                return ListCheckIcon ? (
                                    <ListCheckIcon className="transition-colors duration-200" style={{ fontSize: 20 }} />
                                ) : (
                                    <i className="ri-list-check"></i>
                                );
                            })()}
                        </div>
                        <h2 className="text-3xl font-bold font-heading text-brand-dark hidden sm:block tracking-tight">Notes</h2>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="flex flex-1 max-w-[720px] px-6">
                    <label className="flex flex-col w-full h-12 relative group">
                        <div className="flex w-full flex-1 items-stretch rounded-2xl h-full shadow-sm bg-white/5 border border-white/10 focus-within:border-brand-accent/30 focus-within:bg-white/10 transition-all duration-300">
                            <div className="text-gray-400 flex items-center justify-center pl-4">
                                {(() => {
                                    const SearchIcon = getIcon('ri-search-line');
                                    return SearchIcon ? (
                                        <SearchIcon className="transition-colors duration-200" style={{ fontSize: 18 }} />
                                    ) : (
                                        <i className="ri-search-line"></i>
                                    );
                                })()}
                            </div>
                            <input
                                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-2xl text-brand-dark focus:outline-none focus:ring-0 border-none bg-transparent h-full placeholder:text-gray-500 px-4 text-sm font-bold uppercase tracking-widest"
                                placeholder="Search your notes..."
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                            {searchValue && (
                                <button
                                    className="text-gray-400 flex items-center justify-center pr-4 hover:text-brand-dark transition-colors"
                                    onClick={() => setSearchValue('')}
                                >
                                    {(() => {
                                        const CloseIcon = getIcon('ri-close-line');
                                        return CloseIcon ? (
                                            <CloseIcon className="transition-colors duration-200" style={{ fontSize: 18 }} />
                                        ) : (
                                            <i className="ri-close-line"></i>
                                        );
                                    })()}
                                </button>
                            )}
                        </div>
                    </label>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/note-editor')}
                        className="hidden md:flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-accent text-brand-dark text-[10px] font-bold uppercase tracking-widest shadow-lg -accent/20 hover:-accent/40 hover:-translate-y-0.5 transition-all active:scale-95"
                    >
                        {(() => {
                            const AddIcon = getIcon('ri-add-line');
                            return AddIcon ? (
                                <AddIcon className="transition-colors duration-200" style={{ fontSize: 16 }} />
                            ) : (
                                <i className="ri-add-line"></i>
                            );
                        })()}
                        New Note
                    </button>
                    <div className="hidden lg:flex gap-1">
                        <IconButton icon="ri-loop-left-line" title="Refresh" onClick={fetchNotes} />
                        <IconButton icon="ri-grid-fill" title="Grid View" />
                        <IconButton icon="ri-settings-4-fill" title="Settings" />
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="hidden md:flex flex-col w-[260px] shrink-0 h-full overflow-y-auto py-6 bg-transparent border-r border-white/5">
                    <div className="flex flex-col">
                        <nav className="flex flex-col gap-1.5 px-4">
                            {sidebarItems.map((item) => (
                                <SidebarLink key={item.label} item={item} />
                            ))}

                            {/* Labels Section */}
                            <div className="mt-8 mb-3 px-4 flex justify-between items-center group cursor-pointer">
                                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                                    Labels
                                </h3>
                                <button className="text-gray-500 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-xl p-1 transition-all border border-transparent hover:border-white/10">
                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                        add
                                    </span>
                                </button>
                            </div>

                            {labelItems.map((item) => (
                                <SidebarLink key={item.label} item={item} />
                            ))}

                            <div className="my-6 border-t border-white/5 mx-2" />

                            {bottomItems.map((item) => (
                                <SidebarLink key={item.label} item={item} />
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 h-full overflow-y-auto relative">
                    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-8 py-8 flex flex-col gap-8 pb-32">
                        {/* Composer */}
                        <div className="flex justify-center w-full mb-10">
                            <div className="w-full max-w-[640px] glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative hover:border-white/20 transition-all duration-300">
                                <div className="flex flex-col">
                                    <input
                                        className="w-full px-6 pt-6 pb-2 text-lg font-bold text-brand-dark uppercase tracking-wide placeholder:text-gray-500 bg-transparent border-none focus:ring-0 outline-none font-heading"
                                        placeholder="Note Title"
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                    <textarea
                                        className="w-full px-6 py-2 min-h-[50px] text-sm font-medium text-gray-400 placeholder:text-gray-500 bg-transparent border-none focus:ring-0 outline-none resize-none transition-all duration-300"
                                        placeholder="What's on your mind?..."
                                        rows={content ? 4 : 1}
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        onFocus={(e) => {
                                            if (!content) e.target.rows = 4;
                                        }}
                                    />
                                    <div className="flex items-center justify-between px-4 py-4 border-t border-white/5 bg-white/5">
                                        <div className="flex items-center gap-1">
                                            {[
                                                { icon: 'ri-file-add-line', title: 'Checklist' },
                                                { icon: 'ri-palette-line', title: 'Color' },
                                                { icon: 'ri-image-add-line', title: 'Add image' },
                                                { icon: 'ri-archive-line', title: 'Archive' },
                                                { icon: 'ri-more-2-line', title: 'More' }
                                            ].map((item) => {
                                                const IconComponent = getIcon(item.icon);
                                                return (
                                                    <button
                                                        key={item.icon}
                                                        className="p-2.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-brand-dark transition-all border border-transparent hover:border-white/10"
                                                        title={item.title}
                                                    >
                                                        {IconComponent ? (
                                                            <IconComponent className="transition-colors duration-200" style={{ fontSize: 18 }} />
                                                        ) : (
                                                            <i className={`${item.icon} text-lg`}></i>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => { setTitle(''); setContent(''); }}
                                                className="px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-brand-dark hover:bg-white/10 transition-all"
                                            >
                                                Discard
                                            </button>
                                            <button
                                                onClick={handleAddNote}
                                                disabled={isAdding}
                                                className="px-8 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-brand-accent text-brand-dark shadow-lg -accent/20 hover:-accent/40 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {isAdding ? (
                                                    <>
                                                        <div className="size-3 border-2 border-brand-dark/20 border-t-brand-dark rounded-full animate-spin" />
                                                        Adding...
                                                    </>
                                                ) : (
                                                    'Add Note'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex gap-2.5 overflow-x-auto pb-4 scrollbar-hide px-2">
                            {[
                                { label:"All", icon: null },
                                { label:"Image", icon:"ri-image-2-line" },
                                { label:"List", icon:"ri-list-unordered" },
                                { label:"Draw", icon:"ri-pencil-fill" },
                            ].map((item) => {
                                const FilterIcon = item.icon ? getIcon(item.icon) : null;
                                return (
                                <div
                                    key={item.label}
                                    onClick={() => setFilter(item.label)}
                                    className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-xl border px-5 cursor-pointer transition-all duration-300 font-bold uppercase tracking-widest text-[10px] ${filter === item.label
                                        ? 'bg-brand-accent text-brand-dark border-brand-accent shadow-lg -accent/20'
                                        : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-brand-dark'
                                        }`}
                                >
                                    {item.icon && FilterIcon ? (
                                        <FilterIcon
                                            className={`transition-colors duration-200 ${filter === item.label ? 'text-brand-dark' : 'text-gray-400'}`}
                                            style={{ fontSize: 14 }}
                                        />
                                    ) : item.icon ? (
                                        <i
                                            className={`${item.icon} transition-colors ${filter === item.label ? 'text-brand-dark' : 'text-gray-400'
                                                }`}
                                            style={{ fontSize: 14 }}
                                        />
                                    ) : null}
                                    <span>
                                        {item.label}
                                    </span>
                                </div>
                            );
                            })}
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-primary"></div>
                            </div>
                        ) : (
                            <>
                                {/* Pinned Section */}
                                {visiblePinnedNotes.length > 0 && (
                                    <div className="flex flex-col gap-4">
                                        <h6 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.25em] px-2 mb-2 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                                            Pinned
                                        </h6>
                                        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
                                            {visiblePinnedNotes.map((note) => (
                                                <NoteCard
                                                    key={note.id}
                                                    note={note}
                                                    onTogglePin={handleTogglePin}
                                                    onDelete={(id) => openDeleteModal(id, note.title)}
                                                    onClick={() => navigate(`/note-editor?id=${note.id}`)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Others Section */}
                                <div className="flex flex-col gap-4">
                                    {visiblePinnedNotes.length > 0 && (
                                        <h6 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.25em] px-2 mb-2">
                                            Others
                                        </h6>
                                    )}
                                    {visibleOtherNotes.length > 0 ? (
                                        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
                                            {visibleOtherNotes.map((note) => (
                                                <NoteCard
                                                    key={note.id}
                                                    note={note}
                                                    onTogglePin={handleTogglePin}
                                                    onDelete={(id) => openDeleteModal(id, note.title)}
                                                    onClick={() => navigate(`/note-editor?id=${note.id}`)}
                                                />
                                            ))}
                                        </div>
                                    ) : !visiblePinnedNotes.length && (
                                        <div className="flex flex-col items-center justify-center py-32 text-gray-500">
                                            <div className="size-24 rounded-3xl bg-white/5 flex items-center justify-center mb-6 border border-white/5">
                                                {(() => {
                                                    const LightbulbIcon = getIcon('ri-lightbulb-line');
                                                    return LightbulbIcon ? (
                                                        <LightbulbIcon className="text-4xl opacity-20 text-gray-400" />
                                                    ) : (
                                                        <i className="ri-lightbulb-line text-4xl opacity-20"></i>
                                                    );
                                                })()}
                                            </div>
                                            <p className="text-xs font-bold uppercase tracking-[0.2em]">Notes you add appear here</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </main>
            </div>

            {/* Floating Action Button (Mobile) - Navigate to Editor for new note */}
            <button
                onClick={() => navigate('/note-editor')}
                className="md:hidden fixed bottom-8 right-8 size-16 rounded-2xl bg-brand-accent text-brand-dark shadow-2xl -accent/40 flex items-center justify-center z-50 border border-white/20 transition-all active:scale-95 hover:scale-105"
            >
                {(() => {
                    const AddIcon = getIcon('ri-add-line');
                    return AddIcon ? (
                        <AddIcon className="transition-colors duration-200" style={{ fontSize: 28 }} />
                    ) : (
                        <i className="ri-add-line text-3xl"></i>
                    );
                })()}
            </button>

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

export default NoteDashboard;
