import type { FC, ReactNode } from 'react';
import { Suspense, lazy } from 'react';
import type { JSONContent } from '@tiptap/react';
import { FiTag } from 'react-icons/fi';
import { Field, Input } from '@/components/design-system';
import NoteColorPicker from './NoteColorPicker';

/**
 * The one shape a note is written in.
 *
 * Notes used to be typed into a bare `<textarea>` on this page while the daily
 * page had a full document editor over the *same column* — so the formatting a
 * note was written with depended on which screen you happened to open, and
 * editing a rich note from Notes silently flattened it. This is that editor,
 * used for every note: the writing surface is a property of a note, not of a
 * route.
 *
 * **Presentational and fully controlled.** It owns no draft state; the page
 * holds the draft and decides what saving means — a form submit here, an
 * autosave elsewhere. Keeping the state out means the same component can serve
 * a dialog and an inline panel without either inheriting the other's lifecycle.
 */

// Lazily loaded for the same reason the daily page does it: TipTap and its
// extensions are a large chunk, and most visits to Notes only read.
const RichTextEditor = lazy(() => import('@/components/editor/RichTextEditor'));

export interface NoteDraft {
    title: string;
    /** The stored document. Null until the first keystroke, or for a legacy note. */
    doc: JSONContent | null;
    /** The plain-text projection of `doc`, persisted alongside it. */
    text: string;
    color: string | null;
    /** Comma separated, exactly as typed — parsed on save, not per keystroke. */
    tags: string;
}

export interface NoteFormProps {
    value: NoteDraft;
    onChange: (patch: Partial<NoteDraft>) => void;
    /**
     * Remount key. A document editor holds an undo stack and a selection, so
     * switching to a *different note* must not carry the previous one's history
     * — Ctrl-Z would otherwise paste the other note's text into this one.
     */
    editorKey: string;
    /** Used only when `doc` is null: the plain `content` of a pre-rich-text note. */
    plainFallback?: string;
    busy?: boolean;
    placeholder?: string;
    /** Shown under the editor — where this note is about to land. */
    footer?: ReactNode;
    autoFocus?: boolean;
}

const EditorFallback: FC = () => (
    <div className="h-56 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" aria-hidden />
);

const NoteForm: FC<NoteFormProps> = ({
    value,
    onChange,
    editorKey,
    plainFallback,
    busy,
    placeholder = 'What is this note about?',
    footer,
    autoFocus,
}) => (
    <div className="flex flex-col gap-4">
        <Field label="Title">
            <Input
                value={value.title}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="What's this about?"
                disabled={busy}
                autoFocus={autoFocus}
            />
        </Field>

        <Suspense fallback={<EditorFallback />}>
            <RichTextEditor
                key={editorKey}
                doc={value.doc}
                plainFallback={plainFallback}
                editable={!busy}
                placeholder={placeholder}
                minHeightClass="min-h-[14rem]"
                onChange={(doc, text) => onChange({ doc, text })}
            />
        </Suspense>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
            {/* Not wrapped in `Field`: that renders a `<label>` bound to one
                control, and this is a group of six. The radiogroup carries its
                own accessible name. */}
            <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Colour</span>
                <NoteColorPicker
                    value={value.color}
                    onChange={(color) => onChange({ color })}
                    disabled={busy}
                />
            </div>

            <Field
                label="Categories"
                hint="Comma separated. These are the tags you can filter by."
                className="min-w-[14rem] flex-1"
            >
                <Input
                    value={value.tags}
                    onChange={(e) => onChange({ tags: e.target.value })}
                    placeholder="research, roadmap"
                    icon={<FiTag size={14} />}
                    disabled={busy}
                />
            </Field>
        </div>

        {footer}
    </div>
);

export default NoteForm;
