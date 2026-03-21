# Variants and React 19

Use this file when API clarity and modern React patterns are needed.

## Explicit Variant Rules

1. Prefer named variant components over mode flags.
2. Keep each variant focused on one user flow.
3. Share internals through composition, not through conditional prop matrices.
4. Use children composition for structure before introducing render-prop callbacks.

## React 19 Notes

Apply only in React 19+ code paths.

1. Prefer `ref` as a regular prop pattern when applicable (avoid legacy `forwardRef` usage by default).
2. Prefer `use()` for context consumption in React 19 environments where supported.

If project constraints require legacy compatibility, use the existing project convention.

## Quick Review Checklist

- Does the component API read clearly without mental boolean decoding?
- Are variant names clearer than a single highly-configurable component?
- Are React 19 APIs used consistently with project constraints?
