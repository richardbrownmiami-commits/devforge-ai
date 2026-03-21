# UI Craft Audit Workflow

Use this workflow for a single refinement pass after an initial implementation.

## Step 0: Context

- What is this interface?
- Who is the user?
- What should they feel in the first 5 seconds?

## Step 1: First Impression

Write one honest paragraph:

- what feels strong
- what feels generic or noisy
- what blocks clarity or delight

## Step 2: Visual Audit

Check these quickly and concretely:

1. Color intentionality (too many surfaces? weak contrast? random accents?)
2. Typography hierarchy (clear scale, not flat?)
3. Spacing rhythm and alignment consistency
4. Visual weight (important elements visually dominant?)
5. Icon consistency and border/shadow quality

## Step 3: Interaction Audit

1. Is there one clear entry point and primary action?
2. Are loading/empty/error states clear and useful?
3. Are hover/focus/active/disabled states consistent?
4. Is mobile ergonomics acceptable (tap targets, spacing, readability)?

## Step 4: Prioritized Fix Plan

Pick only 3 fixes using this format:

- `Issue`: concrete problem
- `Impact`: user-facing consequence
- `Fix`: explicit change to make in code
- `Priority`: P0/P1/P2

## Step 5: Apply + Verify

1. Apply the 3 fixes.
2. Run frontend validation once.
3. Stop after one pass unless the user requests another iteration.
