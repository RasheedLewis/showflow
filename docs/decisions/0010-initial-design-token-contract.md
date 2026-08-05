# ADR 0010: Initial Design Token Contract

- **Status:** Accepted
- **Date:** 2026-08-04
- **Sprint:** 0, Subtask 0.12

## Context

The Technical Specification assigns reusable UI and centralized design tokens to
`packages/ui` and requires CSS custom properties rather than feature-level
hardcoded colors. Design System v1.0 defines the canonical dark MVP colors,
Geist stacks, comfortable spacing, radii, and motion values.

The desktop foundation previously declared temporary renderer-local
`--foundation-*` properties backed by operating-system canvas colors. Those
properties were neither reusable nor deterministic across platforms. The light
theme, final gold calibration, local Geist font files, full typography scale, and
complete component library belong to later approved work.

## Decision

- Define the initial `--sf-*` custom-property contract in
  `packages/ui/src/tokens.css` under one dark `:root` theme.
- Export the stylesheet explicitly as `@showflow/ui/tokens.css`; do not attach CSS
  side effects to the package's TypeScript root export.
- Allow workspace imports through any explicit package export-map entry while
  continuing to reject undeclared deep imports and undeclared dependencies.
- Include canonical neutral, border, text, provisional accent, semantic state,
  font-family, spacing, radius, duration, and easing values from Design System
  v1.0.
- Consume the shared token export in the desktop renderer and remove the
  renderer-local placeholder token namespace.
- Keep the MVP dark-only. Do not create a light palette or theme-switching API.
- Validate exact token values, uniqueness, package exposure, renderer
  consumption, and representative computed styles with automated tests.

## Consequences

- Shared UI and renderer features have one semantic CSS contract for visual
  foundations.
- The desktop foundation now renders deterministic warm charcoal surfaces and
  warm white text on every target platform.
- Future font packaging and full Sprint 3 typography, elevation, z-index, and
  breakpoint work can extend the same package without changing consumers.
- Any token calibration becomes a centralized, reviewable change with matching
  contract updates.
