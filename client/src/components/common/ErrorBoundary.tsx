import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { getErrorMessage } from '@/utils/error';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {
        hasError: false,
        error: null,
    };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render(): ReactNode {
        if (this.state.hasError && this.state.error) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            const message = getErrorMessage(this.state.error);
            return (
                <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center text-light-text-primary dark:text-dark-text-primary">
                    <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary max-w-md mb-4">{message}</p>
                    <button
                        type="button"
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-4 py-2 rounded-lg bg-blue-primary text-white hover:opacity-90"
                    >
                        Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
