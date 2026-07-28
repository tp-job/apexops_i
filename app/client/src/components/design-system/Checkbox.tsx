import type { FC, InputHTMLAttributes, ReactNode } from 'react';
import { FiCheck } from 'react-icons/fi';
import { useFieldWiring } from './field-context';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'ref' | 'type' | 'size'> {
    /** Inline label. Omit only when an external <label> already points at this control. */
    label?: ReactNode;
    /** Secondary line under the label. */
    hint?: ReactNode;
}

/**
 * The system's checkbox.
 *
 * Built on a real `<input type="checkbox">` rather than a Radix primitive: a
 * checkbox needs no focus trap or portal, and the native element brings form
 * participation, `indeterminate` and correct SR semantics for free. `Modal` is
 * where Radix earns its place — this is not.
 *
 * The input stays in the DOM (`sr-only` + `peer`) rather than being replaced by a
 * styled div, so keyboard, label-click and autofill all keep working. The visual
 * box is `aria-hidden` and driven by `peer-*` variants.
 *
 * Note the `[&>svg]` arbitrary selectors: `peer-checked:` compiles to a *sibling*
 * combinator, so it cannot reach the tick — the tick is a child of the box, not a
 * sibling of the input. Styling it through the box is what actually works.
 */
const Checkbox: FC<CheckboxProps> = ({ label, hint, className = '', id, disabled, ...rest }) => {
    const field = useFieldWiring();
    const controlId = field?.controlId ?? id;
    const invalid = field?.invalid ?? false;

    const box = [
        'grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors',
        'bg-white/70 dark:bg-white/5',
        invalid ? 'border-global-red/70' : 'border-gray-300 dark:border-white/15',
        'peer-checked:border-brand-dark peer-checked:bg-brand-dark',
        'dark:peer-checked:border-brand-accent dark:peer-checked:bg-brand-accent',
        'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-dark/30',
        'dark:peer-focus-visible:ring-brand-accent/40',
        '[&>svg]:scale-75 [&>svg]:opacity-0 [&>svg]:transition-all',
        'peer-checked:[&>svg]:scale-100 peer-checked:[&>svg]:opacity-100',
    ].join(' ');

    return (
        <label
            className={`flex items-start gap-3 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className}`.trim()}
        >
            <input
                id={controlId}
                type="checkbox"
                disabled={disabled}
                aria-describedby={field?.describedBy}
                aria-invalid={invalid || undefined}
                aria-required={field?.required || undefined}
                className="peer sr-only"
                {...rest}
            />

            <span aria-hidden className={box}>
                <FiCheck size={13} strokeWidth={3} className="text-white dark:text-brand-dark" />
            </span>

            {(label || hint) && (
                <span className="flex flex-col gap-0.5">
                    {label && (
                        <span className="text-sm font-medium leading-5 text-brand-dark dark:text-gray-200">
                            {label}
                        </span>
                    )}
                    {hint && <span className="text-xs text-gray-500 dark:text-gray-400">{hint}</span>}
                </span>
            )}
        </label>
    );
};

export default Checkbox;
