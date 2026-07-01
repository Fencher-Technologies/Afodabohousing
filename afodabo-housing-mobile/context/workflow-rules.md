# Workflow Rules

## Approach

Build this project incrementally using a spec-driven workflow. Context files define what to build, how to build it, and the current state of progress. Always implement against these specs — do not infer or invent behavior from scratch.

## Scoping Rules

- Work on one feature unit at a time.
- Prefer small, verifiable increments over large speculative changes.
- Do not combine unrelated system boundaries in a single implementation step.

## When to Split Work

Split an implementation step if it combines:
- UI changes and API integration changes.
- Navigation logic and screen implementation.
- Multiple unrelated screens or features.
- Behavior not clearly defined in the context files.

If a change cannot be verified end-to-end quickly, the scope is too broad — split it.

## Handling Missing Requirements

- Do not invent product behavior not defined in the context files.
- If a requirement is ambiguous, resolve it in the relevant context file before implementing.
- If a requirement is missing, add it as an open question in `progress-tracker.md` before continuing.

## Protected Files

Do not modify the following unless explicitly instructed:
- `src/components/ui/*` (Standardized UI library components).
- Any third-party library internals.

Project-specific styling, layout changes, and feature logic must be implemented in screen-level or feature-level components instead of modifying foundation components.

## Keeping Docs in Sync

Update the relevant context file whenever implementation changes:
- System architecture or boundaries.
- Storage model decisions.
- Code conventions or standards.
- Feature scope.

Progress state must reflect the actual state of the implementation, not the intended state.

## Before Moving to the Next Unit

1. The current unit works end-to-end within its defined scope.
2. No invariant defined in `architecture.md` was violated.
3. `progress-tracker.md` reflects the completed work.
4. The project builds successfully (`expo start` or equivalent).
5. All relevant tests pass.
