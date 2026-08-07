# Sprint 5 `dnd-kit` Storyboard interaction spike

- **Status:** Complete for Decision Note D5.5
- **Date:** 2026-08-06
- **Platform:** macOS arm64
- **Scope:** Implementation Plan Sprint 5, Decision Note D5.5 and Subtask 5.8

## Purpose

Verify that the Technical Specification's preferred `@dnd-kit` stack supports
Showflow's responsive Blueprint Storyboard before treating it as the production
reorder interaction.

The proof covers pointer drag, keyboard reorder, auto-scroll, packaged Electron,
and one-step structural undo grouping. It does not introduce freeform canvas
positioning or a timeline.

## Versions

| Package                   | Version   |
| ------------------------- | --------- |
| `@dnd-kit/core`           | `6.3.1`   |
| `@dnd-kit/sortable`       | `10.0.0`  |
| `@dnd-kit/utilities`      | `3.2.2`   |
| Electron                  | `43.3.0`  |
| Packaged Electron Node.js | `24.18.1` |

## Results

| Proof                                              | Result |
| -------------------------------------------------- | ------ |
| Pointer drag reorders the responsive card grid     | Pass   |
| Keyboard sensor moves a focused card before/after  | Pass   |
| Dragging near the workspace edge auto-scrolls it   | Pass   |
| Packaged Electron renders and persists the reorder | Pass   |
| One completed drag creates one undo history entry  | Pass   |
| Reorder survives application restart               | Pass   |

## Implementation boundary

The renderer uses `DndContext`, `SortableContext`, `PointerSensor`, and
`KeyboardSensor`. Pointer activation requires six pixels of movement to avoid
turning ordinary card selection into a drag. The keyboard sensor uses
`sortableKeyboardCoordinates`. The ordered `<ol>` remains the semantic source
of sequence, and each card exposes a named **Reorder** control plus explicit
**Move earlier** and **Move later** menu alternatives.

`onDragEnd` calculates one complete ordered placement-ID list and applies that
visual order in the drop frame so clearing the drag transforms cannot briefly
restore the previous grid layout. The application command validates that every
placement appears exactly once, then the SQLite repository replaces positions
in one transaction. The renderer updates its query cache only after the command
succeeds; the pending visual order is discarded on failure so the last saved
order is restored. A successful reorder records one inverse order in the
structural history, regardless of the pointer movement count during drag.

## Automated evidence

- `tests/browser/design-show.spec.ts` exercises pointer reorder, keyboard
  reorder, scroll-edge auto-scroll, ordered-list semantics, and Axe coverage.
- `tests/electron/design-show.spec.ts` launches the packaged application,
  performs a pointer reorder, closes it, and confirms the reordered Blueprint
  after restart.
- `apps/desktop/src/renderer/App.test.tsx` verifies persistent reorder undo/redo
  and failed-save reconciliation.
- `packages/application/src/commands/core-commands.test.mts` verifies exact
  domain ordering and rejects incomplete or duplicate placement lists.
- `packages/persistence/src/shows/sqlite-segment-blueprint-repository.test.mts`
  verifies exact order after SQLite reload.

## Decision

`@dnd-kit` satisfies D5.5 for the Sprint 5 responsive Storyboard. Keep the
specified library and interaction boundary; no replacement decision or ADR is
required.
