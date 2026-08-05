# ADR 0011: `node:sqlite` Adapter

- **Status:** Accepted
- **Date:** 2026-08-04
- **Sprint:** 1
- **Subtask:** 1.3
- **Deciders:** Showflow maintainers, applying the specification-defined decision rule
- **Supersedes:** None
- **Superseded by:** None

## Context

Showflow is local-first and requires one application-owned SQLite database. The
Architecture PRD delegates the local storage technology to a dedicated technical
specification while requiring serializable, execution-engine-independent domain
objects. Technical Specification §§11.3–11.4 prefer `node:sqlite` but require a
packaged-app spike before production persistence work may depend on it.

Sprint 1, Subtasks 1.1 and 1.2 exercised file-backed storage, strict tables,
UTF-8 and validated JSON round trips, transaction commit and rollback, foreign
keys, WAL mode, and backup from packaged Electron applications. The proof passed
on macOS arm64, Windows x64, and Linux x64 with Electron `43.3.0`, bundled Node
`24.18.1`, and SQLite `3.53.1`. No blocking API or distribution limitation was
observed.

The implementation plan calls the requested record “ADR-0001 SQLite adapter.”
ADR 0001 already records the workspace toolchain, and ADR 0009 requires
repository-wide monotonic numbering without renumbering accepted history. This
decision is therefore recorded as ADR 0011.

## Decision drivers

- Apply the explicit Sprint 1.3 rule after all required packaged tests pass.
- Keep domain and application APIs independent of the selected database driver.
- Avoid a third-party native add-on and `electron-rebuild` in the packaging path.
- Support prepared statements, transactions, foreign keys, WAL, backup, and
  validated JSON within the persistence adapter.
- Preserve a practical fallback if a future runtime exposes a blocking
  `node:sqlite` limitation or regression.

## Considered options

| Option           | Benefits                                                                                                         | Costs and risks                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `node:sqlite`    | Bundled with Electron's Node runtime; no third-party native add-on or rebuild; all required packaged proofs pass | Node 24 classifies the API as release-candidate, so Electron upgrades require compatibility validation                      |
| `better-sqlite3` | Mature synchronous API with broad prior usage                                                                    | Adds a native dependency, ABI/rebuild concerns, and platform packaging work without solving a failure observed by the spike |

## Decision

Use `node:sqlite` for Showflow's production SQLite adapter beginning with Sprint
1.4.

- Keep the driver import and driver-specific types inside `packages/persistence`.
- Expose persistence through application-owned repository and transaction
  interfaces; do not change domain or application APIs to mirror `node:sqlite`.
- Use prepared statements, explicit transactions, numbered SQL migrations, and
  explicit row mapping. Do not introduce an ORM.
- Treat the release-candidate API status as a monitored compatibility risk, not
  a blocking limitation under the validated Electron line.
- Rerun the packaged persistence matrix before accepting an Electron or bundled
  Node upgrade that can change SQLite behavior.
- Retain `better-sqlite3` only as the documented fallback. Adopting it requires
  evidence of a blocking limitation or regression and a superseding ADR that
  documents native-module packaging requirements.

## Consequences

### Positive

- Sprint 1.4 can build the database service on the specification's preferred
  driver with evidence from every required platform.
- Showflow avoids an additional native binary, ABI compatibility work, and an
  Electron rebuild step.
- Repository interfaces preserve driver replacement without leaking SQLite into
  the domain or renderer.

### Negative or limiting

- The API is release-candidate in Node 24 and may change across future Electron
  upgrades.
- The synchronous API must remain below asynchronous application boundaries and
  must not move database work into the renderer.
- The cross-platform matrix becomes a required compatibility gate for relevant
  Electron or Node upgrades.

## Compatibility and migration

No schema or data migration is required because the production database service
and schema do not yet exist. Subtask 1.4 will introduce the driver behind
application interfaces. A future fallback can replace the adapter without
changing domain entities or IPC contracts, subject to a superseding ADR and its
own packaging validation.

## Validation

- Unit spike: `packages/persistence/src/spikes/node-sqlite-spike.test.mts`
- Packaged Electron smoke: `tests/electron/node-sqlite-spike.spec.ts`
- Local packaged proof: `pnpm test:spike:node-sqlite`
- Cross-platform package and persistence matrix:
  [run 30969115984](https://github.com/RasheedLewis/showflow/actions/runs/30969115984)
- Recorded results:
  [`docs/spikes/sprint-1-node-sqlite-packaged-app.md`](../spikes/sprint-1-node-sqlite-packaged-app.md)

## References

- [Architecture PRD §34, Persistence and Identity](../architecture-prd-v1.3.md#34-persistence-and-identity)
- [Architecture PRD §40, Deferred Decisions](../architecture-prd-v1.3.md#40-deferred-decisions)
- [Technical Specification §11, Persistence](../technical-spec-v1.0.md#11-persistence)
- [Implementation Plan, Sprint 1 Subtask 1.3](../implementation-plan-v1.0.md#13--decide-sqlite-adapter-decision-required)
- [ADR 0009, Decision Record Governance](0009-decision-record-governance.md)
