# Sprint 12 implementation note — Preview runtime and Segment lifecycle

**Date:** 2026-08-09  
**Scope:** Sprint 12.1–12.12

## Implementation boundary

`@showflow/execution-contracts` owns engine-neutral execution instructions,
instruction generation, the abstract and fake clocks, cancellation, animation
presets, and the deterministic Segment runtime. It has no Electron, React,
persistence, or broadcast-engine dependency. Preview supplies a renderer adapter
that resolves the existing Layout, Component, Resource, and binding DTOs into
audience output. This keeps the runtime and instruction layer reusable by the
later rehearsal work.

Enter and Exit actions are persisted through the existing versioned preload and
validated IPC mutation path. Placement animation overrides continue using the
existing Component Placement persistence representation, so Sprint 12 needs no
database migration. The desktop app gained only a workspace dependency on the
existing execution-contracts package; no external dependency was added.

## MVP defaults applied

- Blueprint preview remains a visual sequence. Each placement can open its
  individual Segment Preview; the Blueprint is not executed as a production.
- Preview displays audience output only. Runtime controls remain outside the
  audience frame.
- Prepare and Cleanup remain inferred and read-only in the editor.
- Wipe uses one restrained left-to-right direction.
- The action editor is deliberately limited to ordered Layout activation,
  animation waits, and necessary media start/stop actions. It adds no branching,
  keyframes, or general timeline model.

## Verification

Tests `12.T1`–`12.T13` cover lifecycle transitions, invalid transitions, exact
instruction generation, preparation failure, Layout replacement order,
animation and reduced-motion completion, cancellation for Stop, Restart, Jump,
Layout changes, and window close, media completion, renderer audience output,
direct Enter and Exit phase previews, production-language failure copy, and the
absence of a general timeline model. Application tests also enforce that saved
lifecycle actions reference only Layouts in the Segment's Show and Resources
owned by that Show or its Studio.
