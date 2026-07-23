# Design System — Glass Dashboard UI
> Extracted from the Invoice Management Dashboard codebase.  
> Stack: React · TypeScript · Tailwind CSS  
> Platform: Desktop (min-width 1280px)

---

# ⬦ ApexOps Design System v2 — "Luxe" (canonical)

> **The Invoices page (`pages/Invoices.tsx`) is the reference template for the entire product.**
> Feel: **high-end · luxurious · cutting-edge.** Every screen composes from this vocabulary.
> Live style guide: route **`/design-system`** (`pages/DesignSystem.tsx`).
> Stack: React · TypeScript · **Tailwind CSS** · **MUI** · **motion** · **react-icons**.

### Tooling — what goes where
| Concern | Tool | Notes |
|---|---|---|
| Layout, spacing, colour, glass, type | **Tailwind** | utility-first; never inline hex — use brand tokens |
| Selects, date pickers, tabs, menus, tooltips | **MUI** | styled via `sx` to match tokens, not default MUI look |
| Entrance, hover, count-up, meter fill | **motion** (`motion/react`) | only via the shared `@/lib/motion` variants |
| Icons | **react-icons** (`Fi` primary) | tree-shaken components; never icon fonts in new code |

### The Luxe layer (what v2 adds on top of the glass base below)
- **`ds-frost`** — the canonical premium surface: 28px blur + saturate, hairline top-light, restrained elevation. Use for hero/KPI cards. (ref: mobile sales app)
- **Elevation scale** — `ds-elev-1|2|3`: soft, wide, low-opacity shadows. Luxury = restraint, never harsh drops.
- **Lime glow** — `ds-glow`: reserved for the single focal CTA / active knob per view.
- **`ds-stripe-fill`** — diagonal lime stripe for progress/timeline fills.
- **`ds-mesh`** — subtle radial lime/steel mesh behind hero numbers for depth.
- **Motion** — one signature easing `EASE_LUX = cubic-bezier(.22,1,.36,1)`; durations `fast/base/slow`; `SPRING` for interactive lifts. Variants: `fadeUp`, `scaleIn`, `stagger()`, `hoverLift`, `pressable`.

### Primitives — import from `@/components/design-system`
| Primitive | Role |
|---|---|
| `Surface` | the card. variants `frost · panel · dark · blue · accent`; `interactive` (hover-lift) + `reveal` (fadeUp) |
| `StatTile` | KPI atom: animated mono value + optional trend pill + icon on a luxe surface |
| `AnimatedNumber` | count-up mono figure; reduced-motion & non-paint safe (always lands final value) |
| `Meter` | striped lime progress bar with glowing knob |
| `AccentButton` | `accent` (glowing focal CTA) · `dark` · `ghost` |
| `Badge` | nano status chip: `accent · solid · neutral · outline` |
| `PageHeader` | 4xl DM-Sans title + subtitle + optional back-arrow + actions |

### Rules (in addition to §2 Do/Don't below)
- ✅ Compose on `Surface` — never raw `div` + background utilities for cards.
- ✅ One glowing element (`ds-glow`/accent) per view — active state **or** CTA, not both.
- ✅ All money/IDs/counts use `font-numbers`; animate them with `AnimatedNumber`.
- ✅ All motion comes from `@/lib/motion`. No ad-hoc `transition` objects.
- ❌ No new remixicon (`ri-*`) usage — migrate to `react-icons`.
- ❌ No blue/purple "SaaS" gradients — palette stays **neutral + lime**.

*The sections below (§1–§14) remain the authoritative spec for the underlying glass base, tokens, type scale, and component anatomy. v2 refines their feel; it does not replace them.*

---

## 1. Design Philosophy

