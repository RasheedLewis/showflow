# ADR 0005: Package Boundary Enforcement

- **Status:** Accepted
- **Date:** 2026-08-04
- **Sprint:** 0, Subtask 0.7

## Context

Showflow's eight workspace packages existed as manifests, but most had no public
source entry and no automated enforcement of the inward dependency graph. The
domain and renderer isolation tests must work before the repository introduces
ESLint in Subtask 0.8 or Vitest in Subtask 0.9.

## Decision

- Give every `@showflow/*` package an explicit `src/index.ts` root export.
- Use `pnpm test:boundaries` as a dependency-free Node architecture gate.
- Parse TypeScript syntax rather than searching raw text so static imports,
  re-exports, dynamic imports, and `require` calls are checked consistently.
- Require workspace imports to use declared dependencies and public package roots.
- Enforce these allowed inward edges:

  | Consumer              | Allowed Showflow dependencies                               |
  | --------------------- | ----------------------------------------------------------- |
  | `domain`              | None                                                        |
  | `application`         | `domain`                                                    |
  | `contracts`           | `domain`                                                    |
  | `persistence`         | `application`, `domain`                                     |
  | `resources`           | `application`, `domain`                                     |
  | `execution-contracts` | `domain`                                                    |
  | `ui`                  | `contracts`, `domain`                                       |
  | `test-fixtures`       | `application`, `contracts`, `domain`, `execution-contracts` |
  | Desktop main          | All non-UI production packages                              |
  | Desktop preload       | `contracts` only                                            |
  | Renderer              | `contracts`, `domain`, `execution-contracts`, `ui`          |

- Keep domain, application, contracts, resources, execution contracts, and test
  fixtures independent of Electron, React, Node APIs, and SQLite adapters. Allow
  persistence to use Node and SQLite but not Electron or React. Keep shared UI
  independent of Electron and Node APIs.
- Reject renderer Electron, Node, and raw `ipcRenderer` access and reject cycles
  among workspace dependencies.

## Consequences

- Boundary failures are fast, deterministic, and independent of lint or test
  framework installation.
- Subtask 0.8 can call the same gate from quality tooling rather than duplicating
  architecture rules in several configurations.
- A deliberate architectural change must update the specification or an approved
  ADR and the centralized policy table together.
