# Showflow repository instructions

These instructions apply to the entire repository. They summarize the execution
rules for coding agents; they do not replace the product specifications.

## Required reading and authority

Before implementing a feature or Sprint subtask, read:

1. [`docs/README.md`](docs/README.md) for document governance and terminology.
2. [`docs/architecture-prd-v1.3.md`](docs/architecture-prd-v1.3.md) for domain
   ownership, invariants, terminology, and MVP scope.
3. [`docs/ux-spec-v1.0.md`](docs/ux-spec-v1.0.md) for user-facing behavior.
4. [`docs/technical-spec-v1.0.md`](docs/technical-spec-v1.0.md) for implementation
   boundaries, security, persistence, testing, and distribution.
5. [`docs/design-system-spec-v1.0.md`](docs/design-system-spec-v1.0.md) for visual,
   interaction, accessibility, motion, and content rules.
6. The current Sprint and its dependencies in
   [`docs/implementation-plan-v1.0.md`](docs/implementation-plan-v1.0.md).

When specifications conflict, authority flows from Architecture PRD to UX
Specification to Technical Specification to Design System Specification. The
implementation plan sequences delivery but does not override those documents.
Existing code is authoritative only when it does not conflict with them.

Use canonical Showflow terminology in code, UI copy, documentation, and tests.
The canonical term is **Segment**, not “Moment.” Prefer **Show Blueprint** or
**default Storyboard** in user-facing copy. Do not expose OBS-oriented language
such as scenes, sources, buses, or binding-resolution errors in the primary UX.

## Working protocol

Before each Sprint or subtask:

1. Inspect the current implementation and worktree; do not assume prior planned
   tasks were completed exactly as written.
2. Read the controlling specifications and the task's dependencies.
3. Identify every `[DECISION REQUIRED]`, `[USE MVP DEFAULT]`, `[SPIKE]`, and
   `[DEFERRED]` item that touches the work.
4. Run the full existing test suite to establish a clean baseline. If no test
   suite exists yet, record that fact and run every available validation check.
5. Track the numbered subtasks and required test IDs for the current Sprint.

During implementation:

- Implement one numbered subtask at a time as the smallest coherent vertical slice.
- Add tests with behavior, not after an entire feature has been assembled.
- Keep changes scoped; do not pull future-Sprint work into the current task.
- Prefer dependencies named in the Technical Specification. A new framework or
  material dependency requires a concrete need and an Architecture Decision Record.
- Update documentation when behavior, architecture, commands, dependencies, or
  an approved decision changes.
- Preserve unrelated user changes in a dirty worktree.

At completion, report completed subtasks, tests and checks, migrations, dependency
changes, decisions, open issues, and the applicable Sprint exit criteria. Include
screenshots or recordings for user-visible changes where practical.

## Architectural invariants

Preserve these rules below the UI layer:

- A Studio contains Shows and may own shared Resources. A Show owns its Blueprint,
  Segment Catalog, Layout Catalog, Component Catalog, Show-scoped Resources, and
  Episodes; an Episode may own Episode-scoped Resources.
- A Show Blueprint is an ordered list of placements referencing Show Segments.
- Creating an Episode copies Blueprint ordering into an independent Episode
  Storyboard in one transaction; later Episode edits do not mutate the Blueprint.
- Segments, Layouts, and Components are created only at Show scope, including
  when creation begins from an Episode workflow.
- Episode Storyboards may reorder, duplicate, remove, and insert reusable Segments.
- Every Segment has exactly five closed lifecycle phases:
  `prepare`, `enter`, `active`, `exit`, and `cleanup`.
- Segments orchestrate Layout activation and high-level production actions.
- Layouts define reusable compositions and own Slots and Component Placements;
  Layouts do not have a lifecycle.
- Slots define position and accepted content roles. Component Placements connect
  Components to Slots, Resources, and Segment data.
- A Lower Third is a built-in Component type, not a separate architectural layer.
- Host Cues are manually triggered. Their lifetime and completion behavior must
  not turn them into automatic triggers.
- Stable UUIDs identify entities; display names are never primary references.
  Store timestamps as ISO 8601 UTC strings.
- The domain remains serializable and independent of Electron, React, Node file
  APIs, SQLite, operating-system APIs, and any execution engine such as OBS.
- Preview and rehearsal share normalized, deterministic, cancellable execution
  logic. Binding resolution is shared by preview, validation, and rehearsal.

## Application and Electron boundaries

Dependency direction flows inward:

```text
domain
  ↑
application
  ↑
adapters: persistence, resources, execution
  ↑
desktop main and preload
  ↑
renderer
```

The approved mutation path is:

```text
React component
  → versioned window.showflow API
    → typed and runtime-validated IPC handler
      → application command
        → repository interface
          → SQLite adapter
```

- Keep domain logic pure and product logic out of React event handlers.
- The renderer must have no direct Node.js access and must not import Electron,
  call `ipcRenderer`, access arbitrary paths, or execute SQL.
- Expose one narrow, namespaced preload API through `contextBridge`. Never expose
  raw Electron objects or a generic arbitrary IPC channel.
- Validate every IPC, persistence, import, settings, and file-boundary payload at
  runtime with Zod or an approved equivalent contract.
- Return explicit serializable DTOs and structured error envelopes across IPC;
  never return raw database rows or class instances.
- Keep multi-table commands transactional. Keep SQL migrations immutable,
  numbered, and forward-only.
- Resource access is by Resource ID through an allowlisted application protocol,
  not arbitrary renderer-visible file paths.
