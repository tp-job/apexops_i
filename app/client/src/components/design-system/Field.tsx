import type { FC, ReactNode } from 'react';
import { useId, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DUR, EASE_LUX } from '@/lib/motion';
import { FieldContext, type FieldWiring } from './field-context';

interface FieldProps {
    label: string;
    /** Static helper text. Hidden while an error is showing, so the two never stack. */
    hint?: string;
    /** Presence of a string is what makes the field invalid — empty string counts as valid. */
    error?: string;
    required?: boolean;
    /** Override the generated control id (e.g. to match an existing `name`). */
    id?: string;
    className?: string;
    children: ReactNode;
}

/**
 * Label + hint + error + required marker around a single control.
 *
 * The point of this primitive is that the accessibility wiring — `htmlFor`,
 * `aria-describedby`, `aria-invalid`, `aria-required` — is solved **once** here
 * instead of being re-remembered on every form. Controls read it out of context
 * (see `field-context.ts`); they do not take these props from the caller.
 *
 * Error text is `role="alert"` so a screen reader announces a failed submit
 * without the user having to go hunting for what changed.
 */
const Field: FC<FieldProps> = ({
    label,
    hint,
    error,
    required = false,
    id,
    className = '',
    children,
}) => {
    const generatedId = useId();
    const controlId = id ?? `field-${generatedId}`;
    const hintId = `${controlId}-hint`;
    const errorId = `${controlId}-error`;
    const invalid = !!error;

    const wiring = useMemo<FieldWiring>(() => {
        // Only the message actually on screen is referenced — pointing at a hidden
        // hint would have the screen reader read text the eye can't see.
        const ids = [invalid ? errorId : hint ? hintId : null].filter(Boolean) as string[];
        return {
            controlId,
            describedBy: ids.length ? ids.join(' ') : undefined,
            invalid,
            required,
        };
    }, [controlId, errorId, hintId, hint, invalid, required]);

    return (
        <FieldContext.Provider value={wiring}>
            <div className={`flex flex-col gap-1.5 ${className}`.trim()}>
                <label
                    htmlFor={controlId}
                    className="text-sm font-medium text-brand-dark dark:text-gray-200"
                >
                    {label}
                    {required && (
                        <span className="ml-1 text-global-red" aria-hidden>
                            *
                        </span>
                    )}
                </label>

                {children}

                <AnimatePresence mode="wait" initial={false}>
                    {invalid ? (
                        <motion.p
                            key="error"
                            id={errorId}
                            role="alert"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: DUR.fast, ease: EASE_LUX }}
                            className="text-xs font-medium text-global-red"
                        >
                            {error}
                        </motion.p>
                    ) : hint ? (
                        <p key="hint" id={hintId} className="text-xs text-gray-500 dark:text-gray-400">
                            {hint}
                        </p>
                    ) : null}
                </AnimatePresence>
            </div>
        </FieldContext.Provider>
    );
};

export default Field;
