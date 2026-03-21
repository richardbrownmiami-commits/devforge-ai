# Providers and Context

Use this file when state needs to be shared cleanly across sibling UI components.

## Core Rules

1. State implementation details belong in provider components.
2. UI components should consume a stable context interface, not implementation-specific hooks.
3. Keep context contracts explicit: `state`, `actions`, and optional `meta`.
4. Lift shared state to the provider boundary when external controls/previews need the same data.

## Context Interface Pattern

Define one context contract that multiple providers can implement:

- `state`: current values used by UI
- `actions`: state transitions and submit handlers
- `meta`: refs and incidental metadata

This allows the same UI composition to work with different backends/state stores.

## Anti-Pattern Signals

- prop drilling through many layers
- sibling components need state via refs or sync effects
- UI components tightly coupled to one state hook implementation

## Quick Review Checklist

- Can the same UI composition run with a different provider implementation?
- Are sibling controls reading state through context rather than brittle prop chains?
