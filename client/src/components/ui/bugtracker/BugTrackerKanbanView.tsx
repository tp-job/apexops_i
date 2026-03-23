import type { FC, DragEvent } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { Ticket } from '@/types/bugTrackerApp';

export interface BugTrackerKanbanViewProps {
    tickets: Ticket[];
    onUpdateStatus: (id: string, status: Ticket['status']) => void;
    onSelectTicket: (ticket: Ticket) => void;
}

export const BugTrackerKanbanView: FC<BugTrackerKanbanViewProps> = ({
    tickets,
    onUpdateStatus,
    onSelectTicket,
}) => {
    const columns: { id: Ticket['status']; label: string; color: string }[] = [
        { id: 'open', label: 'Open', color: 'border-t-blue-primary' },
        { id: 'in-progress', label: 'In Progress', color: 'border-t-blue-secondary' },
        { id: 'resolved', label: 'Resolved', color: 'border-t-green' },
        { id: 'closed', label: 'Closed', color: 'border-t-light-text-secondary' },
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
        <div className="kanban-board animate-fade-in">
            {columns.map((col) => (
                <div
                    key={col.id}
                    className={`kanban-column ${col.color} border-t-4`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                >
                    <div className="kanban-header">
                        <h4 className="font-bold text-sm text-light-text-primary dark:text-dark-text-primary uppercase tracking-wider">
                            {col.label}
                        </h4>
                        <span className="bg-white/50 dark:bg-white/10 px-2 py-0.5 rounded text-xs font-mono">
                            {tickets.filter((t) => t.status === col.id).length}
                        </span>
                    </div>
                    {tickets
                        .filter((t) => t.status === col.id)
                        .map((ticket) => (
                            <div
                                key={ticket.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, ticket.id)}
                                onClick={() => onSelectTicket(ticket)}
                                className="kanban-card group relative"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span
                                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                            ticket.priority === 'critical'
                                                ? 'text-orange-primary border-orange-primary/20 bg-orange-primary/10'
                                                : ticket.priority === 'high'
                                                  ? 'text-orange-primary border-orange-primary/20 bg-orange-primary/5'
                                                  : 'text-blue-primary border-blue-primary/20 bg-blue-primary/5'
                                        }`}
                                    >
                                        {ticket.priority}
                                    </span>
                                    <MoreHorizontal className="w-4 h-4 text-light-text-secondary dark:text-dark-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <h5 className="font-bold text-sm mb-1 dark:text-dark-text-primary line-clamp-2">
                                    {ticket.title}
                                </h5>
                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-xs font-mono text-light-text-secondary dark:text-dark-text-secondary">
                                        #{ticket.id?.slice(0, 4)}
                                    </span>
                                    {ticket.assignee && (
                                        <div className="w-5 h-5 rounded-full bg-blue-primary/20 text-blue-primary flex items-center justify-center text-[10px] font-bold">
                                            {ticket.assignee[0]}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                </div>
            ))}
        </div>
    );
};