This system is built on **layered glassmorphism**: translucent surfaces stacked over a soft gradient canvas, creating depth without heavy shadows. Three glass registers — light, dark, and blue — handle every surface need. The accent color (#C5F43A) is used sparingly as a signal: active state, CTA, highlight strip. Everything else stays neutral.

Core principles:
- **Contrast through opacity**, not through color weight
- **Typography carries hierarchy** — three font families with strict role separation
- **Numbers are monospaced always** — financial data must never shift width
- **Rounded everything** — minimum `rounded-xl`; no sharp corners anywhere in the UI

---

## 2. Color Tokens

Define these in `tailwind.config.ts` under `theme.extend.colors.brand`:

```ts
brand: {
  accent:    '#C5F43A',             // Lime green — active state, CTA, highlights only
  dark:      '#222222',             // Near-black — nav bg, dark surfaces, primary text on light
  gray:      '#F3F4F6',             // Off-white — subtle backgrounds, chip fills
  glass:     'rgba(255,255,255,0.70)',
  glassDark: 'rgba(34,34,34,0.85)',
  glassBlue: 'rgba(156,179,196,0.90)',
}
```

### Background Canvas
```css
background-image: linear-gradient(135deg, #E0E7FF 0%, #EFF6FF 100%);
```
Applied to `<body>` only. All panels sit above this.

### Semantic Color Usage

| Token | Where used |
|---|---|
| `brand-accent` | Active nav pill, active list item indicator, primary CTA button, active badge bg |
| `brand-dark` | Nav background, headings, button text on accent, primary dark text |
| `brand-gray` | Chip/tag fills, input backgrounds, muted surface fills |
| `white/60` | `glass-panel` backgrounds |
| `white/10–white/20` | `glass-dark` inner containers, line-item cards |
| `gray-400` | Muted labels, placeholder text, icon strokes |
| `red-500` | Notification badge dot only |

### Do / Don't
- ✅ Use `brand-accent` for **one** focal element per view (active state OR CTA, not both)
- ✅ Layer `white/5 → white/10 → white/20` for hover depth on dark surfaces
- ❌ Never use `brand-accent` as a background for large surfaces
- ❌ Never use purple, blue gradients, or generic "SaaS blue" — this palette is intentionally neutral + lime

---

## 3. Typography

Import from Google Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
```

Register in `tailwind.config.ts`:

```ts
fontFamily: {
  heading: ['"DM Sans"', 'sans-serif'],
  body:    ['"Inter"', 'sans-serif'],
  mono:    ['"JetBrains Mono"', 'monospace'],
}
```

### Font Role Rules

| Family | Class | Role |
|---|---|---|
| DM Sans | `font-heading` | Page titles, section headings, company names, nav brand |
| Inter | `font-body` (default) | All body copy, labels, descriptions, filter text |
| JetBrains Mono | `font-mono` / `font-numbers` | **All** currency values, invoice numbers, IDs, codes, counts |

### Type Scale (Desktop)

```
Page Title (h1):   text-4xl  font-bold  font-heading    — "Invoices"
Section Head (h2): text-3xl  font-bold  font-numbers    — "$31,211.00"
Detail Head (h2):  text-3xl  font-bold  font-numbers    — "# 427-012"
Card Head:         text-xl   font-bold  font-heading    — company names
Body Standard:     text-sm   font-medium font-body      — labels, nav items
Body Small:        text-xs   font-medium font-body      — sub-labels, badges
Mono Value Large:  text-xl   font-numbers               — line-item amounts
Mono Value Small:  text-sm   font-numbers               — list amounts
Nano Label:        text-[10px] uppercase tracking-wider  — status badges
```

### Critical Rule
> **Any number representing money, an ID, a date, or a count must use `font-numbers` (JetBrains Mono).** This prevents layout shift and signals to users that the value is precise.

---

## 4. Surface System (Glass Layers)

Three reusable surface classes. Implement as Tailwind component classes or `cn()` helpers.

### `glass-panel` — Light Surface
```css
.glass-panel {
  background: rgba(255, 255, 255, 0.60);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.80);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
}
```
**Use for**: Top nav, KPI cards, filter bar — anything on the gradient canvas.

### `glass-dark` — Dark Surface
```css
.glass-dark {
  background: rgba(34, 34, 34, 0.85);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.10);
}
```
**Use for**: Primary content panels, list/detail containers, full-bleed dark sections.

### `glass-blue` — Mid Surface
```css
.glass-blue {
  background: rgba(144, 169, 186, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.20);
}
```
**Use for**: Detail panes, secondary panels nested inside `glass-dark` surfaces.

### Nesting Rules

```
body (gradient canvas)
└── glass-panel          ← nav, KPI cards, filter bar
    └── (content)
└── glass-dark           ← main content area, list panes
    └── glass-blue       ← detail pane inside dark panel
        └── white/10     ← individual line-item cards
            └── white/20 ← hover state of line-item card
