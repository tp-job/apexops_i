import type { FC, InputHTMLAttributes, ReactNode } from 'react';
import { useFieldWiring } from './field-context';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'ref' | 'type' | 'size'> {
    label?: ReactNode;
    hint?: ReactNode;
    /** Puts the control on the right and lets the label fill the row — the settings-row shape. */
    justified?: boolean;
}

/**
 * The system's on/off toggle.
 *
 * A checkbox under the skin, for the same reasons as `Checkbox` — but with
 * `role="switch"`, which is the part that matters: a screen reader should say
 * "on/off", not "checked/unchecked", for something that takes effect immediately.
 *
 * **Use a `Switch` only when the change applies on toggle.** If it needs a Save
 * button to take effect, it is a `Checkbox` in a form, and dressing it as a switch
 * tells the user their change has already landed when it has not.
 *
 * Motion is a CSS transition, not `motion/react`: the knob is a 120ms translate
 * inside a label, and mounting a motion component per row in a settings list is
 * cost with no payoff.
 */
const Switch: FC<SwitchProps> = ({
    label,
    hint,
    justified = false,
    className = '',
    id,
    disabled,
    ...rest
}) => {
    const field = useFieldWiring();
    const controlId = field?.controlId ?? id;

    const track = [
        'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
        'border-gray-300 bg-gray-200 dark:border-white/15 dark:bg-white/10',
        'peer-checked:border-brand-dark peer-checked:bg-brand-dark',
        'dark:peer-checked:border-brand-accent dark:peer-checked:bg-brand-accent',
        'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-dark/30',
        'dark:peer-focus-visible:ring-brand-accent/40',
        // The knob. Same sibling-combinator caveat as Checkbox: `peer-checked:`
        // cannot reach a child, so the knob is driven through the track.
        '[&>span]:absolute [&>span]:top-0.5 [&>span]:left-0.5 [&>span]:h-5 [&>span]:w-5',
        '[&>span]:rounded-full [&>span]:bg-white [&>span]:shadow-sm',
        '[&>span]:transition-transform [&>span]:duration-150',
        'peer-checked:[&>span]:translate-x-5',
        'dark:[&>span]:bg-white dark:peer-checked:[&>span]:bg-brand-dark',
    ].join(' ');

    return (
        <label
            className={`flex items-start gap-3 ${justified ? 'w-full justify-between' : ''} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className}`.trim()}
        >
            <input
                id={controlId}
                type="checkbox"
                role="switch"
                disabled={disabled}
                aria-describedby={field?.describedBy}
                className="peer sr-only"
                {...rest}
            />

            {justified && (label || hint) && (
                <span className="flex flex-col gap-0.5">
                    {label && (
                        <span className="text-sm font-medium text-brand-dark dark:text-gray-200">{label}</span>
                    )}
                    {hint && <span className="text-xs text-gray-500 dark:text-gray-400">{hint}</span>}
                </span>
            )}

            <span aria-hidden className={track}>
                <span />
            </span>

            {!justified && (label || hint) && (
                <span className="flex flex-col gap-0.5">
                    {label && (
                        <span className="text-sm font-medium leading-6 text-brand-dark dark:text-gray-200">
                            {label}
                        </span>
                    )}
                    {hint && <span className="text-xs text-gray-500 dark:text-gray-400">{hint}</span>}
                </span>
            )}
        </label>
    );
};

export default Switch;
