# ADR 0008: Continuous Integration Skeleton

- **Status:** Accepted
- **Date:** 2026-08-04
- **Sprint:** 0, Subtask 0.10

## Context

Showflow needs a pull-request gate that reproduces the repository's required
quality commands on a clean Linux runner. It also needs a cross-platform package
workflow boundary before signing, notarization, and release publishing are
specified or configured.

Workflow definitions are executable infrastructure. Syntax alone is insufficient:
required commands, platform coverage, permissions, and action pinning must remain
reviewable and automatically protected from accidental weakening.

## Decision

- Add `.github/workflows/quality.yml` for pull requests, updates to `main`, and
  manual runs on `ubuntu-24.04`.
- Run frozen installation, formatting, linting, strict typechecking, unit tests,
  renderer tests, architecture-boundary tests, and the production build in that
  order. Repository integration tests will join this gate when the persistence
  harness exists.
- Add `.github/workflows/package-platforms.yml` as a manual-only matrix using
  `macos-15` arm64, `windows-2025` x64, and `ubuntu-24.04` x64 runners.
- Produce platform-local packages with `pnpm package`, upload them as nonrelease
  artifacts for seven days, and fail when no package output is found.
- Do not read signing secrets, sign, notarize, publish, or create releases.
- Give both workflows only `contents: read` permission and disable persisted Git
  credentials after checkout.
- Use `pnpm/setup` because the repository is pinned to pnpm 11. Configure it with
  exact pnpm `11.4.0` and Node `24.18.0`, enable dependency caching, and keep the
  frozen install as an explicit auditable step.
- Pin third-party actions to immutable commits corresponding to checkout v7,
  pnpm/setup v1.0.0, and upload-artifact v7.
- Pin `yaml` `2.9.0` as a development-only parser. Vitest validates both workflow
  files, required triggers and commands, read-only permissions, platform matrix,
  immutable action references, and the absence of secrets or release operations.

## Consequences

- Pull requests and `main` updates share one deterministic quality gate with
  concurrency cancellation for superseded revisions.
- Platform packaging is available for deliberate smoke testing without implying
  release readiness or requiring credentials.
- Action upgrades, runner changes, and quality-gate changes require an explicit
  code review plus matching test updates.
- The Sprint 0 CI test can be completed by observing the quality workflow on the
  clean commit that introduces these files.
