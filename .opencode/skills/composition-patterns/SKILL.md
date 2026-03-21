---
name: composition-patterns
description: >-
  Improves React component architecture using composition. Use when component
  APIs become hard to maintain, boolean mode props accumulate, context/provider
  structure is needed, or reusable variants should replace monolithic components.
compatibility: opencode
---

# React Composition Patterns

Use this skill when component structure is the problem, not just styling.

## When to Apply

- components accumulate `isX`/`hasY`/mode booleans
- one component attempts to serve many divergent use-cases
- shared state is needed across sibling UI areas
- render-prop APIs are harder to read than explicit composition

## Always-Apply Rules (High Impact)

1. Avoid boolean-prop proliferation; create explicit variants.
2. Prefer composition + compound subcomponents for complex structures.
3. Keep state-management details in provider layers, not leaf UI components.
4. Prefer children-based composition over many `renderX` props for static structure.

## Load the Right Reference File

- **Component architecture and compound composition**: [architecture-and-compound.md](architecture-and-compound.md)
- **Provider and context boundaries**: [providers-and-context.md](providers-and-context.md)
- **Variants and React 19 API notes**: [variants-and-react19.md](variants-and-react19.md)

Read only the file(s) needed for the current refactor.

## Full Reference

For the complete expanded document: [AGENTS.md](AGENTS.md)
