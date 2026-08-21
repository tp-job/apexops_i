ApexOps is built on one design system — **Luxe v2**: neutral, layered glass, and a single lime accent used as a signal rather than a decoration. This page is the short version for anyone reading or extending the interface.

## The six laws

Everything else is a consequence of these. When a screen looks wrong, it has almost always broken one of them.

| Law {w-64} | Why |
| --- | --- |
| **Contrast through opacity, not colour weight** | Depth is stacked translucency — white/5 → white/10 → white/20 — never a darker or more saturated fill. Breaking it produces the muddy look the glass base exists to avoid |
| **One glowing element per view** | The active state *or* the primary action, never both. Two glows and neither reads as focal |
| **Every number is monospaced** | Money, IDs, dates, counts, durations. Values must not change width between renders |
| **Nothing is sharper than 12px** | The radius floor. A single square corner reads as a bug, not a variation |
| **Motion comes from one file** | Every transition uses a shared variant. Ad-hoc easing is how a system stops feeling like one system |
| **Cards compose on `Surface`** | Never a raw element with background utilities. The primitive owns the blur, border, elevation and reveal |

## Colour

Neutral plus lime. The accent marks the one thing on a screen that wants attention.

| Token {w-56} | Role |
| --- | --- |
| `brand-accent` | Active nav pill, focal CTA, meter fill. One per view |
| `brand-accentHover` | Hover only, never a resting state |
| `brand-dark` | Nav ground, headings, text sitting on the accent |
| `brand-steel` | Small marks — note dots, neutral track fills |
| `global-green` · `global-yellow` · `global-red` · `global-blue` | Status: success, warning, danger, info |

Status colour is **semantic**. It reports a condition and never marks focus, so a green success pill does not spend the view's glow budget.

:::callout{tone=warn title="The accent is a signal, not a field"}
`brand-accent` as a large background stops meaning anything. Use it for one element, and let everything else stay neutral.
:::

## Type

Three families with strict roles: **DM Sans** for headings, **Inter** for body, **JetBrains Mono** for every number and identifier. Numbers additionally use tabular figures so a value does not jitter as it updates.

## Radius

Four steps and a floor.

| Step {w-40} | Used for |
| --- | --- |
| `rounded-full` | Avatars, nav pills, badges, icon buttons |
| `rounded-3xl` (24px) | Cards and main containers |
| `rounded-2xl` (16px) | List rows and inner panels |
| `rounded-xl` (12px) | Buttons, inputs, dropdowns — **the floor** |

## Elevation

Wide, soft, low opacity: `ds-elev-1` resting, `ds-elev-2` cards, `ds-elev-3` overlays, `ds-glow` for the one focal element. The shadow colour carries a blue-violet tint so elevation belongs to the canvas gradient — a neutral grey shadow on this ground reads as dirt.

## Motion

One signature curve, `EASE_LUX`, which leaves quickly and settles slowly. Three durations: 160ms for hover and small state, 280ms for entrances, 520ms for count-ups and hero sequences.

Reduced motion is a **contract**: count-ups still land on their final value, entrances resolve to their end state, and nothing in the interface depends on an animation finishing to become usable.

## Primitives

Twenty-nine components behind one import — surfaces and cards, the form kit, tables and pagination, overlays and confirm dialogs, context menus, empty and loading states, and the composition set (timeline, stepper, avatar stack, segmented control, gantt track).

If a screen needs something that is not there, the primitive gets built first. Hand-rolled cards drift within a sprint.

## Accessibility

- Body text meets WCAG AA contrast in **both** themes, not only the one it was designed in.
- Every colour has a dark-mode counterpart; nothing is styled for one theme and left to fend for itself in the other.
- Shape carries meaning wherever colour does — day markers differ by shape, not only by hue.
- Focus is always visible, and destructive actions go through a confirm dialog.

## Seeing it

The live style guide is at **`/design-system`**: every primitive rendered, the colour tokens read from the running stylesheet rather than typed by hand, plus the laws, radius, elevation and motion sections above with working demos.
