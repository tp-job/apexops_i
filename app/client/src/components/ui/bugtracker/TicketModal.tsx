import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { Terminal } from 'lucide-react';
import type { Ticket, Log } from '@/types/bugTrackerApp';

export interface TicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTicket: Ticket | null;
    linkedLog: Log | null;
    onSave: (data: Partial<Ticket>) => Promise<void>;
}

export const TicketModal: FC<TicketModalProps> = ({
    isOpen,
    onClose,
    initialTicket,
    linkedLog,
    onSave
}) => {
    const [ticketData, setTicketData] = useState({
        title: '',
        description: '',
        priority: 'medium' as Ticket['priority'],
        assignee: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (initialTicket) {
                setTicketData({
                    title: initialTicket.title,
                    description: initialTicket.description,
                    priority: initialTicket.priority,
                    assignee: initialTicket.assignee || ''
                });
            } else if (linkedLog) {
                setTicketData({
                    title: `Fix: ${linkedLog.message.substring(0, 40)}...`,
                    description: `Error from ${linkedLog.source}\n\n${linkedLog.message}\n\n${linkedLog.stack || ''}`,
                    priority: linkedLog.level === 'error' ? 'high' : 'medium',
                    assignee: ''
                });
            } else {
                setTicketData({ title: '', description: '', priority: 'medium', assignee: '' });
            }
        }
    }, [isOpen, initialTicket, linkedLog]);

    if (!isOpen) return null;

    const handleSave = async () => {
        await onSave(ticketData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className={`glass-dark w-full max-w-2xl animate-scale-in p-0 overflow-hidden border border-white/20 rounded-3xl`}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center glass-panel">
                    <h2 className="text-xl font-bold text-brand-dark font-heading">
                        {initialTicket ? 'Edit Ticket' : 'Create New Ticket'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-brand-dark">âœ•</button>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {linkedLog && !initialTicket && (
                        <div className="p-3 bg-black/50 text-gray-400 font-numbers text-xs rounded-xl mb-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-1 text-orange-primary font-bold">
                                <Terminal className="w-3 h-3" /> LINKED LOG
                            </div>
                            {linkedLog.message}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold mb-1.5 text-brand-dark">Title</label>
                        <input
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand-accent transition-all"
                            value={ticketData.title}
                            onChange={e => setTicketData({ ...ticketData, title: e.target.value })}
                            placeholder="Ticket Title"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-1.5 text-brand-dark">Priority</label>
                            <select
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand-accent transition-all appearance-none"
                                value={ticketData.priority}
                                onChange={e => setTicketData({ ...ticketData, priority: e.target.value as Ticket['priority'] })}
                            >
                                <option value="low" className="bg-gray-800">Low</option>
                                <option value="medium" className="bg-gray-800">Medium</option>
                                <option value="high" className="bg-gray-800">High</option>
                                <option value="critical" className="bg-gray-800">Critical</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1.5 text-brand-dark">Assignee</label>
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand-accent transition-all"
                                value={ticketData.assignee}
                                onChange={e => setTicketData({ ...ticketData, assignee: e.target.value })}
                                placeholder="Unassigned"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1.5 text-brand-dark">Description</label>
                        <textarea
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand-accent transition-all min-h-[120px] resize-none font-numbers text-sm"
                            value={ticketData.description}
                            onChange={e => setTicketData({ ...ticketData, description: e.target.value })}
                            placeholder="Markdown supported..."
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 flex gap-3 bg-black/20">
                    <button
                        onClick={handleSave}
                        className="w-full bg-brand-accent text-brand-dark font-bold rounded-xl py-3 hover:bg-[#b5db00] transition-colors"
                    >
                        {initialTicket ? 'Save Changes' : 'Create Ticket'}
                    </button>
                </div>
            </div>
        </div>
    );
};
