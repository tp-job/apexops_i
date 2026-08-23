# Next steps — 2026-08-21

Follow-ups from the 2026-08-21 sessions. **Worked through on 2026-08-21; everything on the list is
closed.** Kept rather than deleted because two of the items turned up real defects, and the way they
turned up is the reusable part.

## Done

- [x] **Push `main` to origin.** Four commits: the three docs pages, the rebuilt homepage, the
      `dailyTodos` cleanup and the motion fixes. `main` and `origin/main` are in sync at `b544705`.
- [x] **Remove dead exports from `app/client/src/lib/dailyTodos.ts`.** Sixteen of eighteen exports had
      zero callers — the pure half of the deleted `/daily` page, stranded in three steps by
      notes-SSOT phases 1, 3.5 and 4. `DailyTodo` and `DAILY_TAG` remain; the 197-line test file went
      with the functions it covered. Three comments in `services/tasks.ts` and `app/server/src/api/tasks.ts`
      pointed at deleted symbols and were rewritten to keep the reasoning that outlives them —
      **local noon anchors notes, UTC noon anchors tasks, and the two must not be collapsed into each
      other.**
- [x] **Verify the homepage effects in a real browser.** Done through Chrome rather than the preview
      pane, because the pane reports `visibilityState: hidden` and freezes animation. **Both
      unverified items were broken.** See below.
- [x] **Decide the four open branches.** Measured rather than argued: `git merge-base --is-ancestor`
      says **all nine branches are already ancestors of `main`** — the four from that day and the five
      older sprints. Nothing to merge, nothing to PR. They are stale pointers, safe to prune whenever
      you like:

      git branch -d <branch> && git push origin --delete <branch>

      Left in place because deleting a remote branch is not something to do unasked.

## What the browser check found

Two defects that only a real browser could show, both introduced the same day and both flagged
"not verified" at the time — the flag doing exactly its job.

**1. The easing demo on `/design-system` never moved.** `x: '92%'` resolves a percentage transform
against **the element's own box**, not its container. The dot is 12px, so it travelled 11px: measured
at `translateX(11.04px)` inside a 1350px track, which reads as two dots twitching in place. Now it
measures the track with a `ResizeObserver` and animates a pixel distance. The fix is verified by the
thing the demo exists to show — at 300ms `EASE_LUX` is at **1023px** while linear is at **341px**,
and both land at 1326px of 1350px.

**2. Entrance animations never start in a document loaded hidden.** Measured in real Chrome with
`visibilityState: "hidden"`: every headline word held `opacity: 0` and `translateY(54px)`
indefinitely. A headline that starts invisible and waits for an animation can stay invisible, and
⌘-click, "open in new tab" and session restore all load a page hidden. `useEntranceEnabled` now
treats a hidden mount exactly like reduced motion — no entrance, end state rendered.

The first theory for (2) was that `filter: blur()` forced motion off the WAAPI path onto rAF.
Removing the blur changed nothing, so the cause is the hidden document, not the property being
animated. The dead end is recorded in the code because it is the guess the next person would make.

## Method note, worth keeping

The preview pane cannot verify animation — it reports `visibilityState: hidden`, and motion does not
run. Every "not verified: it animates" note in this repo's history comes from that. **Use a real
browser for anything time-based**, and prefer a measurement with a prediction attached (*"lux should
lead linear at 300ms"*) over watching it and calling it fine.

Two probe gotchas cost a cycle each and will again:

- React synthesises `onMouseLeave`/`onMouseEnter` from native `mouseout`/`mouseover`. Dispatching a
  synthetic `mouseleave` never reaches the handler — the magnet looked stuck when it was not.
- Driving a tab through the extension makes it visible, so the hidden-tab path cannot be observed and
  re-observed at will. The risk was measured before the fix; the fix's effect is reasoned, not watched.

## Still open, deliberately

- The banner on the live issue list counts new issues per **project**, not per active filter — it can
  say "1 new issue" and then show nothing after the refetch. Recorded as a known wart in
  `.agents/docs/features/realtime-issue-stream.md`.
- `reconnecting` on the issue-stream badge takes ~10s to appear after a hard kill. That is Socket.IO's
  ping timeout, not the state machine.
- `lib/dailyTodos.ts` is now a type and a constant, and its name still refers to a page that no longer
  exists. Renaming it touches three files and buys clarity only — not done, because it was not the
  task.
