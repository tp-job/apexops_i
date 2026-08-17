import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import EditorToolbar from './EditorToolbar';
import {
    isEmptyRichDoc,
    plainTextToRichDoc,
    richDocKey,
    richDocToPlainText,
} from '@/lib/richText';

/**
 * The document editor — a Word-shaped writing surface over `Note.contentRich`.
 *
 * **Why TipTap and not `contentEditable` + `document.execCommand`.** execCommand
 * is deprecated, and more to the point it produces whatever HTML the browser
 * feels like: the same Ctrl-B gives `<b>` in one engine and `<span style>` in
 * another, and there is no schema, so pasted content arrives intact including
 * whatever was in it. TipTap parses into a *schema* — anything the extension
 * list does not declare is dropped on the way in. That is also the security
 * story: nothing here renders a stored string as HTML, so there is no
 * `dangerouslySetInnerHTML` in this component and none may be added, the same
 * rule `components/docs/DocsMarkdown.tsx` carries.
 *
 * **The document, not HTML, is the stored value.** `onChange` hands back
 * ProseMirror JSON plus its plain-text projection; the caller persists the first
 * to `contentRich` and the second to `content`. See `lib/richText.ts` for why
 * both.
 *
 * **Content is pushed in, never re-mounted.** `useEditor` builds the editor once;
 * a changing `doc` prop is applied with `setContent`, guarded so the editor is
 * not reset out from under someone mid-keystroke — the guard compares against
 * what this component last *emitted*, so an autosave echo is a no-op while a
 * genuine day change is not.
 */

export interface RichTextEditorProps {
    /** The stored document. Null for a note written before rich text existed. */
    doc: JSONContent | null;
    /** Used only when `doc` is null — the legacy plain `content` of the same note. */
    plainFallback?: string;
    editable?: boolean;
    placeholder?: string;
    /** Fires on every change, debounced by the caller if it wants to save. */
    onChange: (doc: JSONContent, plainText: string) => void;
    /** Fires when focus leaves the editor — the caller's cue to flush a save. */
    onBlur?: () => void;
    /** Minimum body height, e.g. `min-h-[18rem]`. */
    minHeightClass?: string;
    /**
     * `reader` renders the same document with no toolbar, no input shell and no
     * caret — a saved entry, not a field waiting for input.
     *
     * It is a variant of this component rather than a separate `NoteReader`
     * because the alternative is duplicating the extension list and the whole
     * `PROSE` block, and the moment those two copies drift a saved note renders
     * differently from the note being written. There is also no
     * `generateHTML` + `dangerouslySetInnerHTML` shortcut available here: that
     * rule holds for stored documents exactly as it does in `DocsMarkdown`.
     */
    variant?: 'editor' | 'reader';
}

