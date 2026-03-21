---
name: design-system-oklch
description: >-
  OKLCH color system, Tailwind token mapping, and anti-generic-AI design rules
  for Caffeine frontends. Use when setting up design tokens, choosing a visual
  direction, customizing index.css or tailwind.config.js, or when the generated
  UI looks generic.
compatibility: opencode
---

# Caffeine Design System

## When to Apply

- Setting up design tokens and visual direction for a new frontend
- Customizing `index.css` or `tailwind.config.js`
- Implementing or adjusting light/dark mode
- Improving a UI that looks generic

## Preview Mode vs. Freeform Mode

If a **Design Description** is provided (Design Mode: preview), skip Steps 1-2. Instead:

1. **Extract** the color palette, typography, and shape language from the Design Description.
2. **Map** described colors to OKLCH tokens. Convert any hex/RGB values from the description to OKLCH `L C H` triples.
3. **Match** described fonts to pre-bundled fonts below (closest match), or use Google Fonts `@import` if no bundled font fits.
4. Proceed directly to Step 3 (Encode Tokens) with the extracted values.

If no Design Description is provided (Design Mode: freeform), follow Steps 1-2 as written.

## Step 1 — Choose a Visual Direction (Freeform Only)

Before writing any code, decide on:

- **Color palette**: primary, secondary, accent, neutral, success, warning, destructive (3-5 colors max)
- **Typography**: font families, scale, weights, tracking
- **Shape language**: radii, spacing density, shadows, motion

## Step 2 — Avoid Generic AI Aesthetics (Freeform Only)

| Don't                             | Do                                                          |
| --------------------------------- | ----------------------------------------------------------- |
| Purple gradients for everything   | Match colors to the app's purpose                           |
| Safe blue `#3B82F6` for every CTA | Vary button colors by action/hierarchy                      |
| System/Inter fonts only           | Add at least one distinctive font in `tailwind.config.js`   |
| Uniform `rounded-lg` everywhere   | Vary border-radius intentionally (0, 4px, 12px, 24px, full) |
| Same spacing everywhere           | Vary density for rhythm and visual hierarchy                |
| Rainbow palettes                  | 3-5 colors maximum                                          |

## Step 3 — Encode Tokens

Edit these files **as often as needed** to avoid boring designs:

- **`src/frontend/src/index.css`** — CSS custom properties using raw L C H values, for both light and dark modes
- **`src/frontend/tailwind.config.js`** — map tokens in `theme.extend` (colors, fontFamily, borderRadius, boxShadow)

## Step 4 — OKLCH Rules

- Express every color token as raw `L C H` values (no `oklch()` wrapper).
- Maintain **AA+ contrast** in both light and dark; tune L (lightness) and C (chroma) — do not rely on opacity.
- Keep semantic names (`background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `success`, `warning`, `border`, `input`, `ring`, `chart-*`, `sidebar-*`) while adjusting OKLCH values to the chosen palette.
- **Exception**: Canvas/WebGL drawing APIs may use literal color values since they cannot resolve CSS variables.

## Step 5 — Token-Only Styling

After setting up design tokens:

- **Never** use raw color literals (`#fff`, `rgb(...)`) in components.
- **Never** use arbitrary Tailwind color classes (`bg-[#123]`) or inline color styles.
- Use semantic tokens and Tailwind theme keys exclusively: `bg-primary`, `text-foreground`, `border-border`.

## Pre-Bundled Fonts

The template self-hosts fonts as `.woff2` files in `public/assets/fonts/`. Prefer these for faster load times. If a font is not listed below, Google Fonts `@import` is allowed as a fallback — the frontend runs in the browser and can fetch external resources.

For each font you use: add its `@font-face` declaration in `index.css` (with `font-display: swap` and the correct `/assets/fonts/<Name>.woff2` path), then register it in `tailwind.config.js` `fontFamily`. Do not reference fonts only in Tailwind — the `@font-face` in `index.css` is required or the font silently falls back.

### Display Fonts (headings, hero text, feature titles)

| Font                | Weights | Character                                              |
| ------------------- | ------- | ------------------------------------------------------ |
| Fraunces            | 300–900 | Quirky old-style serif with soft curves and warmth     |
| Playfair Display    | 400–800 | Elegant high-contrast serif, editorial luxury          |
| Bricolage Grotesque | 200–800 | Expressive grotesque with optical size variation       |
| DM Serif Display    | 400     | Crisp transitional serif, pairs naturally with DM Sans |

### Body Fonts (paragraphs, UI text, navigation)

| Font              | Weights | Character                                         |
| ----------------- | ------- | ------------------------------------------------- |
| General Sans      | 200–700 | Clean geometric sans, neutral and professional    |
| Figtree           | 300–900 | Friendly open sans with round terminals           |
| Plus Jakarta Sans | 300–700 | Modern geometric sans, polished and contemporary  |
| Satoshi           | 300–700 | Sharp geometric sans with distinctive character   |
| DM Sans           | 400–700 | Clean low-contrast geometric sans, highly legible |

### Mono Fonts (code blocks, data displays)

| Font           | Weights |
| -------------- | ------- |
| JetBrains Mono | 300–700 |
| Geist Mono     | 100–900 |

### Special-Purpose Fonts

- **Instrument Serif** (`InstrumentSerif-Italic.woff2`, weight 400) — Italic-only accent font. Use for one or two emphasized words within sans-serif headings (e.g., "Build something _beautiful_"). Never use as the primary display or body font.
- **Parisienne** (`Parisienne.woff2`, weight 400) — Script/cursive font. Use **only** when the user explicitly requests cursive, handwritten, or script styling (weddings, invitations, luxury accents). Never choose this by default.

### Recommended Pairings

Fraunces + Figtree (food/artisan), Playfair Display + DM Sans (luxury/real estate), Bricolage Grotesque + Satoshi (SaaS/dashboard), DM Serif Display + Plus Jakarta Sans (blog/editorial).

## Responsive & Dark Mode

- Design mobile-first (`sm:`, `md:`, `lg:` breakpoints).
- Choose light or dark mode based on the design direction. Only implement both if it serves the aesthetic or the user requests it.
- If using dark mode, design it intentionally — not just inverted lightness. Tune backgrounds, text, borders, and interactive elements for readability and visual hierarchy.
