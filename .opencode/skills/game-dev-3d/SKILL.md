---
name: game-dev-3d
description: Guidelines for building 3D browser games using React Three Fiber, Three.js, and physics engines with performance optimization
compatibility: opencode
---

# 3D Game Development Guidelines

Use this skill when building 3D browser games using React Three Fiber and Three.js ecosystem.

## When to Use

- Building 3D games with WebGL rendering
- Creating games that need physics simulation
- Implementing first-person, third-person, or isometric 3D games
- Games requiring complex 3D interactions and animations

## Core Principles

- Use React Three Fiber (`@react-three/fiber`) as React renderer for Three.js
- Leverage `@react-three/drei` for components and helpers
- Use `@react-three/cannon` for physics
- Ensure intuitive controls, visual feedback, and appropriate lighting

## Rendering and Animation

Optimize with:

- `useFrame` hook for animation cycles
- Fixed timestep physics
- Instancing, LOD, frustum culling, texture atlases
- Progressive enhancement based on device capability

Scale complexity by game type (simpler for puzzles, detailed for showcases)

## State Management

- React state: UI, scores, menus
- Three.js/cannon: 3D world, physics
- Use refs for efficient 3D object access
- Zustand for: shared state, persistence, complex transitions, performance-critical state
- `useState` for: local component state, simple toggles

Choose based on complexity:

- Simple games: `useState`
- Medium: single zustand store
- Complex: multiple domain-organized stores

## Physics and Collision

- Configure appropriate mass, materials, collision groups
- Implement collision callbacks for gameplay mechanics
- Balance accuracy vs. performance
- Scale physics complexity by genre:
  - Puzzles: simplified, interaction-focused
  - Racing/platformers: accurate core mechanics
  - Arcade: stylized, fun-oriented

## Controls and Input

- Use drei's event system (`pointerOver`, `pointerDown`)
- Support keyboard, mouse/touch where applicable
- Match control scheme to genre:
  - Strategy: click-to-select/move
  - First-person: WASD + mouse
  - Racing: arrow keys/tilt
  - Puzzle: drag-drop or point-click

## Mobile-Specific Guidelines

If targeting mobile:

- Large touch targets (min 44x44px)
- Virtual joysticks when needed
- Thumb-reachable UI elements
- Multi-touch support
- Performance over visual fidelity
- Touch-optimized interactions

Handle device limitations:

- Battery-saving modes
- Responsive layouts
- Reduced draw distance

Technical constraints for mobile:

- Textures: max 512x512
- Polygons: 10-20k per scene
- Minimal shaders/post-processing
- Batched draw calls
- Simplified physics

## Architecture

### Component Structure

- Canvas as entry point
- Separate scene, entities, physics, controls, UI
- Dynamic imports for large assets

### Asset Management

- glTF/GLB with draco compression
- Preloading with Suspense
- Texture optimization
- Art style matched to performance targets

### Camera Selection by Genre

- Perspective for most 3D games
- Orthographic for isometric/strategy
- First-person, third-person, or fixed based on needs

### Code Organization

- TypeScript types for entities/state
- Custom hooks for reusable functionality
- Separation of rendering and logic
- Proper cleanup to prevent memory leaks

## Performance Targets

| Platform       | Polygons                                  | Lighting                            | FPS |
| -------------- | ----------------------------------------- | ----------------------------------- | --- |
| Mobile         | 20-30k                                    | 1-2 lights, minimal post-processing | 30  |
| Desktop        | 50-100k                                   | Complex lighting/physics            | 60  |
| Cross-platform | Adaptive complexity with device detection | -                                   |

## Technical Requirements

- Browser compatibility and WebGL support
- Responsive canvas sizing
- Test across devices and adjust complexity accordingly
- Responsive design for multiple aspect ratios
