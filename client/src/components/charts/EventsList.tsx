import type { FC } from 'react';
import type { EventsListProps } from '@/types/userAuth.ts';
import { Clock, ChevronRight, Calendar, MapPin } from 'lucide-react';

const EventsList: FC<EventsListProps> = ({ events }) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
    });

    // Group events by type for color coding
    const getEventStyle = (type: string) => {
        switch (type) {
            case 'meeting':
                return { bg: 'bg-wine/10', border: 'border-wine/30', dot: 'bg-wine', text: 'text-wine' };
            case 'consultation':
                return { bg: 'bg-indigo/10', border: 'border-indigo/30', dot: 'bg-indigo', text: 'text-indigo' };
            case 'examination':
                return { bg: 'bg-ember/10', border: 'border-ember/30', dot: 'bg-ember', text: 'text-ember' };
            default:
                return { bg: 'bg-peach/10', border: 'border-peach/30', dot: 'bg-peach', text: 'text-peach' };
        }
    };

    return (
        <div className="rounded-2xl overflow-hidden bg-white border-light-border dark:bg-dark-surface dark:border-dark-border border">
            {/* Header */}
            <div className="px-6 py-4 border-b border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ember to-wine flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">
                                Today's Schedule
                            </h3>
                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                {dateStr}
                            </p>
                        </div>
                    </div>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-light-surface-2 hover:bg-light-border text-light-text-secondary dark:bg-dark-surface dark:hover:bg-dark-border dark:text-dark-text-secondary">
                        View All
                    </button>
                </div>
            </div>

            {/* Events List */}
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                {events.length === 0 ? (
                    <div className="text-center py-8 text-light-text-secondary dark:text-dark-text-secondary">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No events scheduled for today</p>
                    </div>
                ) : (
                    events.map((event, index) => {
                        const style = getEventStyle(event.type);
                        return (
                            <div 
                                key={event.id} 
                                className="group relative p-4 rounded-xl border transition-all duration-300 bg-light-surface-2/50 border-light-border hover:bg-light-surface-2 dark:bg-dark-surface-2/50 dark:border-dark-border dark:hover:bg-dark-surface-2 hover:shadow-md cursor-pointer"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Time Badge */}
                                    <div className={`shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center ${style.bg} ${style.border} border`}>
                                        <Clock className={`w-4 h-4 mb-1 ${style.text}`} />
                                        <span className={`text-xs font-bold ${style.text}`}>
                                            {event.time}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}>
                                                {event.type}
                                            </span>
                                        </div>
                                        <h4 className="font-medium text-sm mb-1 line-clamp-2 text-light-text-primary dark:text-dark-text-primary">
                                            {event.title}
                                        </h4>
                                        <div className="flex items-center gap-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                            <MapPin className="w-3 h-3" />
                                            <span>Room 101</span>
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <ChevronRight className="w-5 h-5 shrink-0 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1 text-light-text-secondary dark:text-dark-text-secondary" />
                                </div>

                                {/* Progress indicator for current/upcoming */}
                                {index === 0 && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b from-ember to-wine" />
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2">
                <button className="w-full py-2 rounded-lg text-sm font-medium text-ember hover:bg-ember/10 transition-colors flex items-center justify-center gap-2">
                    <span>+ Add New Event</span>
                </button>
            </div>
        </div>
    );
};

export default EventsList;
