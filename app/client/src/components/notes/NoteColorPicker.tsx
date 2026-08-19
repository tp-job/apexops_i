import type { FC } from 'react';
import { FiCheck } from 'react-icons/fi';
import { NOTE_COLORS } from '@/lib/noteColors';

/**
 * Set a note's colour while writing it.
 *
 * Colour was reachable only from the card's right-click menu, which means it
 * could only be applied to a note that already existed, by someone who had
 * discovered a context menu. Bringing it into the form makes it part of writing
 * the note rather than a correction afterwards.
 *
 * **Not a `<select>` of colour names, and not bare swatches either.** A radio
 * group is the honest control for "one of six", so arrow keys work and the
 * choice is announced; each swatch carries its name as its accessible label,
 * because a colour communicated only as a colour is no label at all for a
 * reader who cannot see it.
 */
export interface NoteColorPickerProps {
    value: string | null;
    onChange: (color: string | null) => void;
    disabled?: boolean;
}

const NoteColorPicker: FC<NoteColorPickerProps> = ({ value, onChange, disabled }) => (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Note colour">
        {NOTE_COLORS.map((c) => {
            const active = (value ?? null) === c.id;
            return (
                <button
                    key={c.id ?? 'none'}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={c.label}
                    title={c.label}
                    disabled={disabled}
                    onClick={() => onChange(c.id)}
                    className={[
                        'flex h-6 w-6 items-center justify-center rounded-full outline-none transition-transform',
                        'disabled:cursor-not-allowed disabled:opacity-40',
                        'focus-visible:ring-2 focus-visible:ring-brand-dark/40 dark:focus-visible:ring-brand-accent/50',
                        c.dot,
                        // The ring, not a size change, marks the selection: growing
                        // the swatch would shift every sibling beside it.
                        active
                            ? 'ring-2 ring-brand-dark ring-offset-2 ring-offset-white dark:ring-brand-accent dark:ring-offset-brand-dark'
                            : 'hover:scale-110',
                    ].join(' ')}
                >
                    {active && (
                        <FiCheck
                            size={12}
                            aria-hidden
                            className={c.id === null ? 'text-gray-600 dark:text-gray-200' : 'text-white'}
                        />
                    )}
                </button>
            );
        })}
    </div>
);

export default NoteColorPicker;
