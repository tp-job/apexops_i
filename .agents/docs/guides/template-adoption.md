# Template Adoption Map — `.agents/template/*.html` → ApexOps

> Status: proposal / decision record. Owner: frontend.
> Governing spec: [`.agents/design-system/design.md`](../../design-system/design.md) (Luxe v2).
> Reference implementation in code: `app/client/src/pages/Invoices.tsx`, live at `/design-system`.

---

## 1. The decision

The 9 files in `.agents/template/` are **layout references, not a skin.** They are standalone
Tailwind-CDN mockups lifted from nine unrelated products (Salesforce, HubSpot, Stripe-ish
invoicing, a docs site, two "clone" dashboards). They do not share a palette, a type scale, a
radius scale, or an icon strategy with each other — let alone with ApexOps.

Adopting them visually would replace one coherent system with nine incoherent ones. So:

- ✅ **Harvest**: information architecture, screen composition, density, interaction affordances,
  the specific widgets we're missing.
- ❌ **Reject**: every colour, font stack, shadow, radius, icon set and CSS mechanism in the files.
  Those come from Luxe tokens, always.

One template — `ai.html` (Invoice Management Dashboard) — is already the *origin* of the current
design system (`design.md`: "Extracted from the Invoice Management Dashboard codebase"). Treat it
as **already adopted**; it is the proof that the harvest-not-skin approach works.

---

## 2. Compliance audit of the source files (why they can't be pasted in)

Measured across all 9 files:

| Violation | Files affected | Conflicts with |
|---|---|---|
| `<script src="cdn.tailwindcss.com">` runtime JIT | 9 / 9 | Vite + Tailwind v4 build; CDN build is dev-only and unsupported in prod |
| Hardcoded hex (`#ccff33`, `#1e1e1e`, …) — 250 occurrences total | 9 / 9 | "never inline hex — use brand tokens"; breaks light/dark switching entirely |
| Font Awesome icon **font** via CDN | aa, aj, zd | "never icon fonts in new code" — must be `react-icons` (`Fi`) |
| Inline `style="…"` attributes (43 total) | 8 / 9 | Not theme-aware, not overridable, invisible to the DS audit |
| `body { overflow: hidden }` + `h-screen` | aa, ac, ai, aj | App shell is owned by `layouts/Layout.tsx`; page-level viewport locking breaks scroll on <1280px |
| Neon-green `#ccff33` accent (aa.html) | aa | Near-miss of brand lime `#C5F43A` — a second, wrong accent. Highest-risk contamination. |
| No dark/light duality — each file is hardcoded to one mode | 9 / 9 | `.dark` variant + token pairs in `index.css` |

**The `aa.html` trap.** Its `#ccff33` is visually close enough to `--color-brand-accent: #C5F43A`
that a copy-paste will pass casual review and then quietly ship two accents. If anything from
`aa.html` is adopted, the hex must be swapped at the moment of extraction, not later.

---

## 3. Mapping: template → route → what to take

| Template | Title | Target route / file | Harvest | Do **not** take |
|---|---|---|---|---|
| `ai.html` | Invoice Management | `/invoices` — **done** | — (already the DS origin) | — |
| `zb.html` | Financial Dashboard | `/invoices` detail view | Invoice **activity timeline** (Created → Viewed → Reminder sent → Internal note), attachment empty-state, payment-score meter | 61 hex values; its card chrome |
| `aj.html` (now `daily-note-todo-template.html`) | Salesforce Task Mgmt | `/bug-tracker`; `/daily` — **done** | Task-schedule board, assignee-avatar rows, "Pending Approval" lane, employees-involved rail | FA icon font; Salesforce blue |
| `ac.html` | Create Task (form) | `/bug-tracker` create/edit modal | **Stepped form IA**: Task Info → Assignment → Subtasks → Schedule → Completion, with a live preview pane; removable tag pills; removable subtask rows | 20 inline styles; its `onclick` handlers |
| `zc.html` | Timeline Dashboard | `/optimization-calendar`, `/calendar` | Horizontal month-spanning **Gantt/timeline** track, "Show done" filter toggle, cross-month continuity | Its palette |
| `zd.html` | CRM Dashboard | `/chat`, `/ai-chat` contact rail | Contact card + deal-stage stepper (Discovery → Negotiation → Proposal), pros/cons split panel, tabbed record (Summary/Analytics/Details/Files/History) | FA icon font |
| `af.html` | HubSpot Productivity | `/dashboard` | **Chart-type switcher** (Column/Scatter/Heatmap/Boxplot/Waterfall) with "max 2 overlaps" constraint, optional-parameters drawer, division filters | HubSpot orange |
| `za.html` | Luminar Docs | `/about/docs`, `/about/docs/:docId` | 3-pane docs shell: section nav → page nav → on-page ToC; Get Started / Products / Tools grouping | Its typography |
| `aa.html` | Neon Dark Dashboard | `/dashboard` (KPI band only) | KPI-card + sparkline density, "Top performing" leaderboard, channel-breakdown list with totals | **Everything visual** — esp. `#ccff33` |

