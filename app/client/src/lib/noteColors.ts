/**
 * The colour palette a note can be tagged with.
 *
 * Stored as the **name**, not a hex value — `Note.color` already holds bare
 * names in existing rows (`'red'`), and a column carrying both idioms could
 * never be grouped or filtered reliably. It also keeps theming in the client,
 * where the light/dark pair for each hue lives.
 *
 * Six entries including "none" is a deliberate ceiling: this is a colour
 * *label*, not a spectrum, and a picker stops being scannable past about ten
 * swatches.
 *
 * **This lives in `lib/`, not beside one page.** Colour is set in three places —
 * the note form, the edit dialog and the card's right-click menu — and the
 * moment two of them carry their own list, a note coloured in one place renders
 * grey in another.
 */

export interface NoteColor {
    /** Value persisted to `Note.color`. `null` for the uncoloured default. */
    id: string | null;
    label: string;
    /** Solid swatch, for the picker and the card's dot. */
    dot: string;
    /** Tinted background + readable text, for chips on the calendar. */
    chip: string;
}

export const NOTE_COLORS: NoteColor[] = [
    {
        id: null,
        label: 'No colour',
        dot: 'bg-gray-300 dark:bg-gray-600',
        chip: 'bg-white/70 text-brand-dark dark:bg-white/10 dark:text-white',
    },
    {
        id: 'red',
        label: 'Red',
        dot: 'bg-red-500',
        chip: 'bg-red-500/15 text-red-700 dark:bg-red-500/25 dark:text-red-200',
    },
    {
        id: 'amber',
        label: 'Amber',
        dot: 'bg-amber-500',
        chip: 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-200',
    },
    {
        id: 'emerald',
        label: 'Emerald',
        dot: 'bg-emerald-500',
        chip: 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-200',
    },
    {
        id: 'sky',
        label: 'Sky',
        dot: 'bg-sky-500',
        chip: 'bg-sky-500/15 text-sky-700 dark:bg-sky-500/25 dark:text-sky-200',
    },
    {
        id: 'violet',
        label: 'Violet',
        dot: 'bg-violet-500',
        chip: 'bg-violet-500/15 text-violet-700 dark:bg-violet-500/25 dark:text-violet-200',
    },
];

/** Unknown colours from older rows fall back to the default rather than vanishing. */
export const colorFor = (color: string | null | undefined): NoteColor =>
    NOTE_COLORS.find((c) => c.id === (color ?? null)) ?? NOTE_COLORS[0];
