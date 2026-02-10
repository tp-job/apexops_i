import { useState, useEffect, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, Calendar, Plus, FileText,
    Image, List, Link2, X, Clock, Edit3
} from 'lucide-react';

interface CalendarNote {
    id: string;
    title: string;
    type: string;
    color: string | null;
    createdAt: string;
    updatedAt: string;
}

interface CalendarData {
    year: number;
    month: number;
    notesByDay: Record<number, CalendarNote[]>;
    totalNotes: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Quick Add Note Modal
const QuickAddModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    selectedDate: Date;
    onSuccess: () => void;
}> = ({ isOpen, onClose, selectedDate, onSuccess }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!title && !content) return;

        setSaving(true);
        const token = localStorage.getItem('accessToken');

        try {
            const res = await fetch(`${API_BASE_URL}/api/notes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title || `Note for ${selectedDate.toLocaleDateString()}`,
                    content,
                    type: 'text'
                })
            });

            if (res.ok) {
                onSuccess();
                onClose();
                setTitle('');
                setContent('');
            }
        } catch (err) {
            console.error('Error creating note:', err);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md mx-4 rounded-2xl shadow-2xl border overflow-hidden bg-white border-light-border dark:bg-dark-surface dark:border-dark-border">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ember to-wine flex items-center justify-center">
                            <Plus className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">
                                Quick Note
                            </h3>
                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-light-border dark:hover:bg-dark-border transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-light-text-secondary dark:text-dark-text-secondary">
                            Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Note title..."
                            className="w-full mt-2 px-4 py-3 rounded-xl border text-sm bg-light-surface-2 border-light-border text-light-text-primary placeholder:text-light-text-secondary dark:bg-dark-surface-2 dark:border-dark-border dark:text-dark-text-primary dark:placeholder:text-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-ember/50"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-light-text-secondary dark:text-dark-text-secondary">
                            Content
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Write your note..."
                            rows={4}
                            className="w-full mt-2 px-4 py-3 rounded-xl border text-sm resize-none bg-light-surface-2 border-light-border text-light-text-primary placeholder:text-light-text-secondary dark:bg-dark-surface-2 dark:border-dark-border dark:text-dark-text-primary dark:placeholder:text-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-ember/50"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t flex justify-end gap-3 border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-light-text-secondary hover:bg-light-border dark:text-dark-text-secondary dark:hover:bg-dark-border transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || (!title && !content)}
                        className="px-6 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-ember to-wine text-white hover:shadow-lg hover:shadow-ember/20 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <i className="ri-loader-4-line animate-spin"></i>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4" />
                                Add Note
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Day Detail Modal
const DayDetailModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    selectedDate: Date;
    notes: CalendarNote[];
}> = ({ isOpen, onClose, selectedDate, notes }) => {
    const navigate = useNavigate();

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'text': return <FileText className="w-4 h-4" />;
            case 'image': return <Image className="w-4 h-4" />;
            case 'list': return <List className="w-4 h-4" />;
            case 'link': return <Link2 className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'text': return '#6366F1';
            case 'image': return '#F64668';
            case 'list': return '#0F9D58';
            case 'link': return '#F4B400';
            default: return '#6B7280';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md mx-4 rounded-2xl shadow-2xl border overflow-hidden max-h-[80vh] flex flex-col bg-white border-light-border dark:bg-dark-surface dark:border-dark-border">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between shrink-0 border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo to-wine flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">
                                {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
                            </h3>
                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-light-border dark:hover:bg-dark-border transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {notes.length > 0 ? (
                        <div className="space-y-3">
                            {notes.map((note) => (
                                <div
                                    key={note.id}
                                    onClick={() => navigate(`/note-editor?id=${note.id}`)}
                                    className="group flex items-center justify-between p-4 rounded-xl cursor-pointer bg-light-surface-2 hover:bg-light-border dark:bg-dark-surface-2 dark:hover:bg-dark-border transition-all duration-200 border border-light-border dark:border-dark-border"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                                            style={{ backgroundColor: `${getTypeColor(note.type)}20` }}
                                        >
                                            <span style={{ color: getTypeColor(note.type) }}>
                                                {getTypeIcon(note.type)}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                                                {note.title || 'Untitled Note'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Clock className="w-3 h-3 text-gray-400" />
                                                <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                                    {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Edit3 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-indigo" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-light-text-secondary dark:text-dark-text-secondary">
                            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No notes for this day</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t flex justify-between items-center shrink-0 border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2">
                    <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        {notes.length} note{notes.length !== 1 ? 's' : ''}
                    </span>
                    <button
                        onClick={() => navigate('/note-editor')}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-ember text-white hover:bg-wine transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Note
                    </button>
                </div>
            </div>
        </div>
    );
};

const CalendarNotes: FC = () => {
    const navigate = useNavigate();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [showDayDetail, setShowDayDetail] = useState(false);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const fetchCalendarData = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const res = await fetch(`${API_BASE_URL}/api/notes/calendar/${year}/${month}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCalendarData(data);
            }
        } catch (err) {
            console.error('Error fetching calendar data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCalendarData();
    }, [currentDate]);

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const handleDayClick = (day: number) => {
        const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        setSelectedDate(clickedDate);

        const notes = calendarData?.notesByDay[day];
        if (notes && notes.length > 0) {
            setShowDayDetail(true);
        } else {
            setShowQuickAdd(true);
        }
    };

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = getFirstDayOfMonth(currentDate);
    const today = new Date();
    const isCurrentMonth = currentDate.getMonth() === today.getMonth() &&
        currentDate.getFullYear() === today.getFullYear();

    return (
        <div className="rounded-2xl overflow-hidden bg-white border-light-border dark:bg-dark-surface dark:border-dark-border border">
            {/* Quick Add Modal */}
            {selectedDate && (
                <QuickAddModal
                    isOpen={showQuickAdd}
                    onClose={() => setShowQuickAdd(false)}
                    selectedDate={selectedDate}
                    onSuccess={fetchCalendarData}
                />
            )}

            {/* Day Detail Modal */}
            {selectedDate && calendarData && (
                <DayDetailModal
                    isOpen={showDayDetail}
                    onClose={() => setShowDayDetail(false)}
                    selectedDate={selectedDate}
                    notes={calendarData.notesByDay[selectedDate.getDate()] || []}
                />
            )}

            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between border-light-border dark:border-dark-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo to-wine flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">
                            {monthNames[currentDate.getMonth()]}
                        </h3>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            {currentDate.getFullYear()} • {calendarData?.totalNotes || 0} notes
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={prevMonth}
                        className="p-2 rounded-lg transition-colors hover:bg-light-surface-2 text-light-text-secondary hover:text-light-text-primary dark:hover:bg-dark-surface-2 dark:text-dark-text-secondary dark:hover:text-dark-text-primary"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-ember text-white hover:bg-wine transition-colors"
                    >
                        Today
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 rounded-lg transition-colors hover:bg-light-surface-2 text-light-text-secondary hover:text-light-text-primary dark:hover:bg-dark-surface-2 dark:text-dark-text-secondary dark:hover:text-dark-text-primary"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-[300px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ember"></div>
                    </div>
                ) : (
                    <>
                        {/* Day Names */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {dayNames.map((day) => (
                                <div
                                    key={day}
                                    className="text-center text-xs font-semibold py-2 text-light-text-secondary dark:text-dark-text-secondary"
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {/* Empty cells for days before the first day of month */}
                            {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                                <div key={`empty-${index}`} className="aspect-square" />
                            ))}

                            {/* Days of the month */}
                            {Array.from({ length: daysInMonth }).map((_, index) => {
                                const day = index + 1;
                                const isToday = isCurrentMonth && day === today.getDate();
                                const notes = calendarData?.notesByDay[day] || [];
                                const hasNotes = notes.length > 0;
                                const noteCount = notes.length;

                                return (
                                    <button
                                        key={day}
                                        onClick={() => handleDayClick(day)}
                                        className={`
                                            aspect-square rounded-xl text-sm font-medium relative
                                            flex flex-col items-center justify-center gap-0.5
                                            transition-all duration-200 group
                                            ${isToday
                                                ? 'bg-indigo/20 text-indigo ring-2 ring-indigo/30 dark:bg-indigo/30 dark:ring-indigo/50'
                                                : hasNotes
                                                    ? 'bg-ember/10 text-ember hover:bg-ember/20'
                                                    : 'text-light-text-primary hover:bg-light-surface-2 dark:text-dark-text-primary dark:hover:bg-dark-surface-2'
                                            }
                                        `}
                                    >
                                        <span>{day}</span>
                                        {/* Note indicators */}
                                        {hasNotes && (
                                            <div className="flex items-center gap-0.5">
                                                {noteCount <= 3 ? (
                                                    Array.from({ length: noteCount }).map((_, i) => (
                                                        <span key={i} className="w-1 h-1 rounded-full bg-ember" />
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] font-bold text-ember">
                                                        {noteCount}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {/* Hover add button */}
                                        {!hasNotes && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Plus className="w-4 h-4 text-ember" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Footer - Quick Legend */}
            <div className="px-6 py-3 border-t flex items-center justify-between border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-ember" />
                        <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            Has Notes
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo" />
                        <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            Today
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/note')}
                    className="text-xs font-medium text-light-text-secondary hover:text-ember dark:text-dark-text-secondary dark:hover:text-ember transition-colors"
                >
                    View All Notes →
                </button>
            </div>
        </div>
    );
};

export default CalendarNotes;
