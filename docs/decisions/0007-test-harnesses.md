# ADR 0007: Test Harnesses

- **Status:** Accepted
- **Date:** 2026-08-04
- **Sprint:** 0, Subtask 0.9

## Context

Showflow needs fast deterministic tests below the desktop boundary, browser-level
renderer coverage with a mock preload API, and a deliberately small Electron
smoke suite. The harness must preserve strict package boundaries and make test
configuration itself part of the TypeScript quality gate.

The current foundation already has contract, security, IPC, and architecture
tests. Subtask 0.9 must retain their behavior while establishing the specified
Vitest, React Testing Library, and Playwright paths.

## Decision

- Pin Vitest and `@vitest/coverage-v8` at `4.1.10`.
- Pin React Testing Library `16.3.2`, Testing Library DOM `10.4.1`,
  jest-dom `7.0.0`, and jsdom `30.0.1` for renderer tests.
- Pin Playwright Test `1.62.1` and install its matching Chromium runtime outside
  the repository.
- Run package, main-process, and preload unit tests in Vitest's Node environment.
  Run renderer tests under a separate jsdom configuration with shared cleanup
  and jest-dom matchers.
- Keep framework-neutral production TypeScript projects free of test environment
  globals. When a package owns tests that need them, use a separate strict test
  TypeScript project; the contracts package establishes this pattern.
- Typecheck root scripts, configuration, Playwright support, and end-to-end tests
  through `tsconfig.tools.json`.
- Provide a typed `ShowflowDesktopApi` fixture that Playwright installs before a
  browser page loads. Browser tests run the Vite renderer without Electron.
- Package Showflow before the Electron smoke suite and launch the packaged
  executable through Playwright. The initial smoke verifies renderer isolation,
  preload availability, runtime IPC, main rendering, and blocked untrusted
  navigation.
- Write Vitest coverage to `coverage/unit` and `coverage/renderer`; write
  Playwright artifacts to `test-results/playwright` and HTML reports to
  `playwright-report`. These generated paths remain ignored by Git and Prettier.

## Consequences

- `pnpm test` runs unit and renderer tests without requiring Electron.
- `pnpm test:e2e:browser` is the preferred stable UX harness, while
  `pnpm test:e2e:electron` is intentionally slower and security-focused.
- `pnpm test:e2e` packages the app and runs both Playwright projects.
- Database-open and native-import-dialog Electron smoke cases remain pending
  until their owning persistence and resource subtasks provide real adapters;
  this harness does not introduce fake production behavior for them.
