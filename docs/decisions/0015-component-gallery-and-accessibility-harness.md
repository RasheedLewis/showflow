# ADR 0015: Component Gallery and Accessibility Harness

- **Status:** Accepted
- **Date:** 2026-08-06
- **Sprint:** 3
- **Subtask:** 3.8
- **Deciders:** Showflow product owner and maintainers
- **Supersedes:** None
- **Superseded by:** None

## Context

Implementation Plan 3.8 requires an internal route that renders every shared
component and its important visual states. Test 3.T5 additionally requires the
gallery to have no serious Axe violations. Technical Specification §4.4 and
§14.1 already select hash-based React Router for desktop navigation, while §27
permits `axe-core` in renderer accessibility checks.

The renderer did not yet have a router because its only surface was the Sprint 0
foundation screen. Existing accessibility tests verify individual semantics and
keyboard paths, but they do not scan the assembled design system or provide one
stable visual review surface.

## Decision drivers

- Follow the specified hash-based desktop navigation architecture.
- Keep the gallery internal and separate from durable product routes.
- Exercise real exported components instead of gallery-only replicas.
- Run an automated standards-based accessibility scan in Chromium.
- Avoid the operational and dependency cost of a separate component-workbench
  application during the MVP.
- Pin exact dependency versions consistently with the repository toolchain.

## Considered options

| Option                                                        | Benefits                                                                                                                       | Costs and risks                                                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| React Router route, custom gallery, and Axe Playwright scan   | Matches the technical specification, reuses the desktop renderer, provides live interaction and browser accessibility evidence | Adds one runtime dependency and one test dependency; the custom gallery must be maintained with exports |
| Hand-written hash parsing and manual accessibility assertions | Few dependencies and little initial setup                                                                                      | Conflicts with the selected routing architecture and cannot provide the required Axe evidence           |
| Separate Storybook-style application                          | Mature component-workbench ecosystem and addon catalog                                                                         | Introduces another application/build surface and more framework weight than Sprint 3 requires           |

## Decision

- Pin `react-router-dom@7.18.2` in the desktop renderer and mount `App` inside a
  `HashRouter`.
- Reserve `/_development/components` for the internal component gallery. The
  route is not linked from product navigation and is not persisted as a durable
  user location.
- Build the gallery with the real `@showflow/ui` exports inside the real
  `ApplicationShell`; do not create parallel gallery-only component replicas.
- Pin `@axe-core/playwright@4.12.1` in the root test harness and scan the gallery
  in Chromium. The Sprint gate rejects serious or critical Axe violations.
- Keep visual and interaction browser checks in the existing Playwright browser
  project. Do not add Storybook or a second bundler.

## Consequences

### Positive

- The renderer now follows the specified hash-router boundary before product
  routes arrive in Sprint 4.
- Designers and maintainers have one stable surface for every foundational and
  production-object primitive, including focus, validation, disabled, long-label,
  and dark-context states.
- Axe results cover the assembled surface in a real browser alongside existing
  keyboard, focus, responsive, font, and reduced-motion tests.
- The implementation reuses the existing renderer, Vite build, design tokens,
  and test infrastructure.

### Negative or limiting

- Shared component additions must update the gallery inventory and its coverage
  test.
- React Router becomes part of the renderer runtime and must remain exact-pinned.
- Axe does not replace manual keyboard, screen-reader, contrast, or visual review.
- The gallery is an internal engineering surface, not a supported user workflow.

## Compatibility and migration

No persisted data, IPC, or database migration is required. The existing empty
hash continues to resolve to the foundation application through the wildcard
route. Future product routes can be added without changing the internal gallery
path.

## Validation

- Renderer tests verify the internal route and exact gallery component inventory.
- Browser tests verify the hash route, live states, long-label rendering, and
  keyboard focus.
- Axe Playwright reports no serious or critical violations on the gallery.
- The existing production build and packaged Electron smoke suite verify router
  compatibility with the desktop runtime.

## References

- [Technical Specification §4.4, UI Framework](../technical-spec-v1.0.md#44-ui-framework)
- [Technical Specification §14.1, Route Structure](../technical-spec-v1.0.md#141-route-structure)
- [Technical Specification §27, Accessibility Engineering](../technical-spec-v1.0.md#27-accessibility-engineering)
- [Implementation Plan 3.8](../implementation-plan-v1.0.md#38--add-component-development-gallery-required)
- [ADR 0007, Test Harnesses](0007-test-harnesses.md)
