# Sprint 1 `node:sqlite` packaged-app spike

- **Status:** Complete for Subtasks 1.1 and 1.2
- **Date:** 2026-08-04
- **Platforms:** macOS arm64, Windows x64, and Linux x64
- **Scope:** Technical Specification §11.4 and Implementation Plan Subtasks 1.1–1.2

## Purpose

Prove that Electron's packaged main process can use `node:sqlite` for the
minimum persistence behaviors Showflow requires before production database
services depend on it.

This spike is isolated test infrastructure. It is not the production database
service, migration system, backup service, settings repository, or approval of
the final SQLite adapter.

## Packaged runtimes

| Target      | Electron | Bundled Node | SQLite   | Duration | Result |
| ----------- | -------- | ------------ | -------- | -------- | ------ |
| macOS arm64 | `43.3.0` | `24.18.1`    | `3.53.1` | 29.9 ms  | Pass   |
| Windows x64 | `43.3.0` | `24.18.1`    | `3.53.1` | 22.0 ms  | Pass   |
| Linux x64   | `43.3.0` | `24.18.1`    | `3.53.1` | 19.9 ms  | Pass   |

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

Each matrix run transferred nine database pages. The measured operation took
between 19.9 ms and 29.9 ms across the hosted runners. These timings are smoke
observations from one run per platform, not performance benchmarks.

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
- The spike succeeded from the ASAR-packaged application on all three required
  targets. No blocking `node:sqlite` API or packaging limitation was observed.
- The macOS and Windows packaged processes emitted no stability warnings.
- Electron Forge's Windows Squirrel maker loads `lodash` at package time but did
  not receive that transitive dependency in pnpm's isolated layout. Pinning the
  already-used `lodash` version as a direct desktop development dependency made
  Windows packaging deterministic. This issue was in the packaging toolchain,
  before the application or `node:sqlite` executed.
- GitHub's Linux runner cannot launch the unpacked Electron executable with its
  bundled Chromium SUID sandbox because the helper is not installed as
  `root:4755`. The CI-only spike launcher passes `--no-sandbox`; the spike exits
  before creating a renderer window, and this does not alter Showflow's runtime
  security defaults or packaged product arguments.
- Linux emitted four D-Bus connection messages because the headless runner has
  no session bus. They did not affect the database proof.
- Node 24 documents `node:sqlite` as release-candidate rather than fully stable.
  The earlier local Node harness emitted the associated experimental warning;
  none of the three packaged Electron evidence runs emitted it. The API status
  remains a material input to the adapter decision.

## Automated evidence

- `packages/persistence/src/spikes/node-sqlite-spike.test.mts` exercises the
  complete proof in the unit harness.
- `tests/electron/node-sqlite-spike.spec.ts` launches the packaged executable,
  validates the structured report, and confirms Electron `43.3.0` executed it.
- `pnpm test:spike:node-sqlite` provides the same structured packaged proof on
  every supported runner and rejects platform or architecture mismatches.
- The `Platform Packages and Persistence Spike` workflow packages, executes,
  validates, and retains reports for each target. Matrix run
  [30969115984](https://github.com/RasheedLewis/showflow/actions/runs/30969115984)
  passed all three jobs on commit `a64ad41`.
- The existing packaged Electron security smoke test continues to cover normal
  application startup and renderer isolation.

## Follow-up gate

The cross-platform gate is satisfied. Subtask 1.3 must now apply its documented
decision rule and record the SQLite adapter choice in ADR-0001 before Subtask
1.4 begins. This spike records evidence for that decision; it does not make the
decision itself.