/** The extension set. Exactly the marks the toolbar exposes — no more. */
const buildExtensions = () => [
    StarterKit.configure({
        // The link mark ships inside StarterKit in v3. Clicks are inert inside
        // the editor: in a writing surface a click means "put the caret here",
        // and navigating away mid-sentence loses the sentence.
        link: {
            openOnClick: false,
            autolink: true,
            protocols: ['http', 'https', 'mailto'],
            HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
        },
    }),
    // Color, font family and font size all ride on the same `textStyle` mark.
    // Background colour and line height are off: they are not on the toolbar, and
    // an enabled mark with no control is a way for pasted content to smuggle
    // styling nobody can see or remove.
    TextStyleKit.configure({ backgroundColor: false, lineHeight: false }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Image.configure({
        inline: false,
        // `false` — a data URI would put the whole image inside the note row and
        // one photo would exhaust the 256 KB document budget. `sanitizeImageSrc`
        // enforces the same rule at the point of insertion.
        allowBase64: false,
    }),
];

/**
 * Prose styles for the editor body.
 *
 * Written as Tailwind arbitrary-descendant variants rather than a global
 * stylesheet so the rules cannot leak onto anything else on the page, and so a
 * reader of this file can see exactly what a document looks like.
 */
const PROSE = [
    // Plain `outline-none` loses to the app-wide `:focus-visible { outline: ... }`
    // rule in `styles/globals.css` — same specificity (0,1,0), and that rule is
    // imported after Tailwind's utilities, so it wins the cascade and draws a
    // solid black (dark: accent) rectangle around the contenteditable body the
    // moment it's focused. Targeting `:focus-visible` directly raises this to
    // (0,2,0), which beats it regardless of import order. The editor still shows
    // its own focus state — the toolbar's sticky border — so nothing is lost by
    // suppressing the generic one here.
    'outline-none focus:outline-none focus-visible:outline-none',
    '[&_p]:my-2 [&_p]:leading-relaxed',
    '[&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:font-heading',
    '[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:font-heading',
    '[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:font-heading',
    '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6',
    '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6',
    '[&_li]:my-0.5',
    '[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:text-gray-600',
    'dark:[&_blockquote]:border-white/20 dark:[&_blockquote]:text-gray-400',
    '[&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_code]:font-mono',
    'dark:[&_code]:bg-white/10',
    '[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-black/5 [&_pre]:p-3 [&_pre]:text-sm',
    'dark:[&_pre]:bg-white/10',
    '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
    '[&_hr]:my-5 [&_hr]:border-gray-200 dark:[&_hr]:border-white/10',
    '[&_a]:underline [&_a]:underline-offset-2 [&_a]:text-global-blue',
    '[&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-xl',
    // The caret must stay visible when a run carries a colour mark.
    'caret-brand-dark dark:caret-white',
].join(' ');

const RichTextEditor: FC<RichTextEditorProps> = ({
    doc,
    plainFallback = '',
    editable = true,
    placeholder = 'Start writing…',
    onChange,
    onBlur,
    minHeightClass = 'min-h-[16rem]',
    variant = 'editor',
}) => {
    const [fullscreen, setFullscreen] = useState(false);

    const isReader = variant === 'reader';
    /** A reader is never editable, whatever the caller passed. */
    const canEdit = editable && !isReader;

    /** The toolbar + body together — used to tell "left the document" from "reached for the toolbar". */
    const shellRef = useRef<HTMLDivElement>(null);

    /**
     * A fingerprint of the last document this component emitted.
     *
     * The parent round-trips saves, so `doc` comes back after every write — and
     * comes back *key-reordered*, because it went through a Postgres `jsonb`
     * column. `richDocKey` is order-independent for exactly that reason; a plain
     * stringify here would fail to recognise the echo and drop the caret to the
     * top of the document every 1.5 seconds.
     */
    const lastEmitted = useRef<string | null>(null);

    // Callbacks are read through refs so the editor's own handlers never need to
    // be rebuilt — recreating them re-registers ProseMirror plugins and costs the
    // selection.
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const onBlurRef = useRef(onBlur);
    onBlurRef.current = onBlur;

    const initial = useMemo<JSONContent>(
        () => doc ?? (plainFallback ? (plainTextToRichDoc(plainFallback) as JSONContent) : { type: 'doc', content: [{ type: 'paragraph' }] }),
        // Deliberately the mount-time value only: later changes go through the
        // `setContent` effect below, which knows how to guard the caret.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const editor = useEditor({
        /**
         * **Required under React StrictMode**, which double-mounts in dev:
         * mount → unmount → remount. Without this, TipTap builds the editor
         * during the first render pass, StrictMode's simulated unmount destroys
         * it, and the effects below then run against a destroyed instance.
         *
         * The failure was not a null check anyone forgot. `useEditor` returns a
         * manager object that stays **truthy** after the underlying editor is
         * destroyed, so `if (!editor) return` passed and the very next line threw
         * `Cannot read properties of null (reading 'commands')` — straight into
         * the error boundary on a cold load of `/daily`.
         */
        immediatelyRender: false,
        extensions: buildExtensions(),
        content: initial,
        editable: canEdit,
        editorProps: {
            attributes: {
                class: `${PROSE} ${isReader ? '' : minHeightClass}`,
                // A reader is not a textbox. Announcing one would send a screen
                // reader looking for a caret that does not exist.
                ...(isReader
                    ? { 'aria-label': 'Saved note' }
                    : { role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Note document' }),
            },
        },
        onUpdate: ({ editor: ed }) => {
            const next = ed.getJSON();
            lastEmitted.current = richDocKey(next);
            onChangeRef.current(next, richDocToPlainText(next));
        },
        // Blur means "the user left the document", which is a cue to flush the
        // save. Reaching for the toolbar is not that.
        //
        // The buttons prevent their own `mousedown` and so never blur at all,
        // but a native `<select>` cannot — swallowing that event is what opens
        // the dropdown. So the shell is checked instead: focus moving to
        // anything inside this component is still inside the document.
        onBlur: ({ event }) => {
            const next = event.relatedTarget;
            if (next instanceof Node && shellRef.current?.contains(next)) return;
            onBlurRef.current?.();
        },
    });

    // A `doc` that did not come from this editor — a day change, or a refetch that
    // found different content — is pushed in. `emitUpdate: false` keeps it from
    // bouncing straight back out as a change and triggering a save of what was
    // just loaded.
    useEffect(() => {
        // `isDestroyed` as well as null: see the note on `immediatelyRender`.
        // A destroyed editor is still truthy, so the null check alone is not a
        // guard — it is the appearance of one.
        if (!editor || editor.isDestroyed) return;
        if (doc && richDocKey(doc) === lastEmitted.current) return;

        const next = doc ?? (plainFallback ? (plainTextToRichDoc(plainFallback) as JSONContent) : { type: 'doc', content: [{ type: 'paragraph' }] });
        if (richDocKey(editor.getJSON()) === richDocKey(next)) return;

        lastEmitted.current = richDocKey(next);
        editor.commands.setContent(next, { emitUpdate: false });
    }, [editor, doc, plainFallback]);

    // Read-only has to reach the editor itself. A greyed-out toolbar over a body
    // that still accepts keystrokes is a lie about whether the work is saved.
    //
    // **`false` is not optional.** `setEditable(x)` emits an `update` event by
    // default (see `Editor.setEditable` in `@tiptap/core`), which lands in
    // `onUpdate` above and reports a document change that never happened — the
    // editor would mark itself dirty and schedule a save every time it was
    // toggled. Paired with an `editable` that tracked the save state, that was a
    // loop: save → toggle → "changed" → save.
    //
    // The identity check matters for the same reason: React re-runs this effect
    // whenever `editor` is re-read, and a no-op toggle would still emit.
    useEffect(() => {
        if (!editor || editor.isDestroyed || editor.isEditable === canEdit) return;
        editor.setEditable(canEdit, false);
    }, [editor, canEdit]);

    // ESC leaves fullscreen. Registered on the window because focus is inside
    // ProseMirror, which handles its own keymap first.
    useEffect(() => {
        if (!fullscreen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setFullscreen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [fullscreen]);

    const empty = !editor || (editor.isEmpty && isEmptyRichDoc(editor.getJSON()));

    const shell = useCallback(
        (children: React.ReactNode) =>
            fullscreen ? (
                <div className="fixed inset-0 z-50 flex flex-col gap-3 overflow-auto bg-light-bg p-4 dark:bg-dark-bg sm:p-8">
                    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col">{children}</div>
                </div>
            ) : (
                <>{children}</>
            ),
        [fullscreen],
    );

    // A saved entry is prose on the card, not a field. No border, no fill and no
    // padding of its own — the card it sits in already provides those, and a
    // second inset frame is what makes a read-only editor look broken rather
    // than finished.
    if (isReader) {
        return (
            <div ref={shellRef}>
                <EditorContent editor={editor} className="text-sm text-brand-dark dark:text-white" />
            </div>
        );
    }

    return shell(
        <div
            ref={shellRef}
            className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white/70 dark:border-white/10 dark:bg-white/5"
        >
            <EditorToolbar
                editor={editor as Editor | null}
                disabled={!canEdit}
                fullscreen={fullscreen}
                onToggleFullscreen={() => setFullscreen((v) => !v)}
            />

            <div className="relative flex-1 overflow-y-auto px-4 py-3">
                {/* The placeholder is a sibling, not a `::before` on the first
                    paragraph: the pseudo-element trick attaches to a node that
                    text alignment and font marks also style, so it inherits
                    formatting the user set for content that does not exist. */}
                {empty && (
                    <p className="pointer-events-none absolute left-4 top-5 select-none text-sm text-gray-400 dark:text-gray-500">
                        {placeholder}
                    </p>
                )}
                <EditorContent editor={editor} className="text-sm text-brand-dark dark:text-white" />
            </div>
        </div>,
    );
};

export default RichTextEditor;
