# ADR 0003: BrowserWindow Security Policy

- **Status:** Accepted
- **Date:** 2026-08-04
- **Sprint:** 0, Subtask 0.5

## Context

Showflow's main renderer is a privileged application surface even though it has
no direct Node.js access. The desktop shell must load only trusted application
content, prevent unexpected navigation and child windows, move approved external
links to the operating-system browser, and ship with a restrictive Content
Security Policy.

## Decision

- Every main-window web preference is created by one policy function with Node
  integration disabled, context isolation and sandboxing enabled, web security
  enabled, insecure content disabled, webviews disabled, and drag navigation
  disabled.
- Packaged windows load only the generated local renderer file. Development may
  load only credential-free HTTP URLs on `localhost`, `127.0.0.1`, or `[::1]`.
- Top-level navigation remains within the trusted local file or development
  origin. All child-window requests are denied.
- Only credential-free HTTPS URLs are approved for `shell.openExternal`; other
  protocols and malformed URLs remain blocked.
- Renderer permissions, including device permissions, are denied by default
  until an owning feature implements and tests a deliberate permission flow.
- Production CSP permits only self-hosted scripts, styles, fonts, and connections;
  frames, forms, objects, and manifests are disabled. Vite development receives
  the smallest additional allowances required for loopback hot reload, its React
  refresh preamble, and injected development styles.

## Consequences

- A compromised renderer cannot navigate the Showflow window to remote content,
  spawn an Electron child window, embed a remote frame, or request device access
  through the default session policy.
- Application code must deliberately mark approved HTTPS links for external
  opening and handle any user-facing failure state when external links become a
  product feature.
- Camera and microphone work must replace the deny-by-default policy with a
  narrowly scoped, sender-validated permission decision.
- Five dependency-free Node tests cover the pure security policy now. Subtask 0.9
  still owns the Playwright Electron smoke test that verifies these controls in a
  running window.
