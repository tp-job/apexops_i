# Daily note — document workspace (rich text editor)

> **Archived 2026-08-19.** `/daily` was retired the same day
> (`notes-ssot-blueprint.md` §8, phase 3.5) — `DailyNote.tsx` and
> `useDailyTodos.ts` no longer exist. **The editor this document specifies did
> not go away with the page.** `components/editor/RichTextEditor.tsx` — the
> exact component built here, unchanged — is now shared by `/notes` through
> `components/notes/NoteForm.tsx`, used for both creating and editing a note.
> Everything below about the editor itself (storage split, no
> `dangerouslySetInnerHTML`, autosave debounce, 256 KB cap, URL-only images) is
> still accurate for that shared component. Only the *page* it names — routes,
> file paths under `pages/DailyNote.tsx`, and the day-specific autosave wiring
> in `useDailyTodos.ts` — is gone. Read this for the editor's design reasoning;
> read `notes-ssot-blueprint.md` for where its capabilities live now.

**Status:** built 2026-08-14; verified below the UI, **not yet verified in the
browser** (see §7). **Surface (retired 2026-08-19):** was `/daily`
(`app/client/src/pages/DailyNote.tsx`).

The ask: *"a workspace the same as MS Word has"* on the daily note, shaped like
the reference screenshot (image 2) — a document header with actions, a labelled
section, a formatting toolbar, and a scrollable editor body.

---

## 1. What exists today (extracted, not invented)

