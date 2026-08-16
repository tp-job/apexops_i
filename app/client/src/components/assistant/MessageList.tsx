import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { FiCheck, FiCopy, FiCpu, FiRefreshCw } from 'react-icons/fi';
import { EmptyState } from '@/components/design-system';
import { fadeUp } from '@/lib/motion';
import type { AssistantMessage } from '@/types/assistant';
import AssistantMarkdown from './AssistantMarkdown';

/**
 * The conversation surface (spec F011, F013).
 *
 * ## The one visual idea
 *
 * The user's turn is a tinted bubble on the right; the assistant's is **bare
 * text on the left, with no surface at all**. That asymmetry is the reference
 * design's core gesture and it costs nothing: the reply is the content, so it
 * gets the full column, while the prompt is an aside and gets a container.
 *
 * The bubble is neutral (`surface-2`), not lime. `.ds-glow`'s own comment
 * reserves the accent for one focal element per view, and spending it on every
 * user turn would leave the send button competing with the transcript.
 */

const timeOf = (d: Date): string =>
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

/**
 * Copy + retry, revealed on hover **and on focus**.
 *
 * Hover-only reveal is a keyboard trap in disguise: the control exists, tab
 * reaches it, and it is invisible while focused. `focus-within` is what makes it
 * honest.
 */
const MessageActions: FC<{ text: string; onRetry?: () => void }> = ({ text, onRetry }) => {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return;
        const t = setTimeout(() => setCopied(false), 1600);
        return () => clearTimeout(t);
    }, [copied]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
        } catch {
            /* clipboard blocked (insecure origin / permission) — stay silent rather than alarm */
        }
    };

    const btn =
        'grid h-7 w-7 place-items-center rounded-lg text-light-text-secondary transition-colors ' +
        'hover:bg-black/5 hover:text-brand-dark dark:text-dark-text-secondary dark:hover:bg-white/10 dark:hover:text-white';

    return (
        <div className="mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <button type="button" onClick={() => void copy()} className={btn} aria-label={copied ? 'Copied' : 'Copy reply'}>
                {copied ? <FiCheck size={13} /> : <FiCopy size={13} />}
            </button>
            {onRetry && (
                <button type="button" onClick={onRetry} className={btn} aria-label="Retry this reply">
                    <FiRefreshCw size={13} />
                </button>
            )}
        </div>
    );
};

const MessageRow: FC<{ message: AssistantMessage; onRetry?: () => void }> = ({ message, onRetry }) => {
    const isUser = message.role === 'user';

    return (
        <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className={`group flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
        >
            {isUser ? (
                <div className="max-w-[85%] rounded-2xl bg-light-surface-2 px-3.5 py-2.5 text-[15px] leading-6 text-light-text dark:bg-dark-surface-2 dark:text-dark-text">
                    {/* Plain text, deliberately: the user's own input is not Markdown-rendered. */}
                    <p className="whitespace-pre-wrap break-words">{message.text}</p>
                </div>
            ) : (
                <div className="w-full text-light-text dark:text-dark-text">
                    <AssistantMarkdown text={message.text} />
                </div>
            )}

            <div className={`flex items-center gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                <span className="mt-1 text-[11px] text-light-text-secondary dark:text-dark-text-secondary">
                    {timeOf(message.at)}
                </span>
                {!isUser && <MessageActions text={message.text} onRetry={onRetry} />}
            </div>
        </motion.div>
    );
};

/** Text-led, like the reference's "Thinking about the concept…". */
export const ThinkingIndicator: FC = () => {
    const reduced = useReducedMotion();

    return (
        <div className="flex items-center gap-2 text-[13px] text-light-text-secondary dark:text-dark-text-secondary">
            <span className="flex gap-1" aria-hidden>
                {[0, 1, 2].map((i) => (
                    <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-brand-accent"
                        // Reduced motion gets a static row of dots, not a
                        // slower animation — the request is "no movement".
                        animate={reduced ? undefined : { opacity: [0.3, 1, 0.3] }}
                        transition={reduced ? undefined : { duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                    />
                ))}
            </span>
            Thinking…
        </div>
    );
};

interface MessageListProps {
    messages: AssistantMessage[];
    sending: boolean;
    onRetry: () => void;
}

const MessageList: FC<MessageListProps> = ({ messages, sending, onRetry }) => {
    const endRef = useRef<HTMLDivElement>(null);
    const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;

    useEffect(() => {
        // `block: 'nearest'` scrolls this container only. `scrollIntoView`'s
        // default can scroll the page behind the panel too, which yanks the
        // content the user was reading.
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [messages.length, sending]);

    if (messages.length === 0 && !sending) {
        return (
            <EmptyState
                size="sm"
                icon={<FiCpu size={18} />}
                title="Ask the assistant"
                description="It can help with what you're working on. Your conversation stays in this tab and is not saved."
            />
        );
    }

    return (
        // `role="log"` + polite: a new reply is announced once it lands, without
        // interrupting whatever the reader is doing.
        <div role="log" aria-live="polite" aria-relevant="additions text" className="flex flex-col gap-5 px-4 py-4">
            {messages.map((m) => (
                <MessageRow
                    key={m.id}
                    message={m}
                    // Retry belongs to the newest reply only. Offering it on every
                    // historic turn implies it would regenerate *that* message,
                    // which is not what it does.
                    onRetry={m.id === lastAssistantId && !sending ? onRetry : undefined}
                />
            ))}
            {sending && <ThinkingIndicator />}
            <div ref={endRef} />
        </div>
    );
};

export default MessageList;
