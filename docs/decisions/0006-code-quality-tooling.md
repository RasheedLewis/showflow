# ADR 0006: Code Quality Tooling

- **Status:** Accepted
- **Date:** 2026-08-04
- **Sprint:** 0, Subtask 0.8

## Context

Showflow needs deterministic code-quality gates before the shared test harness
and continuous-integration workflow are introduced. The Technical Specification
requires Prettier, ESLint flat configuration, typescript-eslint, React Hooks
rules, strict TypeScript, and import-boundary enforcement.

Every workspace package also needs an independently executable TypeScript check.
Framework-neutral packages must not acquire renderer types accidentally, while
test files must remain part of their package's strict typecheck.

## Decision

- Pin ESLint `10.8.0`, `@eslint/js` `10.0.1`, typescript-eslint `8.66.0`,
  eslint-plugin-react-hooks `7.1.1`, globals `17.9.0`, and Prettier `3.9.6`.
- Use one root ESLint flat configuration for repository TypeScript, renderer
  React Hooks rules, Node-based configuration files, and tooling scripts.
- Treat explicit `any` and non-null assertions as errors. Require type-only
  imports where the imported symbol is used only as a type.
- Keep TypeScript's strict shared baseline authoritative for type analysis and
  add a `typecheck` script to every workspace package.
- Disable ambient `@types` acquisition for framework-neutral package projects.
  A package opts into an environment explicitly when its checked sources require
  it; the contracts package currently opts into Node types for its Node test.
- Include package tests in their owning package's TypeScript project.
- Use one root Prettier configuration. Exclude only dependencies, generated
  output, machine-managed lockfile content, and the approved top-level product
  specifications whose reviewed formatting is versioned independently.
- Retain `pnpm test:boundaries` as the architecture-specific import gate from
  ADR 0005; ESLint checks the gate's implementation without duplicating its
  centralized dependency policy.

## Consequences

- `pnpm lint`, `pnpm format:check`, and `pnpm typecheck` are stable root gates for
  local development and the Sprint 0.10 CI workflow.
- Workspace packages remain independently typecheckable and do not inherit DOM,
  React, Electron, or Node globals without an explicit choice.
- Adding a source environment, lint exception, or ignored path requires a narrow,
  reviewable configuration change.