```

Never nest `glass-panel` inside `glass-dark`. The contrast inversion breaks the depth model.

---

## 5. Border Radius Scale

| Token | Value | Usage |
|---|---|---|
| `rounded-full` | 9999px | Avatars, nav pills, icon buttons, badges, notification dots |
| `rounded-3xl` | 24px | KPI cards, main glass-dark container, detail pane |
| `rounded-2xl` | 16px | List items (active), inner panels, payment method tiles, tab bar |
| `rounded-xl` | 12px | Buttons, inputs, filter dropdowns, line-item cards, ghost buttons |

**Rule**: Never use `rounded-lg` (8px) or below. The system's minimum is `rounded-xl`.

---

## 6. Component Patterns

### 6.1 Navigation — Pill Nav

```tsx
// Dark container with pill-shaped active indicator
<nav className="bg-brand-dark text-white rounded-full p-1.5 flex items-center gap-2 text-sm font-medium">
  <a className="px-4 py-2 rounded-full hover:bg-white/10 transition">Estimates</a>
  <a className="px-4 py-2 rounded-full bg-brand-accent text-brand-dark flex items-center gap-2">
    <span className="w-1.5 h-1.5 rounded-full bg-brand-dark" />
    Invoices {/* Active */}
  </a>
  <a className="px-4 py-2 rounded-full hover:bg-white/10 transition">Payments</a>
</nav>
```

Active state anatomy:
- Background: `bg-brand-accent`
- Text: `text-brand-dark`
- Indicator dot: `w-1.5 h-1.5 rounded-full bg-brand-dark` (left of label)

### 6.2 KPI Card

```tsx
<div className="glass-panel rounded-3xl p-6">
  <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
  <div className="flex items-baseline gap-1">
    <span className="text-gray-400 text-lg">$</span>
    <h2 className="text-3xl font-bold font-numbers text-brand-dark">{value}</h2>
  </div>
</div>
```

- Currency symbol is separate `text-gray-400 text-lg` — never part of the number string
- Value always `font-numbers` (JetBrains Mono)
- Unit suffixes (e.g. "days") use `text-gray-400` at normal size beside the number

### 6.3 List Item — Invoice Row

Two states: **default** and **active**.

```tsx
// Default
<div className="flex items-center justify-between p-3 rounded-2xl
  hover:bg-white/5 cursor-pointer transition
  border border-transparent hover:border-white/10">

// Active — with left accent strip
<div className="relative flex items-center justify-between p-3 rounded-2xl
  bg-white/10 border border-white/20 cursor-pointer shadow-lg">
  <div className="absolute -left-4 w-1 h-8 bg-brand-accent rounded-r-md" />
  {/* content */}
</div>
```

Active indicator: a 4px wide `brand-accent` bar, absolutely positioned at `-left-4`, `h-8`, `rounded-r-md`. The list container needs `overflow-hidden` disabled or `px-4` to allow this bleed.

### 6.4 Status Badge

```tsx
// Outlined (inactive/muted)
<span className="px-2 py-0.5 rounded border border-gray-600
  text-[10px] text-gray-400 uppercase tracking-wider">
  Viewed
</span>

// Filled (active, on dark surface)
<span className="px-2 py-0.5 rounded bg-white text-brand-dark
  font-medium text-[10px] uppercase tracking-wider">
  Unsent
</span>

