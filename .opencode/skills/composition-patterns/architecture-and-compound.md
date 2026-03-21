# Architecture and Compound Composition

Use this file when a component tries to serve too many modes and is becoming brittle.

## Core Rules

1. Avoid stacking mode booleans (`isThread`, `isEditing`, `isCompact`, etc.) in one component.
2. Create explicit variants with clear names (`ThreadComposer`, `EditComposer`, etc.).
3. Use compound components for reusable structure (`Component.Frame`, `Component.Header`, `Component.Footer`).
4. Keep shared logic in reusable internals, not in giant conditional trees.

## Anti-Pattern Signals

- one component has many conditional branches for layout/actions
- props include several booleans that interact with each other
- impossible or contradictory prop combinations appear

## Refactor Direction

1. Identify common internal building blocks.
2. Split mode-specific branches into explicit variants.
3. Compose variants from shared subcomponents.

## Quick Review Checklist

- Is each variant explicit about what it renders?
- Can a new mode be added without adding another boolean to a monolith?
