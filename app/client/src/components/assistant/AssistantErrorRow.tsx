import type { FC } from 'react';
import { FiAlertTriangle, FiClock, FiKey, FiRefreshCw, FiX } from 'react-icons/fi';
import type { AssistantError } from '@/types/assistant';

/**
 * One row per failure code (spec F011, F019).
 *
 * **Different codes get different affordances, not one red box.** A missing key
 * is an invitation; a rate limit is a wait; a provider fault is a retry. Painting
 * all three the same colour with the same button teaches people to ignore the
 * row, which is the opposite of what an error surface is for.
 *
 * `NO_KEY` is handled by `KeyMissingNotice` instead and never reaches here.
 */

const formatWait = (seconds?: number): string => {
    if (!seconds || seconds < 0) return 'shortly';
    if (seconds < 60) return `in ${seconds}s`;
    const mins = Math.ceil(seconds / 60);
    return `in about ${mins} minute${mins === 1 ? '' : 's'}`;
};

interface AssistantErrorRowProps {
    error: AssistantError;
    onRetry: () => void;
    onDismiss: () => void;
    onOpenKeyDialog: () => void;
}

const AssistantErrorRow: FC<AssistantErrorRowProps> = ({ error, onRetry, onDismiss, onOpenKeyDialog }) => {
    // Yellow for "wait", red for "something is wrong". A rate limit is not a
    // fault — the user did nothing incorrect and nothing is broken.
    const isWait = error.code === 'RATE_LIMITED';

    const tone = isWait
        ? 'border-global-yellow/30 bg-global-yellow/10 text-global-yellow'
        : 'border-global-red/30 bg-global-red/8 text-global-red';

    const icon = isWait ? <FiClock size={14} /> : error.code === 'INVALID_KEY' ? <FiKey size={14} /> : <FiAlertTriangle size={14} />;

    const message = isWait
        ? `You have hit the request limit. Try again ${formatWait(error.retryAfter)}.`
        : error.message;

    const action =
        error.code === 'INVALID_KEY'
            ? { label: 'Update key', onClick: onOpenKeyDialog, icon: <FiKey size={12} /> }
            : error.code === 'RATE_LIMITED'
              ? null // Retrying now would just fail again.
              : { label: 'Retry', onClick: onRetry, icon: <FiRefreshCw size={12} /> };

    return (
        <div className={`mx-4 mb-3 flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${tone}`} role="alert">
            <span className="mt-0.5 shrink-0">{icon}</span>

            <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-5">{message}</p>
                {action && (
                    <button
                        type="button"
                        onClick={action.onClick}
                        className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-semibold underline underline-offset-2 hover:no-underline"
                    >
                        {action.icon}
                        {action.label}
                    </button>
                )}
            </div>

            <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss error"
                className="shrink-0 rounded-md p-0.5 opacity-70 transition-opacity hover:opacity-100"
            >
                <FiX size={14} />
            </button>
        </div>
    );
};

/**
 * `NO_KEY` gets its own surface, in accent-soft rather than red.
 *
 * Nothing has failed: the user simply has not added a key yet. A red error row
 * here would read as a bug report for a first-run state.
 */
export const KeyMissingNotice: FC<{ onOpenKeyDialog: () => void }> = ({ onOpenKeyDialog }) => (
    <div className="mx-4 mb-3 rounded-xl bg-brand-accentSoft px-3.5 py-3">
        <p className="text-[13px] font-semibold text-brand-dark dark:text-white">Add your API key</p>
        <p className="mt-1 text-[12px] leading-5 text-light-text-secondary dark:text-dark-text-secondary">
            The assistant runs on your own Gemini key, so usage is billed to you and not shared.
        </p>
        <button
            type="button"
            onClick={onOpenKeyDialog}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-accent px-2.5 py-1.5 text-[12px] font-semibold text-brand-dark transition-colors hover:bg-brand-accentHover"
        >
            <FiKey size={12} />
            Add key
        </button>
    </div>
);

export default AssistantErrorRow;