// Pill counter (on tabs)
<span className="bg-gray-100 px-1.5 rounded-md text-xs font-numbers">3</span>
```

### 6.5 Buttons

**Primary CTA (dark surface)**
```tsx
<button className="bg-brand-accent text-brand-dark font-bold px-6 py-2.5
  rounded-xl hover:bg-[#b0dc34] transition shadow-md">
  Pay out now
</button>
```
Hover: `#b0dc34` (10% darker than accent). Never use `opacity` for hover on CTA.

**Secondary / Ghost**
```tsx
<button className="bg-white/60 hover:bg-white border border-gray-200 px-4 py-2
  rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-sm">
  <Icon className="w-4 h-4" />
  Create an invoice
</button>
```

**Icon Button (circle)**
```tsx
<button className="w-10 h-10 rounded-full border border-gray-300
  flex items-center justify-center hover:bg-white/50 transition">
  <Icon className="w-5 h-5 text-gray-600" />
</button>
```

**Icon Button (square, on dark)**
```tsx
<button className="p-2.5 rounded-xl border border-white/20
  hover:bg-white/10 transition text-white/80">
  <Icon className="w-5 h-5" />
</button>
```

### 6.6 Input / Search

```tsx
<div className="relative">
  <input
    className="bg-white/50 border border-gray-200 text-xs rounded-xl
      pl-4 pr-10 py-2 w-48
      focus:outline-none focus:ring-1 focus:ring-brand-dark"
    placeholder="Enter invoice #"
    type="text"
  />
  <SearchIcon className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" />
</div>
```

### 6.7 Avatar Stack

```tsx
<div className="flex -space-x-2">
  {users.map(u => (
    <img key={u.id}
      src={u.avatar}
      className="w-8 h-8 rounded-full border-2 border-white"
      alt={u.name}
    />
  ))}
</div>
```

Overlap: `-space-x-2`. Border always `border-2 border-white` (matches background for separation).

### 6.8 Tab Bar (floating, centered)

```tsx
<div className="absolute top-0 left-1/2 -translate-x-1/2
  flex items-center bg-white p-1 rounded-b-2xl z-10 shadow-sm
  border-x border-b border-gray-100">
  <button className="px-4 py-1.5 text-sm font-medium text-gray-600
    hover:bg-gray-50 rounded-xl transition">All Invoices</button>
  <button className="px-4 py-1.5 text-sm font-bold
    bg-brand-accent text-brand-dark rounded-xl shadow-sm flex items-center gap-2">
    Unpaid
    <span className="bg-white/50 px-1.5 rounded-md text-xs font-numbers">5</span>
  </button>
</div>
```

Mounted at `top-0`, overflows upward from parent. Parent needs `relative`.

### 6.9 Payment Method Tile

```tsx
// Inactive
<div className="bg-gray-100/50 rounded-xl p-3 flex-1 flex flex-col
  justify-between min-h-[80px]">
  <span className="text-xs font-numbers text-gray-500">*4443</span>
  <span className="text-xs font-medium text-gray-400 mt-auto">Visa</span>
</div>

// Active (accent fill)
<div className="bg-brand-accent rounded-xl p-3 flex-1 flex flex-col
  justify-between min-h-[80px] shadow-sm">
  <span className="text-xs font-numbers text-brand-dark font-bold">#177210</span>
  <span className="text-xs font-medium text-brand-dark mt-auto">Stripe</span>
</div>
```

### 6.10 Line-Item Card (inside detail pane)

```tsx
<div className="flex-1 bg-white/10 rounded-2xl p-4 flex flex-col
  justify-between border border-white/10
  hover:bg-white/20 transition cursor-pointer relative group">
  <ArrowIcon className="w-4 h-4 absolute top-4 right-4
    text-white/40 group-hover:text-white transition" />
  <div className="font-numbers text-xl">{amount}</div>
  <div className="text-xs text-white/70">{label}</div>
</div>
```

Add-new tile variant:
```tsx
<div className="w-24 bg-white/5 rounded-2xl border border-white/10 border-dashed
  flex items-center justify-center cursor-pointer hover:bg-white/10 transition">
  <PlusIcon className="w-6 h-6 text-white/50" />
</div>
```

---

## 7. Layout Architecture

### Page Shell

```
<body>  ← gradient canvas, flex column, overflow-hidden, full viewport
  <header>  ← glass-panel, flex-shrink-0, z-20
  <main>    ← flex-1, overflow-y-auto, p-6, flex flex-col gap-5
    Page Header row         ← flex-shrink-0
    KPI grid (3 cols)       ← flex-shrink-0
    Filter bar              ← flex-shrink-0
    List + Detail section   ← flex: 1 1 0  (fills remaining height)
```

Critical: `overflow: hidden` on `body` + `overflow-y: auto` on `main` creates the single scrollable region. All `flex-shrink-0` sections pin to top; only the bottom section grows.

### List + Detail Split

```
glass-dark container  (flex row, min-height: 420px, flex: 1 1 0)
├── List pane    w-1/3  border-r border-white/10  flex-col  pt-4
│   ├── Header   px-6 pb-4  flex-shrink-0
│   └── Scroll   flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2
└── Detail pane  flex-1  p-4
    └── glass-blue  rounded-2xl  flex-col  overflow-hidden
        ├── Header   p-6 pb-4    flex-shrink-0
        ├── Content  flex-1 p-6  flex gap-4  min-h-0
        └── Footer   p-6         flex-shrink-0
```

### KPI Grid

```
grid grid-cols-3 gap-4
├── Combined card   col-span-2
└── Payout card     col-span-1
```

---

## 8. Iconography

All icons: Heroicons outline style, `stroke-width="2"`, `stroke-linecap="round"`, `stroke-linejoin="round"`.

Standard sizes:
- `w-4 h-4` — inline with text, inside badges
- `w-5 h-5` — nav icons, action buttons
- `w-6 h-6` — empty state, prominent actions

Colors follow context:
- On light glass: `text-gray-500` default, `text-brand-dark` on hover/active
- On dark glass: `text-white/40` muted, `text-white` on hover
- Never hardcode hex in icon color — always use Tailwind text utilities

---

## 9. Scrollbar Styling

```css
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
```

Apply globally. Matches neutral palette, invisible on dark surfaces.

---

## 10. Stripe / Pattern Utility

Used on timeline bars:
```css
.pattern-stripes {
  background-image: repeating-linear-gradient(
    45deg,
    transparent, transparent 5px,
    rgba(255,255,255,0.1) 5px, rgba(255,255,255,0.1) 10px
  );
}
```

Apply on top of solid `bg-brand-accent` for a subtle woven texture on progress/timeline fills.

---

## 11. Spacing & Density

| Context | Padding | Gap |
|---|---|---|
| Page (`<main>`) | `p-6` | `gap-5` |
| Card interior | `p-6` | `gap-4` to `gap-6` |
| List item | `p-3` | `gap-3` (avatar→text), `gap-4` (text→badge→amount) |
| Detail footer | `p-6` | `gap-12` (between totals), `gap-3` (buttons) |
| Filter bar | `p-2` | `gap-4` |
| Nav | `p-1.5` | `gap-2` |

---

## 12. Notification / Indicator Dot

```tsx
// Red notification dot on icon button
<button className="relative p-2 ...">
  <BellIcon className="w-5 h-5" />
  <span className="absolute top-2 right-2 w-2 h-2
    bg-red-500 rounded-full border-2 border-white" />
</button>
```

Always `border-2 border-white` to separate from icon background. Size `w-2 h-2` only.

---

## 13. Tailwind Config Summary

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"DM Sans"', 'sans-serif'],
        body:    ['"Inter"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          accent:    '#C5F43A',
          dark:      '#222222',
          gray:      '#F3F4F6',
          glass:     'rgba(255,255,255,0.70)',
          glassDark: 'rgba(34,34,34,0.85)',
          glassBlue: 'rgba(156,179,196,0.90)',
        },
      },
      backgroundImage: {
        'gradient-bg': 'linear-gradient(135deg, #E0E7FF 0%, #EFF6FF 100%)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
} satisfies Config
```

---

## 14. Global CSS Additions

These cannot be expressed in Tailwind config and must live in `globals.css`:

```css
/* Box model */
*, *::before, *::after { box-sizing: border-box; }

/* Canvas */
html, body {
  margin: 0; padding: 0;
  width: 100%; height: 100%;
  overflow: hidden;
}
body {
  background-image: linear-gradient(135deg, #E0E7FF 0%, #EFF6FF 100%);
  font-family: 'Inter', sans-serif;
  display: flex;
  flex-direction: column;
}

/* Surface classes */
.glass-panel {
  background: rgba(255,255,255,0.60);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.80);
  box-shadow: 0 8px 32px 0 rgba(31,38,135,0.05);
}
.glass-dark {
  background: rgba(34,34,34,0.85);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.10);
}
.glass-blue {
  background: rgba(144,169,186,0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.20);
}

/* Monospaced numbers shorthand */
.font-numbers { font-family: 'JetBrains Mono', monospace; }

/* Stripe texture */
.pattern-stripes {
  background-image: repeating-linear-gradient(
    45deg, transparent, transparent 5px,
    rgba(255,255,255,0.1) 5px, rgba(255,255,255,0.1) 10px
  );
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
```

---

*End of Design System v1.0*