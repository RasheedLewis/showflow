# ADR 0013: Complete Semantic Design Token Contract

- **Status:** Accepted
- **Date:** 2026-08-06
- **Sprint:** 3
- **Subtask:** 3.2
- **Deciders:** Showflow maintainers, applying Design System Specification v1.0
- **Supersedes:** None
- **Superseded by:** None

## Context

Sprint 0 established the shared `--sf-*` token namespace with the canonical dark
colors, font families, spacing, radii, and motion values. Sprint 3.2 requires the
complete initial semantic contract before reusable components are built.

Design System Specification v1.0 fully specifies the type scale, border widths,
elevation values, motion, and a 1280 px minimum comfortable desktop width. It
requires z-index and breakpoint tokens but intentionally does not prescribe a
large device matrix or numeric stacking scale. Those implementation values must
remain centralized so later components do not create local stacking contests or
responsive thresholds.

## Decision drivers

- Preserve the exact visual values in Design System Specification v1.0.
- Give foundational components semantic role tokens rather than feature-local
  type sizes, weights, line heights, borders, shadows, or layer numbers.
- Keep the contract CSS-native and consumable by every renderer feature.
- Define only the responsive boundary required for the desktop MVP.
- Establish an explicit overlay order before menus, drawers, dialogs, toasts, and
  tooltips are implemented in Sprint 3.3.
- Keep the light theme deferred and use the documented provisional gold values.

## Decision

Extend `packages/ui/src/tokens.css` with:

- The complete display, heading, body, label, and timecode size, line-height, and
  weight roles from the design specification.
- The 400, 500, 600, and 700 canonical weight scale.
- Default border width plus focus-ring width and offset.
- The three specified elevation shadows and an explicit no-elevation value.
- A semantic stacking scale in increments of 100:
  `base → sticky → dropdown → scrim → drawer → dialog → toast → tooltip`.
- One `1280px` comfortable-desktop breakpoint token. Narrow behavior remains the
  responsibility of the application shell in Sprint 3.5; this subtask does not
  invent mobile or tablet editing breakpoints.

Existing renderer foundation styles must consume the new typography and border
tokens. Token tests must reject undefined renderer references and raw renderer
type hierarchy values.

## Consequences

### Positive

- Sprint 3.3 components can share one complete visual contract.
- Typography roles match the approved scale and remain reviewable in one file.
- Overlay components receive a deterministic stacking order before they coexist.
- Responsive work has one product-backed desktop boundary without implying a
  broader mobile design system.

### Negative or limiting

- The CSS token file grows substantially because each type role exposes size,
  line height, and weight independently.
- CSS custom properties cannot be interpolated directly into native media-query
  conditions; shell CSS must mirror the documented 1280 px boundary until the
  build stack provides a standards-based custom-media solution.
- Layer values are an implementation contract and may require a superseding ADR
  if future surfaces need isolated stacking contexts.

## Compatibility and migration

No dependency, persistence, or desktop API migration is required. The development
shell moves from raw font and border values to the semantic tokens without
changing its content or navigation behavior.

## Validation

- Unit contract tests verify every specified token value and uniqueness.
- Source tests verify that renderer token references resolve and that renderer
  typography is not hardcoded.
- Browser tests verify representative computed display and body roles.
- The normal format, lint, typecheck, unit, renderer, boundary, build, browser,
  and Electron gates remain required.

## References

- [Design System Specification §§5–9](../design-system-spec-v1.0.md#5-color-system)
- [Design System Specification §24, Motion](../design-system-spec-v1.0.md#24-motion)
- [Design System Specification §27, Design Tokens](../design-system-spec-v1.0.md#27-design-tokens)
- [Implementation Plan, Sprint 3 Subtask 3.2](../implementation-plan-v1.0.md#32--implement-semantic-tokens-required)
- [ADR 0010, Initial Design Token Contract](0010-initial-design-token-contract.md)
