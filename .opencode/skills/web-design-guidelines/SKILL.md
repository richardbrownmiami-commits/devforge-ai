---
name: web-design-guidelines
description: >-
  Web interface guidelines (curated) for accessible, fast, and delightful UIs.
  Use when designing or reviewing UI/UX behaviors, accessibility, layout, animation,
  and content handling in Caffeine frontends.
compatibility: opencode
---

# Web Design Guidelines

Concise rules for building accessible, fast, delightful UIs. Curated to avoid overlap with existing Caffeine design-system rules.

## When to Apply

Use these guidelines when:

- Designing UI/UX patterns, interactions, or flows
- Reviewing accessibility, keyboard navigation, or form behavior
- Refining layout, animation, or performance-sensitive UI
- Ensuring content handling and empty-state resilience

## Quick Reference by Category

| Category            | Key Rules                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| **Keyboard**        | Full WAI-ARIA APG support, visible `:focus-visible` rings, managed focus traps                          |
| **Targets & Input** | Hit targets >=24px (>=44px mobile), mobile inputs >=16px font-size, never disable zoom                  |
| **Forms**           | Never block paste, Enter submits, inline errors focused on submit, `autocomplete` + `name` attrs        |
| **State & Nav**     | URL reflects state, back/forward restores scroll, `<a>`/`<Link>` for navigation (never `<div onClick>`) |
| **Feedback**        | Optimistic UI with rollback, confirm destructives or offer Undo, polite `aria-live` for toasts          |
| **Touch & Drag**    | Generous targets, `overscroll-behavior: contain` in modals, disable text selection during drag          |
| **Animation**       | Honor `prefers-reduced-motion`, animate only `transform`/`opacity`, never `transition: all`             |
| **Layout**          | Optical alignment, verify mobile + ultra-wide, respect safe areas, no unwanted scrollbars               |
| **Content**         | Handle long text (`truncate`, `line-clamp-*`), empty states, locale-aware dates/numbers                 |
| **Performance**     | Virtualize >50 items, mutations <500ms, prevent CLS, lazy-load below-fold images                        |
| **Dark Mode**       | `color-scheme: dark` on `<html>`, `<meta name="theme-color">` matches background                        |
| **Design**          | Layered shadows, nested radii (child <= parent), accessible chart palettes                              |

## Full Guidelines

For expanded rules with MUST/SHOULD/NEVER guidance: [AGENTS.md](AGENTS.md)
