import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { ServerErrorLayout } from './ServerErrorLayout';

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const Gateway504Illustration = () => (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="4" fill="currentColor" className="text-global-yellow/20 dark:text-global-yellow/10" />
        <circle cx="100" cy="100" r="50" stroke="currentColor" strokeWidth="2" strokeDasharray="8 4" className="text-global-yellow/40" />
        <line x1="100" y1="100" x2="100" y2="65" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-orange-primary animate-spin" style={{ transformOrigin: '100px 100px', animationDuration: '2s' }} />
        <line x1="100" y1="100" x2="125" y2="100" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-orange-primary" />
        <circle cx="100" cy="100" r="5" fill="currentColor" className="text-orange-primary" />
        <circle cx="100" cy="50" r="3" fill="currentColor" className="text-global-yellow" />
        <circle cx="100" cy="150" r="3" fill="currentColor" className="text-global-yellow" />
        <circle cx="50" cy="100" r="3" fill="currentColor" className="text-global-yellow" />
        <circle cx="150" cy="100" r="3" fill="currentColor" className="text-global-yellow" />
        <path d="M100 25 L110 15 L120 25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" className="text-global-red animate-bounce" />
    </svg>
);

const GatewayTimeout: FC = () => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <ServerErrorLayout
            statusCode={504}
            title="Gateway Timeout"
            description="The server took too long to respond. This might be due to network issues or server overload."
            numberGradientClass="from-global-yellow via-orange-primary to-global-red"
            blurClass="bg-orange-primary/20 dark:bg-orange-primary/10"
            illustration={<Gateway504Illustration />}
            primaryButtonText="Retry Request"
            helpContent={
                <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm">
                    Still having issues?{' '}
                    <a href="/contact" className="text-orange-primary hover:text-orange-600 dark:hover:text-orange-400 underline transition-colors">
                        Contact support
                    </a>
                </p>
            }
        >
            <div className="mb-6">
                <div className="inline-block bg-orange-primary/10 dark:bg-orange-primary/20 border border-orange-primary/30 dark:border-orange-primary/40 rounded-xl px-6 py-4">
                    <p className="text-orange-primary dark:text-orange-primary text-sm font-medium mb-1">Time waited</p>
                    <p className="text-orange-primary dark:text-orange-primary text-4xl font-bold font-mono">{formatTime(elapsed)}</p>
                </div>
            </div>
            <div className="mb-6">
                <div className="inline-block bg-global-yellow/10 dark:bg-global-yellow/20 border border-global-yellow/30 dark:border-global-yellow/40 rounded-xl px-5 py-2.5">
                    <p className="text-global-yellow dark:text-global-yellow text-sm font-mono font-semibold">
                        Error Code: 504 - Gateway Timeout
                    </p>
                </div>
            </div>
            <div className="mb-6 max-w-md mx-auto">
                <div className="bg-light-surface dark:bg-dark-surface rounded-xl shadow-sm border border-light-border dark:border-dark-border p-5">
                    <h3 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary mb-3">Possible causes:</h3>
                    <ul className="text-sm text-light-text-secondary dark:text-dark-text-secondary text-left space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-orange-primary mt-0.5">•</span>
                            <span>Server is experiencing high load</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-orange-primary mt-0.5">•</span>
                            <span>Network connection is slow or unstable</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-orange-primary mt-0.5">•</span>
                            <span>Upstream server is not responding</span>
                        </li>
                    </ul>
                </div>
            </div>
        </ServerErrorLayout>
    );
};

export default GatewayTimeout;
