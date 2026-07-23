import type { FC, DragEvent } from 'react';
import { FiMoreHorizontal, FiMessageSquare, FiPaperclip, FiPlus } from 'react-icons/fi';
import type { Ticket } from '@/types/bugTrackerApp';

export interface BugTrackerKanbanViewProps {
    tickets: Ticket[];
    onUpdateStatus: (id: string, status: Ticket['status']) => void;
    onSelectTicket: (ticket: Ticket) => void;
}

const TAG_COLORS = [
    'bg-brand-accent/20 text-brand-accent',
    'bg-blue-400/20 text-blue-300',
    'bg-purple-400/20 text-purple-300',
    'bg-pink-400/20 text-pink-300',
];

const pseudoCount = (seed: string, max: number) => {
    const sum = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return sum % max;
};

export const BugTrackerKanbanView: FC<BugTrackerKanbanViewProps> = ({
    tickets,
    onUpdateStatus,
    onSelectTicket,
}) => {
    const columns: { id: Ticket['status']; label: string }[] = [
        { id: 'open', label: 'New Request' },
        { id: 'in-progress', label: 'In Progress' },
        { id: 'resolved', label: 'Complete' },
        { id: 'closed', label: 'Closed' },
    ];

    const handleDragStart = (e: DragEvent, ticketId: string) => {
        e.dataTransfer.setData('ticketId', ticketId);
    };

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: DragEvent, status: Ticket['status']) => {
        e.preventDefault();
        const ticketId = e.dataTransfer.getData('ticketId');
        if (ticketId) onUpdateStatus(ticketId, status);
    };

    return (
        <div className="flex gap-4 overflow-x-auto pb-10 animate-fade-in min-h-[600px]">
            {columns.map((col) => (
                <div
                    key={col.id}
                    className="bg-brand-nearBlack2 flex flex-col flex-1 min-w-[300px] p-4 rounded-3xl border border-white/5 shadow-xl"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                >
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                            <h4 className="font-semibold text-sm text-white/80">{col.label}</h4>
                            <span className="text-xs font-numbers text-white/40">
                                {tickets.filter((t) => t.status === col.id).length}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition"
                        >
                            <FiPlus className="w-4 h-4" />
                        </button>
                    </div>
                    {tickets
                        .filter((t) => t.status === col.id)
                        .map((ticket) => {
                            const commentCount = pseudoCount(ticket.id ?? ticket.title, 12) + 1;
                            const attachmentCount = pseudoCount(ticket.title, 5);

                            return (
                                <div
                                    key={ticket.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, ticket.id)}
                                    onClick={() => onSelectTicket(ticket)}
                                    className="bg-white/[0.04] hover:bg-white/[0.07] group relative p-4 mb-3 rounded-2xl cursor-grab transition-all duration-200 border border-white/5"
                                >
                                    <div className="flex justify-between items-start mb-3 gap-2">
                                        <div className="flex flex-wrap gap-1.5">
                                            {(ticket.tags && ticket.tags.length > 0 ? ticket.tags : [ticket.priority]).slice(0, 2).map((tag, index) => (
                                                <span
                                                    key={tag}
                                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                                        TAG_COLORS[index % TAG_COLORS.length]
                                                    }`}
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                        <FiMoreHorizontal className="w-4 h-4 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                    </div>
                                    <h5 className="font-medium text-sm mb-1 text-white/90 line-clamp-2">
                                        {ticket.title}
                                    </h5>
                                    <p className="text-xs text-white/40 line-clamp-2 mb-3">{ticket.description}</p>

                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-3 text-white/40">
                                            <span className="flex items-center gap-1 text-[11px] font-numbers">
                                                <FiMessageSquare className="w-3.5 h-3.5" />
                                                {commentCount}
                                            </span>
                                            {attachmentCount > 0 && (
                                                <span className="flex items-center gap-1 text-[11px] font-numbers">
                                                    <FiPaperclip className="w-3.5 h-3.5" />
                                                    {attachmentCount}
                                                </span>
                                            )}
                                        </div>
                                        {ticket.assignee && (
                                            <div className="w-6 h-6 rounded-full bg-brand-accent/20 text-brand-accent flex items-center justify-center text-[10px] font-bold border border-brand-accent/20">
                                                {ticket.assignee[0]}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            ))}
        </div>
    );
};