- Maintain Electron security defaults: context isolation and sandboxing enabled,
  Node integration disabled, restrictive CSP, validated IPC senders, controlled
  navigation, and deliberate device permissions.

## UX, design, and accessibility rules

- Keep the Storyboard or audience canvas as the dominant object and show one
  clear primary action per context.
- Keep Show scope and Episode scope unmistakable. Reuse the Storyboard and Segment
  editor shells without blurring ownership.
- Use production-language errors that identify what is wrong, where it occurs,
  what it blocks, and how to fix it.
- Use the dark-first Showflow design system, Geist, comfortable density, and
  centralized design tokens. Gold is reserved for selection, current state,
  primary focus, and key progress.
- Do not hardcode colors, spacing, radii, type hierarchy, or motion values inside
  feature components.
- Build keyboard operation, visible focus, semantic controls, non-color status
  communication, and reduced-motion behavior with each feature.
- Provide numeric inspector controls as accessible alternatives to canvas dragging.

## Prohibited and deferred patterns

Do not:

- Create Episode-only Segments, Layouts, or Components.
- Add arbitrary Stages, nested Storyboards, user-defined lifecycle phases,
  keyframes, multitrack timelines, or general-purpose automation.
- Turn the Layout editor into a general-purpose vector, graphic-design, or canvas tool.
- Implement live streaming, recording, OBS/Restream integration, cloud sync,
  collaboration, mobile apps, remote guests, telemetry, or other deferred work
  without a newer approved specification.
- Put business invariants only in UI validation or duplicate persisted entities
  in a long-lived transient UI store.
- Use `any`, unjustified non-null assertions, stringly typed entity kinds, hidden
  mutable global state, silent `catch` blocks, God objects, giant React components,
  circular workspace dependencies, or a dependency-injection framework.
- Introduce a generic admin template, foundational Tailwind dependency, second
  bundler, monorepo orchestrator, ORM, or native Node add-on outside an approved
  specification or spike outcome.
- Use glassmorphism, neumorphism, neon/gamer styling, decorative gradients,
  hardware skeuomorphism, dense dashboards, tiny body copy, or icon-only primary
  actions.
- Weaken or remove a passing test merely to make a build pass.

## Open-decision protocol

Interpret specification labels literally:

- `[REQUIRED]`: implement and test as written.
- `[USE MVP DEFAULT]`: use only the documented temporary behavior; do not broaden it.
- `[SPIKE]`: time-box the proof, document findings, and add tests. Do not let the
  experiment become production architecture accidentally.
- `[DECISION REQUIRED]` or **OPEN SPECIFICATION**: stop the affected portion,
  state the exact decision and source section, and continue only unrelated work.
- `[DEFERRED]`: do not implement in the current plan.

When no default exists, isolate a neutral placeholder, hide the feature, present
a clearly disabled control, or implement only the explicitly specified minimum.
Record the unresolved issue and preserve a replaceable boundary. Never silently
finalize permanent product behavior.

## Test gates and definition of done

Every later Sprint must continue running all earlier automated tests. Change a
test only when a newer approved specification changes the behavior or the test is
demonstrably incorrect.

Every pull request must eventually pass the root equivalents of:

1. Frozen-lockfile install.
2. Formatting check.
3. Lint.
4. Strict TypeScript typecheck.
5. Unit tests.
6. Renderer tests.
7. SQLite repository integration tests.
8. Production build.

Run Playwright browser-level tests for major workflows and keep Electron-specific
automation to a focused smoke suite. Platform packaging and smoke gates run on
macOS, Windows, and Linux where the current Sprint requires them.

A task is done only when relevant domain, persistence, accessibility, loading,
empty, error, success, autosave, and undo behavior is implemented and tested;
runtime boundaries are validated; user-facing copy uses production terminology;
design values use tokens; and no open specification has been silently finalized.
A rendered UI alone is not completion.

## Repository commands

The workspace is pinned to Node 24.18.0 and pnpm 11.4.0. Use the exact versions in
`.node-version` and the root `package.json`, and install with
`pnpm install --frozen-lockfile`. The commands below are required root contracts;
they become executable as their owning Sprint 0 subtasks add the desktop app and
code-quality tooling. Once defined, prefer them over package-local variants:

| Command                       | Purpose                                               |
| ----------------------------- | ----------------------------------------------------- |
| `pnpm dev`                    | Start the Electron desktop app in development mode    |
| `pnpm build`                  | Build all workspace packages                          |
| `pnpm typecheck`              | Run strict TypeScript checks                          |
| `pnpm lint`                   | Run lint checks                                       |
| `pnpm format`                 | Format repository files                               |
| `pnpm format:check`           | Check formatting without edits                        |
| `pnpm test`                   | Run workspace test suites                             |
| `pnpm test:unit`              | Run focused Vitest unit tests                         |
| `pnpm test:renderer`          | Run renderer tests with Testing Library and jsdom     |
| `pnpm test:coverage`          | Generate unit and renderer coverage reports           |
| `pnpm test:boundaries`        | Verify package and Electron process import boundaries |
| `pnpm test:spike:node-sqlite` | Run the packaged `node:sqlite` persistence proof      |
| `pnpm test:e2e`               | Run Playwright end-to-end tests                       |
| `pnpm test:e2e:browser`       | Run the browser renderer smoke suite                  |
| `pnpm test:e2e:electron`      | Package and run the Electron smoke suite              |
| `pnpm package`                | Package the desktop app locally                       |
| `pnpm make`                   | Create platform installer artifacts                   |

When commands change, keep the root `package.json`, this file, the root README,
and the Technical Specification aligned.
