# 🌅 ApexOps — Theme Style Guide

## 🎨 Theme Concept

ธีมหลักคือ **Sunset Gradient Theme**  
ใช้โทนสีจาก Navy → Indigo → Wine → Pink → Peach  
สร้างความรู้สึก Warm, Modern และ Professional

---

## 🎨 Color Palette

### 🌅 Brand Colors (Sunset Gradient)

| Variable | HEX | สี | การใช้งาน |
|----------|------|-----|------------|
| `--color-dark-navy` | `#2F3E52` | 🔵 | พื้นหลังเข้ม |
| `--color-indigo-dark` | `#41436A` | 🟣 | Accent หลัก |
| `--color-wine-purple` | `#984063` | 🍷 | Highlight |
| `--color-ember-pink` | `#F64668` | 🩷 | Primary Action |
| `--color-soft-peach` | `#FE9677` | 🍑 | Accent อ่อน |

### 🌙 Dark Mode

| Variable | HEX | การใช้งาน |
|----------|------|------------|
| `--color-dark-bg` | `#1a1f2e` | พื้นหลังหลัก |
| `--color-dark-surface` | `#252d3d` | พื้นหลัง Card |
| `--color-dark-surface-2` | `#2f3848` | พื้นหลังรอง |
| `--color-dark-border` | `#3d4759` | เส้นขอบ |
| `--color-dark-text` | `#f1f3f5` | ข้อความหลัก |
| `--color-dark-text-secondary` | `#9ca3af` | ข้อความรอง |

### ☀️ Light Mode

| Variable | HEX | การใช้งาน |
|----------|------|------------|
| `--color-light-bg` | `#f8fafc` | พื้นหลังหลัก |
| `--color-light-surface` | `#ffffff` | พื้นหลัง Card |
| `--color-light-surface-2` | `#f1f5f9` | พื้นหลังรอง |
| `--color-light-border` | `#e2e8f0` | เส้นขอบ |
| `--color-light-text` | `#1e293b` | ข้อความหลัก |
| `--color-light-text-secondary` | `#64748b` | ข้อความรอง |

### 🚦 Status Colors

| Variable | HEX | การใช้งาน |
|----------|------|------------|
| `--color-global-blue` | `#4285F4` | Info / Primary |
| `--color-global-red` | `#DB4437` | Error / Danger |
| `--color-global-yellow` | `#F4B400` | Warning |
| `--color-global-green` | `#0F9D58` | Success |

---

## 🧩 Fonts

- **Inter** — UI ทั่วไป (`--font-inter`)
- **JetBrains Mono** — Code / Terminal (`--font-mono`)

---

## 🪞 Component Styles

### Gradient Utilities

```css
/* Sunset Gradients */
.gradient-sunset       /* Indigo → Wine → Pink */
.gradient-sunset-warm  /* Wine → Pink → Peach */
.gradient-sunset-full  /* Navy → Indigo → Wine → Pink → Peach */

/* Text Gradient */
.text-gradient-sunset  /* Pink → Peach gradient text */
```

### Shadow Utilities

```css
.shadow-brand       /* Ember pink shadow */
.shadow-brand-lg    /* Larger brand shadow */

/* Hover Effects */
.hover-glow-brand:hover   /* Pink glow on hover */
.hover-glow-peach:hover   /* Peach glow on hover */
```

### Glass Effect

```css
.glass-effect  /* Glassmorphism for both modes */
```

---

## ✨ Animations

### Sunset Glow Animations

```css
.animate-sunset-pulse  /* Pink glow pulse */
.animate-wine-pulse    /* Wine glow pulse */
.animate-peach-pulse   /* Peach glow pulse */
```

### General Animations

```css
.animate-fade-in       /* Fade in */
.animate-fade-in-up    /* Fade + slide up */
.animate-scale-in      /* Scale pop-in */
.animate-bounce-in     /* Bounce effect */
```

### Utilities

```css
.hover-lift      /* Lift + shadow on hover */
.hover-scale     /* Scale up on hover */
.press-effect    /* Shrink on click */
```

### Animated Border

```css
.gradient-border-sunset  /* Animated sunset gradient border */
```

---

## 🎯 Usage Examples

### Button with Sunset Gradient

```tsx
<button className="gradient-sunset text-white font-bold px-6 py-3 rounded-lg hover-glow-brand">
  Create Ticket
</button>
```

### Card with Brand Shadow

```tsx
<div className="card-glass shadow-brand p-6 rounded-xl">
  <h3 className="text-light-text dark:text-dark-text">Bug Report</h3>
</div>
```

### Text with Gradient

```tsx
<h1 className="text-3xl font-bold text-gradient-sunset">
  Welcome to ApexOps
</h1>
```

---

## 🛠️ Tailwind Classes Reference

### Background

```
bg-light-bg / bg-dark-bg
bg-light-surface / bg-dark-surface
bg-light-surface-2 / bg-dark-surface-2
bg-dark-navy / bg-indigo-dark / bg-wine-purple / bg-ember-pink / bg-soft-peach
```

### Text

```
text-light-text / text-dark-text
text-light-text-secondary / text-dark-text-secondary
text-ember-pink / text-soft-peach / text-wine-purple
```

### Border

```
border-light-border / border-dark-border
```

### Status

```
bg-global-blue / text-global-blue
bg-global-red / text-global-red
bg-global-green / text-global-green
bg-global-yellow / text-global-yellow
```

---

**Last Updated**: 2025-12-20
