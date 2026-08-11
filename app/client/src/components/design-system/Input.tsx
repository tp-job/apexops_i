import type { ComponentPropsWithRef, FC, ReactNode } from 'react';
import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useFieldWiring } from './field-context';

/**
 * `ref` is deliberately kept in the prop type. Under React 19 a function
 * component receives it as an ordinary prop, so it rides `...rest` down to the
 * real `<input>` — which is what lets a caller move focus (e.g. back into the
 * add-todo box on `/daily`) without dropping to bespoke markup.
 */
interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'size'> {
    /** Decorative glyph on the left. Not announced — the label carries the meaning. */
    icon?: ReactNode;
    /** Adds a show/hide toggle. Only meaningful with `type="password"`. */
    revealable?: boolean;
}

const base =
    'w-full rounded-xl border bg-white/70 text-sm text-brand-dark transition-colors ' +
    'placeholder:text-gray-400 outline-none ' +
    'dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500 ' +
    'disabled:cursor-not-allowed disabled:opacity-60';

const tone = {
    normal:
        'border-gray-200 focus-visible:border-brand-dark focus-visible:ring-2 focus-visible:ring-brand-dark/25 ' +
        'dark:border-white/10 dark:focus-visible:border-brand-accent dark:focus-visible:ring-brand-accent/30',
    invalid:
        'border-global-red/70 focus-visible:border-global-red focus-visible:ring-2 focus-visible:ring-global-red/25 ' +
        'dark:border-global-red/60',
};

/**
 * The system's text input.
 *
 * Takes its `id`, `aria-describedby`, `aria-invalid` and `aria-required` from the
 * surrounding `Field` rather than from props — that wiring is the whole reason
 * `Field` exists, and letting callers pass it here would let it drift. Used
 * standalone (no `Field`), it falls back to whatever `id`/`aria-*` the caller
 * supplies, which is the right behaviour for a labelled search box.
 *
 * `revealable` renders a show/hide button for passwords. The toggle is a real
 * `<button type="button">` so it neither submits the form nor sits in the tab
 * order as a mystery div.
 */
const Input: FC<InputProps> = ({ icon, revealable = false, type = 'text', className = '', id, ...rest }) => {
    const field = useFieldWiring();
    const [revealed, setRevealed] = useState(false);

    const isPassword = type === 'password';
    const showToggle = revealable && isPassword;
    const resolvedType = showToggle && revealed ? 'text' : type;

    const invalid = field?.invalid ?? false;
    const padding = `${icon ? 'pl-10' : 'pl-3.5'} ${showToggle ? 'pr-11' : 'pr-3.5'} py-2.5`;

    return (
        <div className="relative">
            {icon && (
                <span
                    className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-gray-400 dark:text-gray-500"
                    aria-hidden
                >
                    {icon}
                </span>
            )}

            <input
                id={field?.controlId ?? id}
                type={resolvedType}
                aria-describedby={field?.describedBy}
                aria-invalid={invalid || undefined}
                aria-required={field?.required || undefined}
                className={`${base} ${invalid ? tone.invalid : tone.normal} ${padding} ${className}`.trim()}
                {...rest}
            />

            {showToggle && (
                <button
                    type="button"
                    onClick={() => setRevealed((v) => !v)}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-gray-400 outline-none transition-colors hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand-dark/30 dark:text-gray-500 dark:hover:text-white dark:focus-visible:ring-brand-accent/40"
                    aria-label={revealed ? 'Hide password' : 'Show password'}
                    aria-pressed={revealed}
                >
                    {revealed ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
            )}
        </div>
    );
};

export default Input;
