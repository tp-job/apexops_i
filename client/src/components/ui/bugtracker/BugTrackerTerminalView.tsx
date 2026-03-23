import { useEffect, useRef, type FC } from 'react';
import type { Log } from '@/types/bugTrackerApp';

export interface BugTrackerTerminalViewProps {
    logs: Log[];
    onSelectLog: (log: Log) => void;
    filterLevel: string;
    setFilterLevel: (level: string) => void;
}

export const BugTrackerTerminalView: FC<BugTrackerTerminalViewProps> = ({
    logs,
    onSelectLog,
    filterLevel,
    setFilterLevel,
}) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const filtered = logs.filter((l) => filterLevel === 'all' || l.level === filterLevel);

    return (
        <div className="terminal-window animate-scale-in">
            <div className="terminal-header justify-between">
                <div className="flex items-center gap-2">
                    <div className="terminal-dot red" />
                    <div className="terminal-dot yellow" />
                    <div className="terminal-dot green" />
                    <span className="ml-2 text-xs font-mono text-light-text-secondary dark:text-dark-text-secondary">
                        console.log --watch
                    </span>
                </div>
                <div className="flex gap-2">
                    {['all', 'error', 'warning', 'info'].map((level) => (
                        <button
                            key={level}
                            onClick={() => setFilterLevel(level)}
                            className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${
                                filterLevel === level
                                    ? 'bg-white/20 text-white'
                                    : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-dark-text-secondary'
                            }`}
                        >
                            {level}
                        </button>
                    ))}
                </div>
            </div>
            <div className="terminal-body scrollbar-thin scrollbar-thumb-dark-border scrollbar-track-transparent">
                {filtered.map((log) => (
                    <div
                        key={log.id}
                        onClick={() => onSelectLog(log)}
                        className={`terminal-row ${log.level} cursor-pointer group`}
                    >
                        <span className="text-light-text-secondary dark:text-dark-text-secondary shrink-0 w-20">
                            {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span
                            className={`uppercase font-bold shrink-0 w-16 ${
                                log.level === 'error'
                                    ? 'text-orange-primary'
                                    : log.level === 'warning'
                                      ? 'text-orange-primary'
                                      : 'text-blue-primary'
                            }`}
                        >
                            [{log.level}]
                        </span>
                        <span className="font-mono text-dark-text-secondary truncate group-hover:text-white transition-colors">
                            {log.message}
                        </span>
                    </div>
                ))}
                <div ref={bottomRef} />
                {filtered.length === 0 && (
                    <div className="p-4 text-light-text-secondary dark:text-dark-text-secondary text-center font-mono text-sm">
                        -- No logs found --
                    </div>
                )}
            </div>
        </div>
    );
};