---

## 4. Adoption procedure (per screen)

1. **Read the mockup, write the IA.** List the regions and what each answers for the user. Do not
   open the CSS yet.
2. **Map every region to an existing primitive** from `@/components/design-system`
   (`Surface` · `StatTile` · `AnimatedNumber` · `Meter` · `AccentButton` · `Badge` · `PageHeader`).
   Anything with no mapping is a **new primitive proposal** — it goes into
   `components/design-system/` and `/design-system` first, then into the page. Never a one-off.
3. **Build with tokens only.** Zero hex, zero inline `style`, icons from `react-icons/fi`, motion
   from `@/lib/motion` (`fadeUp` / `scaleIn` / `stagger` / `hoverLift` / `pressable`).
4. **Enforce the accent budget.** One `ds-glow` / accent element per view — active state *or* CTA.
   Mockups routinely use 5+; that is the single most common way an adoption goes off-brand.
5. **Verify both modes.** Every template is single-mode; the ported screen must be checked in
   light and dark, and at the 1280px breakpoint the DS targets.
6. **Update `/design-system`** if step 2 produced a new primitive.

---

## 5. Gaps the templates expose — the six shared primitives ✅ built

These recur across several mockups and had no equivalent — they are the real value in this folder.
All six now live in `app/client/src/components/design-system/`, are exported from that barrel, and
are demonstrated in the **Composition** section of `/design-system`.

