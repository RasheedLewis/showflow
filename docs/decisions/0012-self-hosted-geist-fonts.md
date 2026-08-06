# ADR 0012: Self-Hosted Geist Font Assets

- **Status:** Accepted
- **Date:** 2026-08-06
- **Sprint:** 3
- **Subtask:** 3.1
- **Deciders:** Showflow maintainers, applying the specification-defined typography requirement
- **Supersedes:** None
- **Superseded by:** None

## Context

Design System Specification §6 and Sprint 3.1 require Geist Sans throughout the
interface, with Geist Mono limited to durations, timecode, measurements, and
shortcut displays. The Sprint 0 token contract named those families but did not
load font files, so machines without a system-installed copy rendered the fallback
stack instead.

Showflow must remain local-first, package the same visual foundation on macOS,
Windows, and Linux, and avoid remote application content. The font delivery path
therefore cannot depend on a CDN or network request at runtime.

## Decision drivers

- Load the required Geist families in development and packaged applications.
- Keep application startup and typography independent of network availability.
- Preserve explicit, legible system fallbacks if a font asset cannot load.
- Use variable fonts for the specified 400–700 UI weight range without bundling a
  separate file for every weight.
- Keep font ownership with the shared `@showflow/ui` visual foundation.
- Preserve the SIL Open Font License notice in the distributed dependencies.

## Considered options

| Option                               | Benefits                                                                                    | Costs and risks                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Pinned Fontsource variable packages  | Self-hosted WOFF2 subsets, Vite-compatible CSS, no runtime JavaScript, included OFL license | Adds two asset-only package dependencies and uses Fontsource family names in the CSS stack |
| Vendor upstream WOFF2 files directly | No package dependency and direct upstream artifacts                                         | Requires a repository-owned binary update process and custom subset/version tracking       |
| Remote font CDN                      | Small repository change                                                                     | Violates the local-content security posture and makes typography network-dependent         |
| System font name only                | No added assets                                                                             | Does not satisfy Sprint 3.1 on clean systems and varies by platform                        |

## Decision

Use pinned `@fontsource-variable/geist@5.3.0` and
`@fontsource-variable/geist-mono@5.3.0` runtime dependencies of
`@showflow/ui`.

- Import each package's normal `wght` stylesheet from the shared token stylesheet.
- Use `Geist Variable` as the first sans family and `Geist Mono Variable` as the
  first mono family while retaining the existing named and platform fallbacks.
- Apply the sans token globally in the renderer.
- Expose only semantic mono hooks for durations, timecode, measurements, and
  shortcuts; do not expose a generic mono utility.
- Use tabular numerals for duration, timecode, and measurement hooks.
- Package the Geist copyright and SIL Open Font License in
  `THIRD_PARTY_NOTICES.md` beside the application resources.
- Do not load either font from a remote origin.

## Consequences

### Positive

- Development and packaged builds render the specified typeface consistently.
- Unicode-range subsets let the browser load only the files needed for displayed
  text while Vite packages all required assets locally.
- Variable fonts cover the design system's weight range through one family per
  supported subset.
- System fallbacks remain available if font loading fails.

### Negative or limiting

- The UI package now owns two runtime asset dependencies and their version updates.
- The application bundle grows by the packaged WOFF2 subsets.
- Fontsource's internal family names must remain aligned with the semantic tokens.

## Compatibility and migration

No persisted data or desktop API migration is required. Existing components that
consume `--sf-font-sans` begin using the bundled family automatically. Future
duration, timecode, measurement, and shortcut components should use the matching
semantic class rather than assigning `--sf-font-mono` ad hoc.

## Validation

- Unit contract tests verify pinned dependencies, CSS imports, family order,
  fallback stacks, and restricted semantic mono hooks.
- Browser-level tests load both font families through Vite, verify the FontFaceSet,
  and assert computed Sans and Mono typography.
- Production packaging verifies that Vite emits the local WOFF2 assets.
- An Electron packaging test verifies that the Geist license notice accompanies
  those assets.

## References

- [Design System Specification §6, Typography](../design-system-spec-v1.0.md#6-typography)
- [Technical Specification §4.11, Styling](../technical-spec-v1.0.md#411-styling)
- [Implementation Plan, Sprint 3 Subtask 3.1](../implementation-plan-v1.0.md#31--load-geist-required)
- [ADR 0010, Initial Design Token Contract](0010-initial-design-token-contract.md)
