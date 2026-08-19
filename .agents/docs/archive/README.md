# Archive — historical, not current

Everything in this folder described the system accurately **at some point** and no longer does.
It is kept because it explains *why* things are the way they are, which is often the expensive
thing to reconstruct. It is not kept as a description of how ApexOps works today.

**Do not treat anything here as a specification.** If a file here disagrees with
[`../product/overview.md`](../product/overview.md) or with the code, the file here is wrong.

Archived 2026-07-27. Each entry says what superseded it and how that was verified.

| File | Why it was archived |
|---|---|
| [`test-results-2025-12.md`](test-results-2025-12.md) | A point-in-time test run dated **December 2025**, driven by `test-apis.js` — a script that no longer exists in the repo (verified). Test results are a build artifact, not documentation; the living equivalent is the per-gate check runs recorded in each feature spec. |
| [`api-structure.md`](api-structure.md) | A work log of an API reorganization ("all APIs have been reorganized into separate files"), not a reference. The reorganization it announces is now simply how the code is laid out. Superseded by [`../architecture/api-reference.md`](../architecture/api-reference.md). |
| [`api-summary.md`](api-summary.md) | Thai-language companion to the above, same content, same reason. Three overlapping API documents totalling ~1,200 lines was the single largest source of drift in this folder — one canonical reference now replaces them. |
| [`console-monitor.md`](console-monitor.md) | Documents the native WebSocket relay on port **8082**, which is being **deleted** in G2 of the workspaces sprint (decision D6 in [`../features/project-workspaces-and-sdk.md`](../features/project-workspaces-and-sdk.md)) because it is unauthenticated and leaks every monitored app's logs to every listener. Documentation for a component scheduled for removal. |
| [`console-monitor-guide-th.md`](console-monitor-guide-th.md) | Thai-language duplicate of the same system, same reason. |
| [`note-editor-execcommand.md`](note-editor-execcommand.md) | Describes a note toolbar built on `document.execCommand()`. The client now uses **Tiptap v3.20** (`@tiptap/*` in `app/client/package.json`), and `execCommand` appears **nowhere** in `app/client/src` (verified). The document describes an implementation that no longer exists. |
| [`report-note-system-zh.md`](report-note-system-zh.md) | Chinese-language report on the Word-style note editor, describing the same superseded `execCommand` era. Also the only document in the set written in a third language, which made it unfindable in practice. |
| [`ui-reset-2026-07-24.md`](ui-reset-2026-07-24.md) | Still **useful history** — it records the day every page except `/design-system` was deleted, which explains the shape of the current rebuild. Archived rather than deleted precisely because that context is hard to reconstruct. |
| [`sprint-1-thin-slice.md`](sprint-1-thin-slice.md) | Gate artifact for a **completed** sprint. Closed sprints belong in history, not in `planning/`, where they compete for attention with the sprint that is actually open. |
| [`daily-note-rich-editor.md`](daily-note-rich-editor.md) | Specced and built the `/daily` page's rich-text workspace. `/daily` was **retired 2026-08-19** (`../features/notes-ssot-blueprint.md` §8, phase 3.5) — its two jobs, writing a day's note and adding tasks, moved into `/notes` (via the new `NoteForm`/`NoteColorPicker`) and `/tasks` (via the new `TaskComposer`). The editor component itself (`RichTextEditor.tsx`) was not deleted, only relocated — this document's design reasoning for it still holds, only the page it names is gone. |

## If you need something from here

Prefer re-deriving it from the code over copying it forward. Every file in this folder became wrong
the same way: it was accurate when written, nobody re-checked it, and it kept being cited.
