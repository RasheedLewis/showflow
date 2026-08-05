# Sprint 1 `node:sqlite` packaged-app spike

- **Status:** Complete for Subtask 1.1
- **Date:** 2026-08-04
- **Platform:** macOS arm64
- **Scope:** Technical Specification §11.4 and Implementation Plan Subtask 1.1

## Purpose

Prove that Electron's packaged main process can use `node:sqlite` for the
minimum persistence behaviors Showflow requires before production database
services depend on it.

This spike is isolated test infrastructure. It is not the production database
service, migration system, backup service, settings repository, or approval of
the final SQLite adapter.

## Packaged runtime

| Runtime      | Observed version |
| ------------ | ---------------- |
| Electron     | `43.3.0`         |
| Bundled Node | `24.18.1`        |
| SQLite       | `3.53.1`         |
| Platform     | `darwin`         |
| Architecture | `arm64`          |

The packaged Electron runtime uses Node `24.18.1`; this is distinct from the
repository tooling pin of Node `24.18.0`.

## Results

| Proof                                          | Result |
| ---------------------------------------------- | ------ |
| Open a file-backed database                    | Pass   |
| Create strict tables                           | Pass   |
| Write and read UTF-8 text                      | Pass   |
| Write, read, parse, and validate JSON with Zod | Pass   |
| Commit a transaction atomically                | Pass   |
| Roll back a transaction without partial writes | Pass   |
| Enforce foreign keys                           | Pass   |
| Enable and report WAL mode                     | Pass   |
| Create and independently open a backup         | Pass   |
| Run from the packaged application              | Pass   |

One evidence run transferred nine database pages and completed in approximately
14.4 ms. This timing is a smoke observation, not a performance benchmark.

## Implementation boundary

The packaged application runs the spike only when
`SHOWFLOW_NODE_SQLITE_SPIKE_REPORT_PATH` is explicitly set. It executes before
window creation, writes a structured report, and exits. Normal application
startup does not open a database or expose any persistence API to the renderer.

The reusable spike runner lives under `packages/persistence/src/spikes/` so the
behavior can be exercised in unit tests and from each packaged platform without
becoming the production adapter accidentally.

## Stability and packaging observations

- Electron Forge bundled `node:sqlite` without a native add-on, rebuild step, or
  extra unpack rule.
- The spike succeeded from the ASAR-packaged application.
- Node emitted its standard warning that SQLite remains experimental. This is a
  material input to the adapter decision and must remain documented.
- No macOS-specific API or packaging failure was observed.
- The spike does not yet establish Windows x64 or Linux x64 behavior.

## Automated evidence

- `packages/persistence/src/spikes/node-sqlite-spike.test.mts` exercises the
  complete proof in the unit harness.
- `tests/electron/node-sqlite-spike.spec.ts` launches the packaged executable,
  validates the structured report, and confirms Electron `43.3.0` executed it.
- The existing packaged Electron security smoke test continues to cover normal
  application startup and renderer isolation.

## Follow-up gate

Subtask 1.2 must run this same packaged proof on:

- macOS arm64
- Windows x64
- Linux x64

Only after that matrix passes, or documents a blocking limitation, may Subtask
1.3 approve `node:sqlite` or the `better-sqlite3` fallback in ADR 0011.
