import type { FC } from 'react';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const CalendarWidget: FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<number | null>(new Date().getDate());

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = getFirstDayOfMonth(currentDate);
    const today = new Date();
    const isCurrentMonth = currentDate.getMonth() === today.getMonth() && 
                          currentDate.getFullYear() === today.getFullYear();

    // Sample events for demo
    const eventsOnDays = [5, 12, 15, 22, 28];

    return (
        <div className="rounded-2xl overflow-hidden bg-white border-light-border dark:bg-dark-surface dark:border-dark-border border">
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
                            {currentDate.getFullYear()}
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
                        const isSelected = selectedDate === day;
                        const hasEvent = eventsOnDays.includes(day);

                        return (
                            <button
                                key={day}
                                onClick={() => setSelectedDate(day)}
                                className={`
                                    aspect-square rounded-xl text-sm font-medium relative
                                    flex items-center justify-center
                                    transition-all duration-200
                                    ${isSelected 
                                        ? 'bg-gradient-to-br from-ember to-wine text-white shadow-lg shadow-ember/25 scale-105' 
                                        : isToday 
                                            ? 'bg-indigo/20 text-indigo ring-2 ring-indigo/30 dark:bg-indigo/30 dark:ring-indigo/50'
                                            : 'text-light-text-primary hover:bg-light-surface-2 dark:text-dark-text-primary dark:hover:bg-dark-surface-2'
                                    }
                                `}
                            >
                                {day}
                                {/* Event indicator */}
                                {hasEvent && !isSelected && (
                                    <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-ember" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Footer - Quick Legend */}
            <div className="px-6 py-3 border-t flex items-center justify-between border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-ember" />
                        <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            Events
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo" />
                        <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            Today
                        </span>
                    </div>
                </div>
                <span className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary">
                    {eventsOnDays.length} events this month
                </span>
            </div>
        </div>
    );
};

export default CalendarWidget;
