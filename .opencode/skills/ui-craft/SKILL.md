---
name: ui-craft
description: >-
  Performs high-fidelity UI critique and refinement for frontend interfaces.
  Use when the user asks for polish, refinement, redesign, visual audit, or
  higher-end visual quality after an initial implementation.
compatibility: opencode
---

# UI Craft

Use this skill when the task is about polish, redesign, critique, visual quality, interaction quality, or final UX refinement.

## Core Aesthetic Rules

1. Choose a clear aesthetic direction before editing (minimal, editorial, brutalist, playful, luxury, etc.).
2. Avoid generic UI defaults and cookie-cutter layouts.
3. Avoid Arial/Roboto/Inter/system-first typography unless the user explicitly asks for them.
4. Do not default to purple, blue, or purple-blue gradients unless explicitly requested.
5. Keep palettes intentional and tight (3-5 core colors plus semantic tokens).
6. Add at least one memorable signature detail (composition, type moment, motion beat, or visual motif).

## Refinement Rules

- Start by observing before editing: identify hesitation points, confusing states, and visual clutter.
- Prefer less, better UI: reduce redundant labels, duplicate cards, and noisy decoration.
- Maintain strong hierarchy: primary action and key information must be visually dominant.
- Keep consistency: spacing scale, radii, shadows, icon style, and interaction states should feel systemized.
- Design for edge states: loading, empty, error, and success states should feel intentional.
- Keep motion purposeful: short transitions, smooth defaults, no distracting animation.

## Audit Workflow

For full critique workflow and scoring, read: [audit-workflow.md](audit-workflow.md)

Default audit pass behavior:

1. Identify the top 3 highest-impact issues.
2. Apply fixes directly in code.
3. Re-validate once.
4. Stop after one pass unless explicitly asked for another iteration.

## Quick Checklist

1. Remove redundancy and repeated labels.
2. Merge sibling cards/sections when they represent one concept.
3. Tighten spacing rhythm and align to a clear grid.
4. Reduce decorative noise (heavy borders, unnecessary lines, visual clutter).
5. Ensure hover/focus/active/disabled states for interactive controls.
6. Improve table/list density with progressive disclosure when needed.
7. Verify mobile ergonomics (tap targets, spacing, readability).

## Audit Output Format

When asked to audit, return 3-5 prioritized findings in this format:

- `Issue`: concrete problem observed
- `Impact`: user-facing consequence
- `Fix`: explicit implementation change
- `Priority`: P0/P1/P2

Keep findings specific and actionable. Avoid vague comments.

## Quality Gate

Before finishing a polished UI task, confirm:

- Visual hierarchy is clear at first glance.
- Primary user flow is obvious and friction-free.
- No major inconsistency in spacing, radii, or elevation.
- Interaction feedback is immediate and understandable.
- Interface meets modern app quality expectations.
