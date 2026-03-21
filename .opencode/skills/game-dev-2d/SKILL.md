---
name: game-dev-2d
description: Guidelines for building 2D browser games using Canvas API, requestAnimationFrame, and React state management patterns
compatibility: opencode
---

# 2D Game Development Guidelines

Use this skill when building 2D browser games like Snake, Tetris, Pong, or other Canvas-based interactive games.

## When to Use

- Building classic arcade-style games
- Creating puzzle games with 2D graphics
- Implementing games that use Canvas API for rendering
- Games requiring keyboard, mouse, or touch controls

## Core Principles

- Make games playable and intuitive with clear instructions
- Create clean, visually appealing UI with game controls clearly indicated
- Implement appropriate difficulty progression if applicable

## Rendering and Animation

- Use Canvas API for rendering via `useRef` rather than React components for the game board
- Prefer `requestAnimationFrame` for most games as it:
  - Syncs with browser's render cycle for smoother animations
  - Automatically pauses in inactive tabs (power efficient)
  - Adapts to different display refresh rates
  - Reduces visual artifacts and jitter
- Use `setInterval` only when you need:
  - Fixed time steps independent of frame rate
  - Consistent update rate even in background tabs
  - Precise timing for simple game mechanics
- Implement proper time-based movement to ensure consistent game speed regardless of frame rate

## State Management

- Maintain dual state management approach:
  - Use React state for UI updates, scores, game status, and user interface elements
  - Use refs for fast access to game state within animation loops
- Store performance-critical and frequently-updated game state (current board, positions, game objects) in refs for animation loop access
- Trigger React re-renders only when UI needs updating, not on every animation frame
- Use custom hooks to encapsulate game logic separate from rendering

## Event Handling

- Implement event handlers outside `useEffect` to avoid closure issues with state
- Set up keyboard listeners with proper focus management
- Support both keyboard and mouse/touch controls when applicable
- Prevent default browser behavior on game control keys

## Component Structure

- Create a dedicated Game component that manages the canvas
- Split complex games into logical sub-components (Renderer, InputHandler, GameLogic)
- Establish clear interfaces between game systems

## Canvas Setup

- Use `useRef` to get direct access to both the canvas element AND game state
- Set canvas dimensions appropriately (consider device pixel ratio for sharp rendering)
- Make canvas focusable (`tabIndex`) and provide visual focus indicators for keyboard control
- Clear the entire canvas before each render frame
- Consider using multiple canvas layers for complex games (background, game objects, UI)

## Input Handling

- Implement redundant input handling (window events + direct canvas events)
- Support multiple simultaneous key presses for complex controls
- Include touch/mouse controls with proper event handling

## Code Organization

- Define explicit TypeScript types for game entities and state
- Initialize the game in `useEffect` with appropriate dependencies
- Ensure thorough cleanup in `useEffect` to prevent memory leaks and interval conflicts
- Prevent memory leaks by properly canceling animation frames and removing event listeners
- Use object-oriented patterns for game entities when appropriate

## Technical Requirements

- Ensure React import is present for JSX rendering in TypeScript projects
- Handle window resize events appropriately to scale the game
- Include proper error handling and fallbacks
- Test on different devices and browsers to ensure consistent performance