| Primitive | Seen in | Why it matters |
|---|---|---|
| `Timeline` | zb, zd | Vertical activity feed. Invoice activity, bug history, note revisions — previously three ad-hoc lists |
| `GanttTrack` | zc | Horizontal month-spanning schedule. `/optimization-calendar` had no long-horizon view |
| `Stepper` | ac, zd | Linear stage progress. Task creation and deal/bug pipelines |
| `AvatarStack` | aj, zd | Overlapping assignees + `+N` overflow. Duplicated informally in chat + bug tracker |
| `SegmentedControl` | af | Exclusive **or capped-multiple** option switch (`maxSelected`, e.g. af.html's "max 2 overlaps") |
| `EmptyState` | zb | Zero-data states — previously unspecified across the whole app |

Design decisions worth keeping:
- **None of the six glows.** They are orientation and structure, never the focal CTA — that keeps
  the one-accent-per-view rule intact when they're composed into a real screen.
- **`SegmentedControl` disables at the cap** rather than evicting the oldest selection. The
  constraint stays discoverable and the user keeps control of the trade.
- **`GanttTrack` positions bars as percentages of the range**, not as fixed day columns, so a
  6-month view fits the container instead of forcing horizontal scroll on every screen.
- **`Timeline` renders nothing for zero items** — pair it with `EmptyState`; a bare rail reads as
  a bug.

Verified in the browser at `/design-system`: no console errors, no page-level horizontal scroll,
zero inline hex in rendered output, and every text/surface token flips correctly between light and
dark. The Gantt accent bar resolves to `rgb(197, 244, 58)` — brand lime, **not** aa.html's
`#ccff33`.

---

## 5b. Structural scaffolds ✅ built

Five reference layouts ported as **geometry-only** page components — no colour, palette,
border tone, font family or shadow. They exist to lock the layout down before the Luxe layer is
attached, so structure and styling can be reviewed independently.

| Scaffold | Source | Route | Layout |
|---|---|---|---|
| `DocsLayout` | za.html | `/structural/docs` | 3-column docs: nav pane · article · on-this-page rail |
| `DashboardShellLayout` | zb.html | `/structural/dashboard` | Sidebar + header + responsive widget grid |
| `TimelineLayout` | zc.html | `/structural/timeline` | Dual-axis: task gutter synced to a horizontal track |
| `ProjectAnalyticsLayout` | af.html | `/structural/analytics` | Asymmetric ruler (1/1.5/1/1) + 4:5 panel split |
| `WorkspaceBoardLayout` | aj.html | `/structural/workspace` | Icon rail + tall header + horizontal status board |

Shared primitives: `components/layouts/structural/primitives.tsx` — `Shell` `Pane` `Fluid` `Band`
`Grid` `Stack` `Cluster` `Region` `Placeholder`.

**Styling contract.** Every primitive emits `data-slot="<name>"` (and `Region` also emits
`data-region`) and accepts a `className` that is appended last. Attach design-system rules to those
attributes, not to the markup — the class lists are expected to change, the slots are not.

**Where the "no styling" line falls.** Border *widths* stay (a `border-r` is the column rule that
makes a three-pane layout legible — that is structure). Border *tones* never appear. Same for the
article's `max-w-4xl` measure: line length is typographic structure, not palette.

Two deliberate deviations from the sources, both recorded in the file headers:
- **zb.html is a fixed `1200×904` artboard**, not a layout. Ported as a responsive grid that
  collapses 4 → 2 → 1 columns; reproducing the artboard literally would ship a page that neither
  reflows nor scrolls.
- **aj.html has no writing surface.** The requested note pane is an *optional* right pane
  (`notePane`); omit it and the board takes full width.

Verified across all five routes at 1280px and 375px: no console errors, no page-level horizontal
scroll at either width, no element overflowing an unscrollable ancestor, and zero colour/font
utilities present in the rendered tree. The timeline's two axes were measured aligned to the pixel
(ruler track and row track both `left: 504, width: 800`), and the analytics ruler measured
`1 : 1.53 : 1.06 : 1.06` against the source's `1 : 1.5 : 1 : 1`.

Two bugs were caught and fixed during the build, both worth remembering:
- **Computed Tailwind class names are never emitted.** `items-${align}` and a derived
  `gutterWidth.replace('w-','left-')` both looked correct and did nothing — Tailwind extracts by
  scanning source text. Replaced with literal lookup maps and a mirrored flex structure.
- **`min-w-0` / `min-h-0` on every fluid track.** Without them a flex child refuses to shrink below
  its content and one long string blows the page out horizontally.

## 5c. The Luxe theme layer ✅ attached

`app/client/src/styles/components/structural-luxe.css`, imported from `index.css`.

This is the other half of the slot contract: the scaffolds ship geometry and expose hooks, this
file paints them. **Restyling a scaffold means editing this one file — not touching a single
`.tsx`.** All five scaffolds were themed by writing it once; that leverage is the whole reason the
`data-slot` indirection exists.

**Opt-in.** Every rule is scoped under `.luxe-structural`, applied by `StructuralFrame` in
`routes/AppRoutes.tsx`. Remove that class and the scaffolds render as bare geometry again — which
is what keeps layout review possible independently of styling.

Slot → treatment:

| Hook | Treatment |
|---|---|
| `[data-slot]` (all) | Border **tone** resolves here; the scaffolds only ever declare border *width* |
| `pane` | Light frost, 20px blur |
| `band` | Heavier frost, 24px blur — reads correctly when sticky over scrolling content |
| `region` | The `ds-frost` card: 28px blur, hairline, `--shadow-ds-2` / dark equivalent, 1.5rem radius |
| `[data-region='board-card']` | Adds hover-lift on `--ease-lux`, with a `prefers-reduced-motion` opt-out |
| `placeholder` | Steel dashed outline, muted text |
| `timeline-ruler` / `ruler` | `--font-mono` |
| `timeline-now`, `ruler-segment[data-active]` | The single accent per view |
| `dock` | Frost + `--shadow-ds-3` |

**No `ds-glow` anywhere in this layer, deliberately.** The system allows one glowing element per
view and that belongs to the page's real CTA. A theme layer cannot know which element that is, and
guessing would spend the budget on furniture.

Verified across all five routes in **both** light and dark: theme applied, text/surface/border
tokens flip correctly, region radius 24px, no page-level horizontal scroll. Every accent resolves
to `rgb(197, 244, 58)` — `#C5F43A`, brand lime. `tsc` and `eslint` clean on all new code.

> **Testing note for whoever verifies this next.** The browser pane used here does not composite
> frames, so CSS *transitions* never advance and `getComputedStyle` returns a transitioning
> property frozen at its start value. That made `[data-region='board-card']` appear to keep the
> light shadow in dark mode. It does not — a freshly inserted clone of the same element resolves to
> the dark shadow, and the compiled CSS is correct. Any property under `transition` needs this
> caveat when measured headlessly; measure a clone, or a property that isn't transitioned.

---

## 5d. `/daily` — Daily note & todos ✅ built

First screen ported end-to-end under §4. Source: `daily-note-todo-template.html` (the
`aj.html` row above). Files: `pages/DailyNote.tsx`, `hooks/useDailyTodos.ts`,
`lib/dailyTodos.ts` (+ 32 tests).

**Harvested:** day header with a stat rail and completion meter, filter pills, a lane board
of task cards, per-card affordances (reorder, delete), lazy empty states.

**Rejected, per §2:** every hex, the Font Awesome icon set, the `body { overflow: hidden }`
viewport lock, and the fixed 5-column board.

Two deviations worth recording, both because the mockup's structure outran the data:

- **Two lanes, not five.** The source's five colour columns are the same card repeated —
  they encode nothing. A todo has one axis (done or not), so three further lanes would be
  chrome with no data to fill them. This is the "density is a product decision" line in §6
  being drawn deliberately rather than by copying.
- **Reorder is buttons, not drag.** Keyboard- and touch-reachable, and no new dependency.

No new primitive was needed — the screen is `Surface` · `Meter` · `Checkbox` · `Input` ·
`AccentButton` · `Badge` · `SegmentedControl` · `EmptyState` · `PageHeader`. One change went
back into the system rather than into the page: `Input` now carries `ref` through (React 19
passes it as an ordinary prop), so focus management no longer requires bespoke markup.

Verified signed in at 1270px and 375px, light and dark: no console errors, no page-level
horizontal scroll at either width, theme tokens flip, and **exactly one `.ds-glow` element**
in the rendered tree — the Add button, as §4 step 4 requires. Todos were added, toggled,
renamed, reordered, deleted and cleared against the real API, and each change was confirmed
in `GET /api/notes` rather than on screen alone.

> The §5c measuring caveat applies here too, and cost time before it was remembered: the
> input's colour is under `transition-colors`, so `getComputedStyle` returned the *light*
> value in dark mode. A freshly inserted clone reports `rgb(255,255,255)` correctly.
> Separately, the pane never holds real document focus, so `el.focus()`/`el.blur()` are
> no-ops — dispatch `focusout` directly to exercise an `onBlur` handler.

---

## 6. Risk register

- **Fracture (high).** Nine sources, no shared vocabulary. Mitigation: §4 step 2 — primitive first,
  page second. If a screen ships with bespoke markup, the system has lost.
- **Accent drift (high).** `#ccff33` vs `#C5F43A`; also HubSpot orange and Salesforce blue.
  Mitigation: a lint/grep gate on raw hex in `app/client/src`.
- **Density regression (medium).** Several mockups are far denser than current ApexOps screens.
  Density is a product decision, not a styling one — decide it per screen deliberately.
- **Scope (medium).** §3 lists 8 screens. Sequence them; do not open more than one at a time.
- **Pre-mortem — the most believable failure in 6 months:** screens were ported one-by-one under
  deadline, each carrying "just a couple" of hardcoded colours and one-off components. Dark mode
  breaks on half the app, `/design-system` no longer describes reality, and the next person
  reasonably concludes there is no design system. Prevented only by step 2 and the hex gate.
