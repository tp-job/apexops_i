One page per day: a written note and a todo list, both saved as you type.

## There is no save button

The day note saves itself. There is no **Save** anywhere on the page, and that is deliberate — by the time you reached for a button the text would already be on the server.

What replaces it is a status pill at the top right of the **Day note** panel. It always says something, so you never have to guess:

| It says {w-52} | It means |
| --- | --- |
| **Nothing to save yet** | The day is empty. No note has been created, because a day with no writing and no todos deliberately stores nothing. |
| **All changes saved** | Everything on screen is on the server. |
| **Unsaved changes** | You have typed since the last write. A save is already scheduled. |
| **Saving…** | The write is in flight. |
| **Saved 14:32** | The write landed, at that time. |
| **Not saved — Retry** | The write failed. Your text is still on screen and still yours — it just is not on the server yet. |

:::callout{tone=warn title="Not saved is the one to read"}
Every other state resolves on its own. **Not saved** does not: it usually means the connection dropped. Your writing is not lost — it is still in the editor — but leaving the page now would lose it. Press **Retry**, or fix the connection and keep typing; the next save picks up everything.
:::

Saves happen shortly after you stop typing, and at least every ten seconds while you keep going. Changing day, closing the tab or navigating away all force a save first.

If pressing `Ctrl`+`S` (or `Cmd`+`S`) is a reflex, it works — it forces the pending write immediately instead of opening your browser's "save this page" dialog. It is never *needed*.

## The day note is a real note

This is the part worth knowing, because it saves you doing the same work twice:

**Everything you write on this page is an ordinary note.** It is stored in the same place as everything in [Notes & Calendar](/notes), tagged `daily` and scheduled on the day you wrote it. Open Notes & Calendar, switch to **Calendar**, pick that day, and it is there — carrying a `daily` badge.

You do not need to re-enter anything in the notes manager. There is one set of notes and two ways to look at it.

## Todos

Add a todo with the field under the note, or the **Add a todo** button on an empty day.

- Tick one to complete it. The progress meter at the top of the page counts the day.
- **All / To do / Done** filters what is listed; it does not delete anything.
- **Clear done** removes the completed ones from that day.

Todos live on the same note as the writing, so a day with only todos still shows up in the calendar.

## Moving between days

The arrows beside the date move one day at a time, and **Today** jumps back. Each day is its own note; nothing carries over.

Undo history is per day on purpose — after switching days, `Ctrl`+`Z` cannot reach back and paste yesterday's text into today.

## Limits

A single day's note can hold about 256 KB of formatted text, which is far more writing than a day usually holds. Past that the save is refused and the pill says so rather than failing quietly. Large pasted images are the usual cause.
