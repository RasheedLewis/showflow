# ADR 0014: Lucide Icon Library

- **Status:** Accepted
- **Date:** 2026-08-06
- **Sprint:** 3
- **Subtask:** 3.3
- **Deciders:** Showflow product owner and maintainers
- **Supersedes:** None
- **Superseded by:** None

## Context

Implementation Plan D3.1 and the open icon-library item in Design System
Specification §10 require one exact icon family before foundational icon buttons
can become stable. Sprint 0 deliberately kept the choice behind a small local
adapter. Sprint 3.3 now introduces shared icon buttons, menu actions, statuses,
and overlay controls, so the placeholder boundary must resolve to a maintained
production package.

## Decision drivers

- Simple outlined geometry with rounded joins and a consistent 1.5–2 px stroke.
- Clear silhouettes at the specified 16, 20, 24, and 28–32 px sizes.
- Strong React and TypeScript support with tree-shakable imports.
- Active maintenance and a complete common desktop UI vocabulary.
- One local adapter that prevents library-specific names and defaults from
  spreading through feature code.

## Considered options

| Option         | Benefits                                                                 | Costs and risks                                                        |
| -------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Lucide React   | Restrained outline style, consistent stroke, broad vocabulary, typed API | Product names must be normalized through the local adapter             |
| Phosphor React | Very broad vocabulary and multiple weights                               | Its many weights invite style mixing beyond Showflow's restrained rule |
| Heroicons      | Clear outline set and familiar React API                                 | Smaller vocabulary and fewer stroke-level customization options        |

## Decision

Use exact-pinned `lucide-react@1.28.0` behind `@showflow/ui`'s `Icon` adapter.

- Feature packages import `Icon`, `IconName`, or components that consume them;
  they do not import `lucide-react` directly.
- The adapter defaults to a 1.75 px stroke and exposes only approved product icon
  names.
- Decorative icons are hidden from assistive technology. Standalone semantic
  icons require a label.
- Icon-only controls require both an accessible label and a tooltip and cannot be
  the primary action.
- Filled and outlined families are not mixed.

## Consequences

### Positive

- Foundational and feature components share one precise, modern outline family.
- The adapter makes vocabulary and a future library migration reviewable in one
  place.
- Tree-shakable named imports keep the application from bundling the full set.

### Negative or limiting

- The UI package gains a runtime dependency and must review upstream icon changes
  when updating the exact pin.
- Feature code cannot use an unapproved glyph until the adapter vocabulary is
  extended deliberately.

## Compatibility and migration

No persisted data or desktop API migration is required. The Sprint 0 temporary
adapter boundary becomes the permanent Showflow icon boundary. No existing
product icons require migration.

## Validation

- Renderer tests verify decorative and labelled icon accessibility.
- Icon-button tests verify the required label, tooltip, sizes, variants, focus,
  and disabled behavior.
- Production builds verify that Lucide is bundled through the UI package.

## References

- [Design System Specification §10, Iconography](../design-system-spec-v1.0.md#10-iconography)
- [Technical Specification §4.10, UI Primitives](../technical-spec-v1.0.md#410-ui-primitives)
- [Implementation Plan D3.1](../implementation-plan-v1.0.md#d31--exact-icon-library-decision-required-before-33-finalization)
