# ADR 0004: Typed Runtime Information IPC

- **Status:** Accepted
- **Date:** 2026-08-04
- **Sprint:** 0, Subtask 0.6

## Context

Showflow needs a first end-to-end desktop API method that proves shared runtime
contracts, sender validation, structured IPC results, preload isolation, API
versioning, and renderer-side response validation without exposing Electron or a
generic channel mechanism.

## Decision

- Start the desktop API at version `1.0.0` and expose the constant through both
  `window.showflow.apiVersion` and the runtime information DTO.
- Expose one semantic method: `window.showflow.app.getRuntimeInfo()`.
- Return a serializable `ApiResult` containing application version, desktop API
  version, platform, and architecture.
- Keep the internal channel name in `@showflow/contracts`; it is not part of the
  renderer API.
- Pin Zod `4.4.3` in `@showflow/contracts` and use shared strict schemas for the
  request, response, DTO, and error envelope.
- Accept IPC only from the current main window's trusted main frame. Reject
  untrusted senders and unexpected payloads with structured error results.
- Parse the generated response in the main process and parse the received result
  again in preload before returning it to the renderer.
- Freeze the exposed API object and expose no raw `ipcRenderer`, channel argument,
  or generic `invoke` function.

## Consequences

- Breaking renderer-main contract changes require a desktop API version update.
- The contracts package becomes the single source of runtime API types and Zod
  schemas shared by main, preload, and renderer.
- Nine dependency-light Node tests cover valid and invalid contracts, structured
  handler failures, preload response validation, and the absence of generic
  invocation.
- The Playwright Electron harness in Subtask 0.9 can promote the manual runtime
  proof into the permanent 0.T5 and 0.T6 smoke coverage.
