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
    size = 24,
    className = '',
    title,
    onClick,
}) => {
    const IconComponent = getIcon(icon);
    return (
        <button
            className={`p-2 rounded-full hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 text-light-text-secondary dark:text-dark-text-secondary transition-colors ${className}`}
            title={title}
            onClick={onClick}
        >
            {IconComponent ? (
                <IconComponent className="text-lg transition-colors duration-200 text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: size }} />
            ) : (
                <i className={`${icon} text-lg transition-colors duration-200`} style={{ fontSize: size }}></i>
            )}
        </button>
    );
};

const NoteActionButtons: FC<{ hoverBgClass?: string; onDelete?: () => void }> = ({ hoverBgClass = 'hover:bg-light-surface-2 dark:hover:bg-dark-surface-2', onDelete }) => (
    <div className="flex items-center justify-between px-2 py-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-1">
            {['ri-file-add-fill', 'ri-user-add-fill', 'ri-palette-fill', 'ri-image-add-line', 'ri-inbox-archive-fill', 'ri-delete-bin-fill'].map((iconClass) => {
                const IconComponent = getIcon(iconClass);
                return (
                    <button
                        key={iconClass}
                        onClick={iconClass === 'ri-delete-bin-fill' ? onDelete : (e) => { e.stopPropagation(); }}
                        className={`p-1.5 rounded-full ${hoverBgClass} text-light-text-secondary dark:text-dark-text-secondary`}
                    >
                        {IconComponent ? (
                            <IconComponent className="text-lg transition-colors duration-200 text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 18 }} />
                        ) : (
                            <i className={`${iconClass} text-lg transition-colors duration-200`} style={{ fontSize: 18 }}></i>
                        )}
                    </button>
                );
            })}
        </div>
    </div>
);

NoteActionButtons.displayName = 'NoteActionButtons';

