import type { FC } from 'react';
import { ServerErrorLayout } from './ServerErrorLayout';

const Server500Illustration = () => (
    <svg className="w-full h-full" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="50" y="60" width="100" height="80" rx="8" stroke="currentColor" strokeWidth="4" fill="currentColor" className="text-global-red/20 dark:text-global-red/10" />
        <line x1="60" y1="80" x2="140" y2="80" stroke="currentColor" strokeWidth="2" className="text-global-red/40" />
        <line x1="60" y1="100" x2="140" y2="100" stroke="currentColor" strokeWidth="2" className="text-global-red/40" />
        <line x1="60" y1="120" x2="140" y2="120" stroke="currentColor" strokeWidth="2" className="text-global-red/40" />
        <circle cx="100" cy="100" r="25" fill="currentColor" className="text-global-red" opacity="0.9" />
        <line x1="100" y1="90" x2="100" y2="105" stroke="white" strokeWidth="4" strokeLinecap="round" />
        <circle cx="100" cy="112" r="2" fill="white" />
        <circle cx="70" cy="75" r="3" fill="currentColor" className="text-global-red animate-pulse" />
        <circle cx="100" cy="75" r="3" fill="currentColor" className="text-global-red animate-pulse" style={{ animationDelay: '0.2s' }} />
        <circle cx="130" cy="75" r="3" fill="currentColor" className="text-global-red animate-pulse" style={{ animationDelay: '0.4s' }} />
    </svg>
);

const ServerError: FC = () => (
    <ServerErrorLayout
        statusCode={500}
        title="Internal Server Error"
        description="Oops! Something went wrong on our end. We're working to fix the issue. Please try again later."
        numberGradientClass="from-global-red via-orange-primary to-yellow-500"
        blurClass="bg-global-red/20 dark:bg-global-red/10"
        illustration={<Server500Illustration />}
        primaryButtonText="Try Again"
        helpContent={
            <>
                <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm">
                    If the problem persists, please{' '}
                    <a href="/contact" className="text-global-red hover:text-red-600 dark:hover:text-red-400 underline transition-colors">
                        contact support
                    </a>
                </p>
                <p className="mt-6 text-light-text-secondary dark:text-dark-text-secondary text-xs">
                    Our team has been notified and is investigating the issue.
                </p>
            </>
        }
    >
        <div className="mb-6">
            <div className="inline-block bg-global-red/10 dark:bg-global-red/20 border border-global-red/30 dark:border-global-red/40 rounded-xl px-5 py-2.5">
                <p className="text-global-red dark:text-global-red text-sm font-mono font-semibold">
                    Error Code: 500 - Internal Server Error
                </p>
            </div>
        </div>
    </ServerErrorLayout>
);

export default ServerError;
