import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { ServerErrorLayout } from './ServerErrorLayout';

const Service503Illustration = () => (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="4" fill="currentColor" className="text-blue-primary/20 dark:text-blue-primary/10" />
        <path d="M85 75 L75 85 L90 100 L100 90 Z" fill="currentColor" className="text-blue-primary" />
        <rect x="88" y="98" width="8" height="30" transform="rotate(45 92 113)" fill="currentColor" className="text-blue-primary" />
        <circle cx="120" cy="115" r="15" stroke="currentColor" strokeWidth="3" fill="currentColor" className="text-blue-primary/20 dark:text-blue-primary/10" />
        <circle cx="120" cy="115" r="8" fill="currentColor" className="text-blue-primary" />
        <rect x="118" y="100" width="4" height="8" fill="currentColor" className="text-blue-primary" />
        <rect x="118" y="122" width="4" height="8" fill="currentColor" className="text-blue-primary" />
        <rect x="105" y="113" width="8" height="4" fill="currentColor" className="text-blue-primary" />
        <rect x="127" y="113" width="8" height="4" fill="currentColor" className="text-blue-primary" />
        <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" className="text-blue-primary/30 animate-spin" style={{ animationDuration: '3s' }} />
    </svg>
);

const ServiceUnavailable: FC = () => {
    const [countdown, setCountdown] = useState(30);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    window.location.reload();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <ServerErrorLayout
            statusCode={503}
            title="Service Unavailable"
            description="Our service is temporarily unavailable due to maintenance or high traffic. We'll be back soon!"
            numberGradientClass="from-blue-primary via-orange-primary to-blue-secondary"
            blurClass="bg-blue-primary/20 dark:bg-blue-primary/10"
            illustration={<Service503Illustration />}
            primaryButtonText="Try Again Now"
            helpContent={
                <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm">
                    Check our <a href="/status" className="text-orange-primary hover:text-blue-primary underline transition-colors">status page</a> for updates
                </p>
            }
        >
            <div className="mb-6">
                <div className="inline-block bg-blue-primary/10 dark:bg-blue-primary/20 border border-blue-primary/30 dark:border-blue-primary/40 rounded-xl px-6 py-4">
                    <p className="text-blue-primary dark:text-blue-primary text-sm font-medium mb-1">Auto-retry in</p>
                    <p className="text-blue-primary dark:text-blue-primary text-4xl font-bold font-mono">{countdown}s</p>
                </div>
            </div>
            <div className="mb-6">
                <div className="inline-flex items-center gap-2 bg-global-yellow/10 dark:bg-global-yellow/20 border border-global-yellow/30 dark:border-global-yellow/40 rounded-xl px-4 py-2.5">
                    <div className="w-2 h-2 bg-global-yellow rounded-full animate-pulse" />
                    <p className="text-global-yellow dark:text-global-yellow text-sm font-mono font-semibold">Status: Maintenance Mode</p>
                </div>
            </div>
        </ServerErrorLayout>
    );
};

export default ServiceUnavailable;