const NoteCardComponent: FC<{ note: Note; onTogglePin: (id: string) => void; onDelete: (id: string) => void; onClick: () => void }> = ({ note, onTogglePin, onDelete, onClick }) => {
    const colorClasses = note.color === 'red'
        ? 'bg-orange-primary/5 dark:bg-orange-primary/10 border-orange-primary/20'
        : 'bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border';

    const hoverBgClass = note.color === 'red'
        ? 'hover:bg-orange-primary/10 dark:hover:bg-orange-primary/20'
        : 'hover:bg-light-surface-2 dark:hover:bg-dark-surface-2';

    return (
        <div
            onClick={onClick}
            className={`break-inside-avoid relative group flex flex-col rounded-xl border ${colorClasses} shadow-sm hover:shadow-md transition-all cursor-pointer`}
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
            <div className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                    <h3 className="font-medium text-light-text-primary dark:text-dark-text-primary text-base">{note.title}</h3>
                    <button
                        onClick={(e) => { e.stopPropagation(); onTogglePin(note.id); }}
                        className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 rounded-full -mt-1 -mr-1"
                    >
                        {(() => {
                            const PinIcon = getIcon(note.isPinned ? 'ri-pushpin-2-fill' : 'ri-pushpin-2-line');
                            return PinIcon ? (
                                <PinIcon className={`text-lg transition-colors duration-200 ${note.isPinned ? 'text-light-text-primary dark:text-dark-text-primary' : 'text-light-text-secondary dark:text-dark-text-secondary'}`} style={{ fontSize: 20 }} />
                            ) : (
                                <i className={note.isPinned ? "ri-pushpin-2-fill" : "ri-pushpin-2-line"} style={{ fontSize: 20 }}></i>
                            );
                        })()}
                    </button>
                </div>

                {/* Regular text content */}
                {note.content && !note.quote && (
                    <p className="text-sm text-light-text dark:text-dark-text leading-relaxed whitespace-pre-line">
                        {note.content}
                    </p>
                )}

                {/* Quote */}
                {note.quote && (
                    <>
                        <p className="text-sm text-light-text dark:text-dark-text leading-relaxed italic font-serif">
                            {note.quote.text}
                        </p>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">- {note.quote.author}</p>
                    </>
                )}

                {/* Checklist */}
                {note.type === 'list' && note.checklistItems && (
                    <ul className="space-y-1 mt-1">
                        {note.checklistItems.map((item, idx) => {
                            const CheckboxIcon = getIcon(item.checked ? 'ri-checkbox-fill' : 'ri-checkbox-line');
                            return (
                                <li key={idx} className="flex items-center gap-2">
                                    {CheckboxIcon ? (
                                        <CheckboxIcon className="text-light-text-secondary/50 dark:text-dark-text-secondary/50 transition-colors duration-200" style={{ fontSize: 18 }} />
                                    ) : (
                                        <span className="material-symbols-outlined text-light-text-secondary/50 dark:text-dark-text-secondary/50" style={{ fontSize: 18 }}>
                                            {item.checked ? 'check_box' : 'check_box_outline_blank'}
                                        </span>
                                    )}
                                    <span className={`text-sm ${item.checked ? 'text-light-text-secondary dark:text-dark-text-secondary line-through' : 'text-light-text dark:text-dark-text'}`}>
                                        {item.text}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                        {note.tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-light-surface-2 dark:bg-dark-surface-2 px-2 py-0.5 text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <NoteActionButtons hoverBgClass={hoverBgClass} onDelete={() => onDelete(note.id)} />
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
        <div className="font-inter text-light-text dark:text-dark-text h-screen overflow-hidden flex flex-col">
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
                confirmBtnColor="bg-orange-primary hover:bg-orange-600"
                icon="ri-delete-bin-line"
                iconBgColor="bg-orange-primary/10 dark:bg-orange-primary/30"
                iconColor="text-orange-primary"
            />


            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-light-border dark:border-dark-border bg-white/50 dark:bg-dark-surface/50 backdrop-blur-md px-4 py-2 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <IconButton icon="ri-menu-line" onClick={() => { }} />
                    <div className="flex items-center gap-2 text-light-text dark:text-dark-text">
                        <div className="size-10 flex items-center justify-center bg-gradient-to-br from-orange-primary to-blue-primary rounded-lg text-white shadow-lg shadow-orange-primary/20">
                            {(() => {
                                const ListCheckIcon = getIcon('ri-list-check');
                                return ListCheckIcon ? (
                                    <ListCheckIcon className="text-white transition-colors duration-200" style={{ fontSize: 20 }} />
                                ) : (
                                    <i className="ri-list-check"></i>
                                );
                            })()}
                        </div>
                        <h2 className="text-xl font-medium leading-tight tracking-tight hidden sm:block text-light-text-primary dark:text-dark-text-primary">ApexNotes</h2>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="flex flex-1 max-w-[720px] px-4 lg:px-12">
                    <label className="flex flex-col w-full h-11 md:h-12 relative group">
                        <div className="flex w-full flex-1 items-stretch rounded-lg h-full shadow-sm bg-light-surface-2 dark:bg-dark-surface-2 focus-within:bg-light-surface dark:focus-within:bg-dark-surface focus-within:shadow-md transition-all duration-200 border border-transparent focus-within:border-orange-primary/20">
                            <div className="text-light-text-secondary dark:text-dark-text-secondary flex items-center justify-center pl-4 rounded-l-lg">
                                {(() => {
                                    const SearchIcon = getIcon('ri-search-line');
                                    return SearchIcon ? (
                                        <SearchIcon className="text-light-text-secondary dark:text-dark-text-secondary transition-colors duration-200" style={{ fontSize: 20 }} />
                                    ) : (
                                        <i className="ri-search-line"></i>
                                    );
                                })()}
                            </div>
                            <input
                                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-light-text dark:text-dark-text focus:outline-none focus:ring-0 border-none bg-transparent h-full placeholder:text-light-text-secondary dark:placeholder:text-dark-text-secondary px-4 text-base font-normal leading-normal"
                                placeholder="Search"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                            {searchValue && (
                                <button
                                    className="text-light-text-secondary dark:text-dark-text-secondary flex items-center justify-center pr-4 rounded-r-lg cursor-pointer hover:text-light-text-primary dark:hover:text-dark-text-primary"
                                    onClick={() => setSearchValue('')}
                                >
                                    {(() => {
                                        const CloseIcon = getIcon('ri-close-line');
                                        return CloseIcon ? (
                                            <CloseIcon className="text-light-text-secondary dark:text-dark-text-secondary transition-colors duration-200" style={{ fontSize: 20 }} />
                                        ) : (
                                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                                close
                                            </span>
                                        );
                                    })()}
                                </button>
                            )}
                        </div>
                    </label>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 sm:gap-4 pl-2">
                    <button
                        onClick={() => navigate('/note-editor')}
                        className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-primary to-blue-primary text-white text-sm font-bold shadow-sm hover:shadow-lg hover:shadow-orange-primary/20 transition-all active:scale-95"
                    >
                        {(() => {
                            const AddIcon = getIcon('ri-add-line');
                            return AddIcon ? (
                                <AddIcon className="text-white transition-colors duration-200" style={{ fontSize: 18 }} />
                            ) : (
                                <i className="ri-add-line"></i>
                            );
                        })()}
                        New Note
                    </button>
                    <div className="hidden md:flex gap-1">
                        <IconButton icon="ri-loop-left-line" title="Refresh" onClick={fetchNotes} />
                        <IconButton icon="ri-grid-fill" title="Grid View" />
                        <IconButton icon="ri-settings-4-fill" title="Settings" />
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="hidden md:flex flex-col w-[280px] shrink-0 h-full overflow-y-auto py-4 bg-transparent">
                    <div className="flex flex-col">
                        <nav className="flex flex-col gap-1 px-3">
                            {sidebarItems.map((item) => (
                                <SidebarLink key={item.label} item={item} />
                            ))}

                            {/* Labels Section */}
                            <div className="mt-4 mb-2 px-4 flex justify-between items-center group cursor-pointer">
                                <h3 className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                                    Labels
                                </h3>
                                <button className="text-light-text-secondary dark:text-dark-text-secondary opacity-0 group-hover:opacity-100 hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 rounded p-1 transition-all">
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                        add
                                    </span>
                                </button>
                            </div>

                            {labelItems.map((item) => (
                                <SidebarLink key={item.label} item={item} />
                            ))}

                            <div className="my-2 border-t border-light-border dark:border-dark-border" />

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
                        <div className="flex justify-center w-full mb-8">
                            <div className="w-full max-w-[600px] shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border border-light-border dark:border-dark-border overflow-hidden relative">
                                <div className="flex flex-col">
                                    <input
                                        className="w-full px-4 pt-4 pb-2 text-lg font-semibold text-light-text-primary dark:text-dark-text-primary placeholder:text-light-text-secondary dark:placeholder:text-dark-text-secondary bg-transparent border-none focus:ring-0 outline-none"
                                        placeholder="Title"
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                    <textarea
                                        className="w-full px-4 py-2 min-h-[46px] text-base text-light-text dark:text-dark-text placeholder:text-light-text-secondary dark:placeholder:text-dark-text-secondary bg-transparent border-none focus:ring-0 outline-none resize-none transition-all duration-200"
                                        placeholder="Take a note..."
                                        rows={content ? 3 : 1}
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        onFocus={(e) => {
                                            if (!content) e.target.rows = 3;
                                        }}
                                    />
                                    <div className="flex items-center justify-between px-2 py-2">
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
                                                        className="p-2 rounded-full hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 text-light-text-secondary dark:text-dark-text-secondary transition-colors"
                                                        title={item.title}
                                                    >
                                                        {IconComponent ? (
                                                            <IconComponent className="text-lg transition-colors duration-200 text-light-text-secondary dark:text-dark-text-secondary" />
                                                        ) : (
                                                            <i className={`${item.icon} text-lg`}></i>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => { setTitle(''); setContent(''); }}
                                                className="px-4 py-2 rounded-lg text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 transition-colors"
                                            >
                                                Discard
                                            </button>
                                            <button
                                                onClick={handleAddNote}
                                                disabled={isAdding}
                                                className="px-6 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-orange-primary to-blue-primary hover:shadow-lg hover:shadow-orange-primary/30 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {isAdding ? (
                                                    <>
                                                        {(() => {
                                                            const LoaderIcon = getIcon('ri-loader-4-line');
                                                            return LoaderIcon ? (
                                                                <LoaderIcon className="animate-spin transition-colors duration-200 text-white" style={{ fontSize: 18 }} />
                                                            ) : (
                                                                <i className="ri-loader-4-line animate-spin"></i>
                                                            );
                                                        })()}
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
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-2">
                            {[
                                { label: "All", icon: null },
                                { label: "Image", icon: "ri-image-2-line" },
                                { label: "List", icon: "ri-list-unordered" },
                                { label: "Draw", icon: "ri-pencil-fill" },
                            ].map((item) => {
                                const FilterIcon = item.icon ? getIcon(item.icon) : null;
                                return (
                                <div
                                    key={item.label}
                                    onClick={() => setFilter(item.label)}
                                    className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full border px-4 cursor-pointer transition-all ${filter === item.label
                                        ? 'bg-orange-primary text-white border-orange-primary shadow-md shadow-orange-primary/20'
                                        : 'border-light-border dark:border-dark-border bg-white/50 dark:bg-dark-surface/50 hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 text-light-text-secondary dark:text-dark-text-secondary'
                                        }`}
                                >
                                    {item.icon && FilterIcon ? (
                                        <FilterIcon
                                            className={`text-[18px] transition-colors duration-200 ${filter === item.label ? 'text-white' : 'text-light-text-secondary dark:text-dark-text-secondary'}`}
                                        />
                                    ) : item.icon ? (
                                        <i
                                            className={`${item.icon} text-[18px] transition-colors ${filter === item.label ? 'text-white' : 'text-light-text-secondary dark:text-dark-text-secondary'
                                                }`}
                                        />
                                    ) : null}
                                    <p className="text-sm font-medium">
                                        {item.label}
                                    </p>
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
                                    <div className="flex flex-col gap-3">
                                        <h6 className="text-light-text-secondary dark:text-dark-text-secondary text-xs font-bold uppercase tracking-wider px-2">
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
                                <div className="flex flex-col gap-3">
                                    {visiblePinnedNotes.length > 0 && (
                                        <h6 className="text-light-text-secondary dark:text-dark-text-secondary text-xs font-bold uppercase tracking-wider px-2">
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
                                        <div className="flex flex-col items-center justify-center py-20 text-light-text-secondary dark:text-dark-text-secondary">
                                            {(() => {
                                                const LightbulbIcon = getIcon('ri-lightbulb-line');
                                                return LightbulbIcon ? (
                                                    <LightbulbIcon className="text-6xl mb-4 opacity-20 transition-colors duration-200 text-light-text-secondary dark:text-dark-text-secondary" />
                                                ) : (
                                                    <i className="ri-lightbulb-line text-6xl mb-4 opacity-20"></i>
                                                );
                                            })()}
                                            <p className="text-lg">Notes you add appear here</p>
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
                className="md:hidden fixed bottom-6 right-6 size-14 rounded-2xl bg-gradient-to-r from-orange-primary to-blue-primary text-white shadow-lg hover:shadow-xl flex items-center justify-center z-50 border border-transparent transition-all active:scale-95"
            >
                {(() => {
                    const AddIcon = getIcon('ri-add-line');
                    return AddIcon ? (
                        <AddIcon className="text-white transition-colors duration-200" style={{ fontSize: 24 }} />
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
