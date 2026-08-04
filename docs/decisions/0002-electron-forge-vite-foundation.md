# ADR 0002: Electron Forge and Vite Foundation

- **Status:** Accepted
- **Date:** 2026-08-04
- **Sprint:** 0, Subtask 0.4

## Context

Showflow needs one supported desktop toolchain for development, renderer builds,
application packaging, and platform installer creation. The Technical
Specification requires Electron Forge's official Vite integration, independent
main and preload bundles, a React renderer, and a current stable Electron release
that is exact-pinned in the root lockfile.

## Decision

- Pin Electron `43.3.0`, Electron Forge `7.11.2`, Vite `8.2.0`, React `19.2.8`,
  and TypeScript `5.9.3`.
- Build the Electron main process, preload script, and renderer with separate
  Vite configurations.
- Keep the desktop package CommonJS-compatible for Electron's generated main
  bundle while using `.mts` Vite configuration files to make their module format
  explicit.
- Package application source in an ASAR archive.
- Configure Forge makers for macOS ZIP, Windows Squirrel, Linux DEB, and Linux
  RPM artifacts. Each operating system remains responsible for its own build.
- Expose root `dev`, `build`, `package`, and `make` commands.
- Keep the preload entry empty until the narrow, versioned `window.showflow` API
  is introduced in ADR 0004.

## Consequences

- The renderer starts with React but has no direct Node.js or Electron access.
- The initial main window explicitly enables context isolation and sandboxing and
  disables Node integration. The complete initial window policy is recorded in
  ADR 0003.
- Desktop TypeScript validation skips checking dependency declaration internals
  because Electron Forge `7.11.2` publishes unresolved declaration references;
  strict checking remains enabled for Showflow source.
- The exact dependency graph and approved lifecycle scripts are recorded in the
  root lockfile and workspace configuration.