| Thing | Where | Contract |
| --- | --- | --- |
| Day body | [DailyNote.tsx:327](../../../app/client/src/pages/DailyNote.tsx#L327) | a single-line `<Input>`, saved **on blur** |
| Persistence | [useDailyTodos.ts](../../../app/client/src/hooks/useDailyTodos.ts) | optimistic write, note created lazily on first content |
| Storage | `Note.content` — `String?` ([schema.prisma:108](../../../database/prisma/schema.prisma#L108)) | plain text, no length bound |
| Validation | [note.schema.ts:16,33](../../../app/server/src/schemas/note.schema.ts) | `z.string().optional()` — no max, no sanitiser |
| Day ↔ note | [lib/dailyTodos.ts](../../../app/client/src/lib/dailyTodos.ts) | `type: 'list'`, tag `daily`, `scheduledFor` = local noon |

**Readers of `Note.content` that assume plain text** — these are the constraint
that decides the storage format:

- `NotesCalendar.tsx:70` — search haystack (`title + content + tags`)
- `NotesCalendar.tsx:137`, `:808` — card preview, rendered as text
- `NotesCalendar.tsx:224` — the plain `<textarea>` note editor
- `components/ui/note/utils/index.ts:62` — note filter

**Already in the tree and wired to nothing:** `@tiptap/react` v3 with
`starter-kit`, `extension-color`, `-highlight`, `-image`, `-link`, `-table`,
`-table-cell`, `-table-header`, `-table-row`, `-text-align`, `-text-style`,
`-underline`. `grep -rl "@tiptap" app/client/src` returns **zero files**. The
dependency set is an exact match for the toolbar in image 2 — the editor was
budgeted for and never built. No new dependency is needed.

---

## 2. Image 2, read as requirements

| Element in the screenshot | Requirement | Verdict for `/daily` |
| --- | --- | --- |
| Breadcrumb `Books › Author › Title` | document context path | **drop** — `/daily` has one document per day; the date header already is the context |
| `Save as draft` / `Publish changes` | draft→published lifecycle | **drop** — `Note` has no draft state, and it contradicts the page's autosave model. Replace with a save-state indicator ("Saved 14:22" / "Saving…") |
| Section label + helper text + `⋮` | labelled editor region | **keep** — "Day note", with the kebab carrying clear-formatting / word count |
| Font family, font size | `TextStyle` + FontFamily/FontSize marks | **keep**, constrained to the design system's font stack + a fixed size scale — not a free px field |
| **B** / *I* / <u>U</u> | Bold, Italic, Underline | **keep** (`starter-kit` + `extension-underline`) |
| Colour swatch | `extension-color` | **keep**, swatches from design tokens only — no hex picker |
| Align left / centre / right | `extension-text-align` | **keep** |
| Link | `extension-link` | **keep**, href through the existing `sanitizeHref` in [lib/docsMarkdown.ts:77](../../../app/client/src/lib/docsMarkdown.ts#L77) |
| Image | `extension-image` | **keep, URL-only** — see the open question in §5 |
| Expand ⤢ | fullscreen / distraction-free | **keep** |
| Scrollable body with fixed toolbar | sticky toolbar, `max-h` body | **keep** |

Not in image 2 and **out of scope**: tables, comments, track changes,
page/print layout, headers & footers, styles gallery, real-time collaboration,
export to `.docx`. "Same as MS Word" is not a scope — this list is.

---

## 3. The decisions that make the code right rather than plausible

**Storage — the one that matters.** Do **not** put HTML into `Note.content`.
Four existing readers render it as text; tags would leak into search results and
card previews the day this ships.

> Add `Note.contentRich Json?` (`@map("content_rich")`) holding the TipTap
> document. On every save, write **both**: `contentRich` = the document,
> `content` = its plain-text projection. Existing readers keep working untouched;
> the editor prefers `contentRich` and falls back to `content` for every note
> written before this feature.

One migration, zero breakage, and search keeps indexing the words rather than
the markup.

**Rendering — no `dangerouslySetInnerHTML`, anywhere.** Storing the document as
ProseMirror JSON rather than an HTML string removes the injection surface
instead of guarding it: TipTap builds DOM nodes, it does not set innerHTML.
Read-only display elsewhere uses an `editable: false` editor, never a string
render. This extends the rule already written into
[DocsMarkdown.tsx:9](../../../app/client/src/components/docs/DocsMarkdown.tsx#L9).

**Saving.** Blur-to-save is wrong for a document — a browser crash mid-paragraph
loses it. Debounced autosave, 1.5 s idle or 10 s elapsed, whichever first; flush
on blur, on day change, and on `beforeunload`. The header shows the real state
and never claims a save that did not return.

**Bounds.** `content` is currently unbounded on the wire. A rich document plus
pasted images is how a request body reaches megabytes. Cap `contentRich` at
**256 KB** serialised in `note.schema.ts`, with a client-side guard that refuses
the paste before the request rather than after the 413.

**Read-only.** `DailyNote` already goes read-only when the day fails to load
(`readOnly = !!error`). The editor must honour it via `editor.setEditable(false)`
— a disabled toolbar over a still-typable body is a lie.

**Paste from Word.** The literal use case. Word's clipboard HTML carries
`mso-*` styles and font tags; TipTap's schema drops unknown marks, but the
allowed-mark list must be pinned deliberately or pasted content arrives with
sizes and colours nobody chose.

---

## 4. Done means

1. Type a formatted paragraph on `/daily`, reload → identical formatting.
2. The same note's card on `/notes` shows readable plain text, **no tags**.
3. Search on `/notes` matches a word that only exists inside a formatted run.
4. A note written before this ships opens with its text intact and no data loss.
5. Toolbar state reflects the cursor (bold button active inside bold text).
6. Every toolbar action reachable by keyboard; toolbar buttons carry `aria-pressed`.
7. Kill the tab mid-sentence, reopen → at most the last 1.5 s is gone.
8. Light and dark both correct; no hex outside the token layer.
9. A 300 KB paste is refused with a message, not a 500.
10. `npm run build` in `app/client` is clean (`tsc --noEmit` is not sufficient —
    see [client-build-erasable-syntax](../../../../../Users/phuti/.claude/projects/E--ApexCore-ApexDev-PERN-apexops-i/memory/client-build-erasable-syntax.md)).

---

## 5. Images — settled: URL-only

The toolbar has an image button; the repo has no upload endpoint and no object
storage. v1 takes an `http`/`https` address and an alt description.
`sanitizeImageSrc` refuses everything else — including `data:`, which a browser
would happily render and which is how one photo would consume the entire 256 KB
document budget. `Image.configure({ allowBase64: false })` enforces the same rule
on the paste path.

A real upload endpoint (storage, size/type validation, auth, cleanup on note
delete) remains its own feature. Shipping URL-only does not foreclose it.

---

## 6. Build order

| # | Slice | Proof |
| --- | --- | --- |
| 1 | Migration `contentRich` + zod cap + dual-write in the notes API | round-trip test; existing note rows unchanged |
| 2 | `components/editor/RichTextEditor.tsx` — TipTap, tokens, read-only mode | renders, formats, honours `editable` |
| 3 | Toolbar exactly per §2, from design-system primitives | every control drives the editor; `aria-pressed` correct |
| 4 | Wire into `useDailyTodos` — debounced autosave + save-state | criteria 1, 4, 7 |
| 5 | Plain-text projection + `/notes` regression | criteria 2, 3 |
| 6 | Fullscreen, paste hygiene, dark mode, build | criteria 5, 6, 8, 9, 10 |

Slices 1 and 2 are independent; everything after 4 depends on both.

> Windows: stop the `:3000` dev server before `prisma generate`, or it EPERMs.

---

## 7. What shipped, and what is actually proven

**Files.** `database/prisma/schema.prisma` (`contentRich`),
`app/server/src/schemas/note.schema.ts` (+ `.test.ts`), `app/server/src/api/notes.ts`,
`app/client/src/lib/richText.ts` (+ `.test.ts`),
`app/client/src/components/editor/{RichTextEditor,EditorToolbar}.tsx`,
`app/client/src/hooks/useDailyTodos.ts`, `app/client/src/pages/DailyNote.tsx`,
`app/client/src/pages/NotesCalendar.tsx`, the two note util files.

**Verified by running it:**

- `prisma db push` — `notes.content_rich` exists in `apexops_db`.
- Round-trip through the real column: a bold document goes in and comes back
  with the same content; `content` holds `"Ship the editor"` with no markup;
  `Prisma.DbNull` clears the column; the scratch row was deleted.
- 96 client tests, 73 server tests, `app/client` `npm run build`, `app/server`
  `tsc --noEmit` — all clean.
- Bundle: the editor is a separate 409 kB chunk; the main bundle stayed at 839 kB.

**Found by running it, and fixed:**

- `listItem`/`blockquote` were flushing a line *and* their child paragraph, so
  every bullet gained a blank line in card previews.
- Postgres `jsonb` reorders object keys (`{type,text}` in, `{text,type}` out).
  The editor's echo guard compared documents with `JSON.stringify`, so every
  autosave would have come back looking like a foreign document and reset the
  caret to the top. `richDocKey` canonicalises key order; both defects have
  tests.

**Reported by the user, and fixed (toolbar dropdowns were dead).** Three coupled
mistakes, in the order they fired:

1. `editable` was bound to `busy`, which includes `saving` — so an autosave
   disabled the editor for the length of the round trip, dropping focus and the
   selection every 1.5 s. Now bound to `readOnly` only. **An autosave must never
   disable the thing being saved.**
2. `Editor.setEditable(editable)` emits an `update` event unless told not to
   (`emitUpdate` defaults true, see `@tiptap/core`). That fake edit landed in
   `onUpdate` → marked the document dirty → scheduled a save → toggled `editable`
   → emitted again. A permanent save loop, which is what "the system reloads"
   looked like. Now `setEditable(editable, false)`, guarded by an identity check.
3. Only the *dropdowns* failed, and that is the tell that confirms the rest: the
   toolbar buttons prevent their own `mousedown` so they never blur the editor,
   while a native `<select>` cannot — the mousedown is what opens it. The blur
   fired the flush that started the loop. `onBlur` now ignores focus moving
   anywhere inside the editor shell, so touching the toolbar is no longer treated
   as leaving the document.

**Not verified — the honest gap.** Nothing in the browser. The dev session at
`localhost:5173` is logged out and signing in is not something to do on the
user's behalf. Unproven until someone drives it: criteria 1, 5, 6, 7 and 8 —
formatting survives a reload, toolbar state tracks the cursor, keyboard reach,
crash recovery, and dark mode.

**Known behaviour worth deciding on later.** Editing a rich note through the
plain dialog on `/notes` *drops* its formatting (keeping the text). The dialog
says so before saving. The alternative — leaving `contentRich` in place — would
make the two columns disagree, which is worse.
