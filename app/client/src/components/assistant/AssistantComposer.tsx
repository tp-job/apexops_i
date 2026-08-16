import type { FC, KeyboardEvent } from 'react';
import { useState } from 'react';
import { FiSend } from 'react-icons/fi';
import { AccentButton, Textarea } from '@/components/design-system';
import { MAX_PROMPT_CHARS } from '@/services/assistant';

/**
 * The composer (spec F011, F017).
 *
 * **No attachment control.** The reference design has a paperclip; this build has
 * nothing to attach it to, and `Topbar`'s own comment states the house rule —
 * *a control that does nothing is worse than no control*. It arrives with the
 * feature, not before it.
 *
 * The character counter appears only in the last quarter before the cap. A
 * counter that is always visible turns every message into a word-count exercise;
 * one that appears at 6,000 of 8,000 is a warning, which is what it is for.
 */

/** Warn from three quarters of the server's cap. */
const WARN_AT = Math.floor(MAX_PROMPT_CHARS * 0.75);

interface AssistantComposerProps {
    onSend: (text: string) => void;
    /** Disables input while a reply is in flight — one request at a time. */
    sending: boolean;
    disabled?: boolean;
}

const AssistantComposer: FC<AssistantComposerProps> = ({ onSend, sending, disabled = false }) => {
    const [value, setValue] = useState('');

    const tooLong = value.length > MAX_PROMPT_CHARS;
    const canSend = value.trim().length > 0 && !tooLong && !sending && !disabled;

    const submit = () => {
        if (!canSend) return;
        onSend(value);
        setValue('');
    };

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter sends, Shift+Enter breaks the line — the convention every chat
        // surface has trained people into. IME composition is excluded, or the
        // first Enter of a Thai/Japanese candidate selection would send instead
        // of committing the character.
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
        }
    };

    return (
        <div className="shrink-0 border-t border-black/5 bg-light-surface-2 px-3 py-3 dark:border-white/10 dark:bg-dark-surface-2">
            <div className="flex items-end gap-2">
                <Textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={onKeyDown}
                    rows={1}
                    autoGrow
                    maxRows={6}
                    disabled={disabled || sending}
                    aria-label="Message the assistant"
                    placeholder={disabled ? 'Add an API key to start' : 'How can I help you?'}
                    className="flex-1"
                />
                <AccentButton
                    type="button"
                    onClick={submit}
                    disabled={!canSend}
                    size="sm"
                    aria-label="Send message"
                    icon={<FiSend size={15} />}
                >
                    <span className="sr-only">Send</span>
                </AccentButton>
            </div>

            {value.length >= WARN_AT && (
                <p
                    className={`mt-1.5 text-right text-[11px] ${
                        tooLong ? 'text-global-red' : 'text-global-yellow'
                    }`}
                >
                    {value.length.toLocaleString()} / {MAX_PROMPT_CHARS.toLocaleString()}
                    {tooLong && ' — too long to send'}
                </p>
            )}
        </div>
    );
};

export default AssistantComposer;
