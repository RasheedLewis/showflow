# Showflow
## Technical Specification
### Version 1.0 — Desktop Producing MVP

**Document status:** Implementation-oriented first pass  
**Primary audience:** Codex coding agents and software engineers  
**Companion documents:**
- Showflow Architecture PRD v1.3
- Showflow MVP UX Specification v1.0

**Reference development environment:** macOS on Apple Silicon  
**Target platforms:** macOS, Windows, and Linux  
**Current scope:** Design Show, Produce Episode, preview, and rehearsal  
**Excluded from this version:** Live broadcasting, OBS integration, cloud sync, mobile applications, and advanced media processing

---

# 1. Purpose

This document defines the initial technical architecture for Showflow.

It translates the product architecture and UX into engineering boundaries that a coding agent must preserve. It is intentionally opinionated where a clear decision reduces implementation friction. Areas that remain unresolved are explicitly marked **OPEN TECHNICAL SPECIFICATION**.

Showflow is a desktop-first, local-first creative production application. It should be pleasant to build, predictable to test, and structured so that future broadcast, mobile, and cloud capabilities do not require rewriting the core domain.

The coding agent must optimize for:

1. A coherent end-to-end Producing MVP.
2. Strong separation between product logic and Electron.
3. Familiar, well-documented TypeScript tooling.
4. Minimal native build complexity.
5. Cross-platform compatibility.
6. Security at the renderer boundary.
7. Replaceable adapters for persistence, media, and execution engines.
8. Code that a human engineer can understand and continue maintaining.

---

# 2. Authoritative Document Order

When documents conflict, use this order:

1. **Architecture PRD v1.3** for domain ownership and invariants.
2. **MVP UX Specification v1.0** for user-facing behavior.
3. **Technical Specification v1.0** for implementation decisions.
4. Existing code only when it does not conflict with the three documents above.

The coding agent must not change product terminology or ownership rules to simplify implementation.

---

# 3. Platform Strategy

## 3.1 Primary Platform

The primary development, testing, and first quality-reference platform is:

```text
macOS
Apple Silicon
```

All MVP workflows must work well on the current supported macOS release running on Apple Silicon.

## 3.2 Desktop Targets

Showflow targets one desktop codebase for:

| Platform | Architecture | Initial support level |
|---|---:|---|
| macOS | arm64 | Primary and fully tested |
| macOS | x64 | Supported where practical |
| Windows | x64 | Supported and CI-built |
| Linux | x64 | Supported as beta initially |

Linux support must remain architecturally valid but should not block the first usable macOS build because Linux device, codec, and packaging environments vary more widely.

## 3.3 Future Platforms

Future companion surfaces may include:

- iPhone
- iPad
- Android phone
- Android tablet
- A browser-based local remote

These are not full desktop ports in the MVP.

The likely first mobile experience is a companion for:

- Current Segment
- Next Segment
- Notes
- Host Cues
- Timing
- Preview or confidence monitoring
- Remote control

## 3.4 Platform Principle

Do not place Electron, Node, file-system, or operating-system APIs inside the domain or application packages.

Future clients should be able to reuse TypeScript domain logic without importing Electron.

---

# 4. Chosen Technology Stack

## 4.1 Desktop Runtime

**Electron**

Initial repository baseline:

- Use a current stable Electron release.
- At the time this document was written, Electron 43 is the reference stable line.
- Pin the exact working version in `pnpm-lock.yaml`.
- Never use Electron nightly, alpha, or beta releases for the main branch.
- Track Electron's supported release lines and security updates.

## 4.2 Packaging and Build Pipeline

**Electron Forge**

Use the official Electron Forge Vite integration.

Reasons:

- One official toolchain for development, packaging, makers, signing hooks, and publishing.
- Less custom build glue.
- Familiar Electron project structure.
- Easier Codex reasoning than combining unrelated packaging systems.

## 4.3 Frontend Build Tool

**Vite**

Use separate Vite build entries for:

- Electron main process
- Preload script
- Renderer

Avoid a second bundler unless an unavoidable packaging requirement appears.

## 4.4 UI Framework

- React
- TypeScript
- React Router using a hash-based router for desktop navigation

Use React for the renderer only. Do not render UI from the Electron main process.

## 4.5 Package Manager and Monorepo

- pnpm workspaces
- A single root lockfile
- Corepack or the `packageManager` field to pin pnpm
- No Turborepo, Nx, Rush, or other monorepo orchestrator in the MVP

Electron Forge expects dependencies to be available through a conventional `node_modules` layout. Configure:

```ini
# .npmrc
node-linker=hoisted
```

Use `workspace:*` for internal package dependencies.

## 4.6 Language

Use TypeScript everywhere possible:

- Domain
- Application services
- IPC contracts
- Electron main
- Preload
- Renderer
- Tests
- Build configuration

Required compiler settings include:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitOverride": true,
  "noFallthroughCasesInSwitch": true
}
```

Do not disable strictness to resolve implementation errors.

## 4.7 Runtime Validation

Use **Zod** for:

- IPC request validation
- IPC response validation
- Persisted JSON validation
- Import validation
- Settings validation
- Domain data crossing trust boundaries

Static TypeScript types are not a substitute for runtime validation.

## 4.8 Renderer State

Use two deliberately separate state mechanisms:

### Persisted server-like state

Use **TanStack Query** for data loaded or mutated through the desktop API:

- Studios
- Shows
- Blueprints
- Segments
- Layouts
- Episodes
- Resources
- Validation results

Although the data is local, the renderer communicates with another process asynchronously. Treat that boundary like an application API.

### Transient editor state

Use **Zustand** only for nonpersistent UI state:

- Current selection
- Open panel
- Drag state
- Canvas zoom
- Temporary preview state
- Unsaved text buffer before debounce
- Editor focus and mode

Do not duplicate persisted entities in a long-lived Zustand store.

## 4.9 Forms

Use **React Hook Form** where forms contain multiple validated fields.

Simple one-field inline edits may use controlled React state.

Use Zod adapters for form validation where practical.

## 4.10 UI Primitives

Use accessible headless primitives rather than a full visually opinionated UI kit.

Recommended baseline:

- Radix UI primitives for dialogs, popovers, menus, tabs, tooltips, and accessible overlays
- Custom Showflow components built on top of those primitives

Do not import a large dashboard template or generic admin UI framework.

## 4.11 Styling

Use:

- CSS Modules
- CSS custom properties for design tokens
- A central token package
- Plain CSS for layout and animation

Do not use inline hardcoded colors throughout React components.

Do not make Tailwind CSS a foundational dependency for v1.0. A later Design System decision may revisit this.

## 4.12 Drag and Drop

Use `@dnd-kit` for Storyboard and Catalog drag-and-drop if a short prototype confirms:

- Reliable pointer behavior
- Keyboard alternatives
- Correct auto-scroll
- Smooth behavior inside Electron

Keep drag semantics behind feature-level hooks so the dependency can be replaced.

Do not use native HTML drag-and-drop as the sole implementation for core editing interactions.

---

# 5. Repository Structure

Use a pnpm workspace with this initial structure:

```text
showflow/
├── apps/
│   └── desktop/
│       ├── src/
│       │   ├── main/
│       │   ├── preload/
│       │   └── renderer/
│       ├── forge.config.ts
│       ├── vite.main.config.ts
│       ├── vite.preload.config.ts
│       ├── vite.renderer.config.ts
│       └── package.json
│
├── packages/
│   ├── domain/
│   ├── application/
│   ├── contracts/
│   ├── persistence/
│   ├── resources/
│   ├── execution-contracts/
│   ├── ui/
│   └── test-fixtures/
│
├── docs/
│   ├── README.md
│   ├── architecture-prd-v1.3.md
│   ├── ux-spec-v1.0.md
│   ├── technical-spec-v1.0.md
│   ├── design-system-spec-v1.0.md
│   └── implementation-plan-v1.0.md
│
├── migrations/
├── scripts/
├── .github/
│   └── workflows/
├── .npmrc
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
└── pnpm-lock.yaml
```

## 5.1 Package Responsibilities

### `packages/domain`

Contains:

- Canonical domain types
- Entity factories
- Pure domain validation
- Invariants
- Value objects
- Pure transformation functions
- Lifecycle constants
- Domain errors

Must not import:

- Electron
- React
- Node file APIs
- SQLite
- Browser globals

### `packages/application`

Contains:

- Use cases
- Commands
- Queries
- Repository interfaces
- Transaction interface
- Validation orchestration
- Episode creation from Blueprint
- Reorder, duplicate, insert, and remove logic
- Undo command definitions
- Application-level error mapping

May import `domain`.

Must not import Electron or React.

### `packages/contracts`

Contains serializable API contracts shared by:

- Renderer
- Preload
- Main process

Includes:

- Zod request schemas
- Zod response schemas
- DTO types
- Error envelopes
- Event contracts
- API version constants

Contracts must use plain serializable data.

### `packages/persistence`

Contains:

- SQLite adapter
- Migrations
- Repository implementations
- Row mapping
- Transaction implementation
- Database backup helpers

May import `application` repository interfaces and `domain`.

Must not import React.

### `packages/resources`

Contains:

- Resource metadata logic
- File validation
- Hashing interfaces
- Thumbnail cache interfaces
- Resource URL resolution
- File-location abstractions

Operating-system implementations remain in the desktop app or adapters.

### `packages/execution-contracts`

Contains future-engine-neutral instructions such as:

- Activate Layout
- Show Component
- Hide Component
- Play Resource
- Stop Resource
- Run enter animation
- Run exit animation

It must not import OBS-specific types.

### `packages/ui`

Contains reusable Showflow UI components and design tokens:

- Button
- Card
- Panel
- Dialog
- Tabs
- Inspector field
- Empty state
- Validation badge
- Storyboard card shell

Do not put feature-specific business logic here.

### `packages/test-fixtures`

Contains deterministic builders and sample data for tests and Storybook-like development pages.

---

# 6. Dependency Direction

The dependency graph must flow inward:

```text
domain
  ↑
application
  ↑
adapters: persistence, resources, execution
  ↑
desktop main/preload
  ↑
renderer
```

UI may consume DTOs and shared domain constants, but it must not bypass application use cases to mutate persistent data.

Forbidden examples:

```text
React component → raw SQL
React component → fs.readFile
React component → ipcRenderer
Domain package → Electron dialog
Persistence package → React hook
```

Allowed example:

```text
React component
→ desktop API client
→ typed IPC handler
→ application command
→ repository interface
→ SQLite adapter
```

---

# 7. Electron Process Architecture

## 7.1 Main Process Responsibilities

The Electron main process owns:

- Application lifecycle
- Window creation
- Native menus
- Native file dialogs
- OS integration
- Permission handlers
- Custom resource protocol
- Database service initialization
- IPC registration
- Background process coordination
- Packaging environment behavior
- Future execution-engine adapters

It must not contain React UI code.

## 7.2 Renderer Responsibilities

The renderer owns:

- React UI
- Navigation
- Storyboard interaction
- Segment and Layout editors
- Forms
- Canvas composition
- Preview controls
- Rehearsal UI
- Accessibility behavior
- Query cache
- Transient editor state

The renderer must not have direct Node.js access.

## 7.3 Preload Responsibilities

The preload script exposes one narrow, versioned API:

```ts
window.showflow
```

It wraps approved IPC calls using `contextBridge`.

It must not expose:

- `ipcRenderer`
- `require`
- File-system methods
- Shell execution
- Generic channel invocation
- Arbitrary path reads
- Raw database methods

## 7.4 Utility Processes

Do not add a utility process merely for architectural purity.

Use Electron utility processes for tasks that are demonstrably:

- CPU intensive
- Crash prone
- Long running
- Unsafe to run on the main thread

Likely future utility-process tasks:

- Media probing
- Video thumbnail extraction
- Waveform generation
- Resource hashing for large files
- Transcoding
- Future FFmpeg work
- Execution-engine helpers

The MVP database may run in the main process if operations remain small and transactional. Preserve repository boundaries so it can move to a utility process later.

---

# 8. Electron Security Requirements

Every `BrowserWindow` must use:

```ts
{
  webPreferences: {
    preload: PRELOAD_PATH,
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true
  }
}
```

## 8.1 Required Security Controls

- Load only local application content in the main window.
- Define a restrictive Content Security Policy.
- Deny unexpected navigation.
- Open approved external links through the operating system browser.
- Validate the sender of privileged IPC messages.
- Validate every IPC payload at runtime.
- Never evaluate arbitrary JavaScript.
- Never pass unsanitized shell commands.
- Never expose arbitrary file paths through the preload API.
- Disable or tightly control remote content.
- Handle camera and microphone permissions deliberately.
- Use Electron fuses during packaging where appropriate.
- Keep Electron within a supported release line.

## 8.2 IPC Security

The renderer must call semantic methods:

```ts
window.showflow.shows.create(input)
window.showflow.episodes.createFromBlueprint(input)
window.showflow.resources.import(input)
```

It must not call:

```ts
window.showflow.invoke("any-channel", arbitraryData)
```

---

# 9. Desktop API and IPC Contracts

## 9.1 API Shape

Use a namespaced API:

```ts
interface ShowflowDesktopApi {
  app: AppApi;
  studios: StudiosApi;
  shows: ShowsApi;
  blueprints: BlueprintsApi;
  segments: SegmentsApi;
  layouts: LayoutsApi;
  components: ComponentsApi;
  resources: ResourcesApi;
  episodes: EpisodesApi;
  rehearsal: RehearsalApi;
  validation: ValidationApi;
}
```

## 9.2 Request Pattern

Use request-response calls for:

- Queries
- Commands
- Native dialogs
- File import
- Preview setup

Use events for:

- Save status
- Import progress
- Device changes
- Background task progress
- Rehearsal runtime updates

## 9.3 Response Envelope

Use a serializable discriminated union:

```ts
type ApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
      };
    };
```

Do not throw unstructured errors across IPC.

## 9.4 Contract Versioning

Expose an API version:

```ts
window.showflow.apiVersion
```

Changes that break renderer-main compatibility require a version update.

## 9.5 DTO Rule

Do not send class instances, functions, database rows, Node buffers without a defined contract, or objects with prototypes across IPC.

Use:

- Strings
- Numbers
- Booleans
- Null
- Arrays
- Plain objects
- Explicit byte arrays only when necessary

Represent timestamps as ISO 8601 UTC strings.

Represent IDs as UUID strings.

---

# 10. Domain Implementation Rules

## 10.1 Canonical IDs

Use `crypto.randomUUID()` for entity identifiers.

Do not use display names as identifiers.

## 10.2 Canonical Timestamps

Store:

- `createdAt`
- `updatedAt`

as UTC timestamps.

## 10.3 Fixed Lifecycle

Represent Segment lifecycle phases as a closed union:

```ts
type SegmentLifecyclePhase =
  | "prepare"
  | "enter"
  | "active"
  | "exit"
  | "cleanup";
```

Do not model phases as user-created database records.

## 10.4 Show-Scoped Creation

Application commands must enforce:

- Segments are created at Show scope.
- Layouts are created at Show scope.
- Components are created at Show scope.
- Episode creation from an Episode context still writes the reusable object to the Show.

This must be enforced below the UI layer.

## 10.5 Episode Creation

`CreateEpisodeFromBlueprint` must execute as one transaction:

1. Create Episode.
2. Read ordered Blueprint placements.
3. Create Episode Segments.
4. Copy placement defaults.
5. Link each Episode Segment to its Show Segment.
6. Preserve order.
7. Commit.
8. Return the complete Episode summary.

A failure must not leave a partially created Episode.

## 10.6 Pure Domain Logic

Keep the following as pure functions where possible:

- Reordering
- Duplicate placement logic
- Readiness calculation
- Binding compatibility
- Lifecycle validation
- Episode creation mapping
- Expected runtime summation
- Resource requirement extraction

Pure functions should receive data and return results without hidden I/O.

---

# 11. Persistence

## 11.1 Persistence Model

Showflow is local-first.

The MVP uses:

- One application-owned SQLite database
- Linked media files
- Application-owned derived caches
- No cloud database
- No account requirement

## 11.2 Database Location

Store the database under Electron's `app.getPath("userData")`.

Example logical layout:

```text
userData/
├── showflow.sqlite
├── backups/
├── cache/
│   ├── thumbnails/
│   └── previews/
└── logs/
```

Do not store the primary database inside the Git repository or application bundle.

## 11.3 SQLite Driver Decision

Preferred initial implementation:

```text
node:sqlite
```

Rationale:

- Available in the Node runtime bundled with the selected Electron line.
- Avoids third-party native Node add-ons.
- Avoids `electron-rebuild` in the critical path.
- Uses prepared statements and transactions directly.

However, the Node 24 `node:sqlite` API is a release-candidate API rather than a fully stable API.

Therefore, before building persistence-dependent features, complete the spike in Section 11.4.

## 11.4 REQUIRED PERSISTENCE SPIKE

Create a minimal branch or test application that verifies all of the following in the packaged Electron application:

1. Open a file-backed database.
2. Run migrations.
3. Insert and retrieve UTF-8 text.
4. Insert and retrieve JSON text.
5. Execute a transaction and rollback.
6. Enable foreign keys.
7. Use WAL mode.
8. Back up the database.
9. Package and run on macOS arm64.
10. Build and smoke-test on Windows x64.
11. Build and smoke-test on Linux x64.

If the spike succeeds, use `node:sqlite`.

If it fails or requires unsupported behavior, implement the same repository interfaces using `better-sqlite3` and document the native module packaging requirements.

Do not change application or domain APIs based on the selected driver.

## 11.5 ORM Decision

Do not introduce an ORM in the first persistence implementation.

Use:

- Numbered SQL migrations
- Prepared statements
- Small repository classes
- Explicit row-to-domain mapping
- Zod validation for JSON columns

The schema is specialized and the repository boundaries already provide abstraction. An ORM may be reconsidered only if it demonstrably reduces complexity.

## 11.6 Database Configuration

At initialization:

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
```

Use transactions for all multi-table commands.

## 11.7 Migrations

Store migrations as immutable numbered SQL files:

```text
migrations/
001_initial.sql
002_resource_metadata.sql
003_validation_indexes.sql
```

Maintain a schema migration table.

Rules:

- Never edit an applied migration.
- Add a new migration.
- Run migrations before loading application data.
- Back up the database before destructive migrations.
- Fail startup clearly if a migration cannot complete.

## 11.8 Logical Tables

The first schema should include conceptually distinct tables for:

- studios
- shows
- show_blueprints
- blueprint_segment_placements
- show_segments
- segment_data_fields
- segment_lifecycle_configs
- layouts
- slots
- components
- component_placements
- host_cues
- resources
- episodes
- episode_segments
- app_settings
- schema_migrations

Some flexible configuration may be stored as validated JSON text, including:

- Lifecycle action lists
- Animation settings
- Binding configuration
- Cue completion configuration
- Notes template formatting
- Local override configuration

Core ownership and ordering relationships should remain relational.

## 11.9 Ordering

Use explicit integer ordering columns.

Reordering commands must update order in one transaction.

The initial implementation may renumber all sibling positions after a reorder. Optimize with fractional ordering only if profiling shows a need.

## 11.10 Backup

At minimum:

- Create a timestamped database backup before schema migration.
- Keep a small rolling number of backups.
- Do not include cache files in the backup.

**OPEN TECHNICAL SPECIFICATION — User-facing project export**

Portable Show or Studio export has not been designed. Do not equate internal database backup with project export.

---

# 12. Resource and File Architecture

## 12.1 MVP Resource Strategy

Resource metadata lives in SQLite.

Original media files remain linked at their existing file-system paths.

The MVP does not automatically duplicate every video into application storage.

This avoids unexpectedly copying very large media files.

## 12.2 Stored Resource Metadata

Store:

- Resource ID
- Scope
- Display name
- Original filename
- Absolute local path
- MIME type
- Resource category
- File size
- Modified timestamp
- Optional content hash
- Width and height when available
- Duration when available
- Availability state
- Thumbnail cache key
- Created and updated timestamps

## 12.3 Import Meaning

In the MVP, **Import** means:

1. Select or drop a file.
2. Validate supported type.
3. Record Resource metadata.
4. Generate derived preview metadata.
5. Link the Resource to its original path.

The UI should still use the product word **Import**, not **Link**, unless later UX research changes it.

## 12.4 Missing Files

On access:

- Verify the file exists.
- Mark missing Resources.
- Preserve metadata and usages.
- Offer Locate or Replace.
- Never silently delete references.

## 12.5 Derived Files

Thumbnails, waveform data, and preview caches are disposable.

Store them under the app cache directory, keyed by:

- Resource ID
- Source modification timestamp
- Derivation version

They may be regenerated at any time.

## 12.6 Resource Protocol

Register a custom secure protocol such as:

```text
showflow-resource://resource/<resource-id>
```

The renderer requests by Resource ID, never by arbitrary path.

The main process:

1. Resolves the ID through the Resource repository.
2. Verifies access.
3. Serves or streams the file.
4. Rejects path traversal and unknown IDs.
5. Sets appropriate MIME information.

Do not expose unrestricted `file://` paths to renderer components.

## 12.7 File Drop

Renderer drag-and-drop must send file references through the approved desktop API.

Do not trust MIME type or extension alone; validate both where practical.

## 12.8 Large Files

Do not read an entire video or audio file into memory.

Use streams, file URLs through the custom protocol, or browser media loading.

## 12.9 Resource Portability

**OPEN TECHNICAL SPECIFICATION — Managed library and packaging**

The following are deferred:

- Copy into managed library
- Consolidate project media
- Export a portable Show package
- Relink an entire folder
- Cloud asset storage
- Proxy media
- Shared network volumes

Keep resource access behind interfaces so these modes can be added later.

---

# 13. Media Architecture

## 13.1 MVP Principle

Use Chromium's native media elements for simple preview:

- `<video>`
- `<audio>`
- `<img>`
- Canvas capture only for derived thumbnails when needed

Do not bundle FFmpeg merely to display media.

## 13.2 Video and Audio Metadata

First attempt to derive metadata through browser media APIs.

If unsupported metadata is required, add a separate media-probe adapter.

## 13.3 FFmpeg

**DEFERRED UNTIL REQUIRED**

Do not add FFmpeg or `ffprobe` in the initial Storyboard and Layout milestones.

When required:

- Invoke a pinned bundled executable directly.
- Run it outside the renderer.
- Prefer a utility process.
- Do not use an abandoned wrapper library.
- Treat process output as untrusted input.
- Include licensing and distribution review.

## 13.4 Camera and Microphone

Use browser media-device APIs behind a device service abstraction.

The renderer may request a preview stream only through deliberate permission handling.

Store a logical input preference, not a promise that a physical device will always exist.

Required device states:

- Available
- Permission required
- Unavailable
- Disconnected

## 13.5 Audio Routing

Advanced audio routing is outside the Producing MVP.

Do not build:

- Mix buses
- Per-device monitoring
- Virtual audio devices
- Compression chains
- VST hosting
- Multichannel routing

The initial preview may play simple media audio through the default output.

## 13.6 Codec Support

Use the codecs available in the bundled Chromium runtime for MVP preview.

Display a production-language error when a file cannot be played.

Do not promise universal codec support until a dedicated media-engine specification exists.

---

# 14. Renderer Architecture

## 14.1 Route Structure

Use a hash router with routes similar to:

```text
/#/studio/new
/#/studio/:studioId
/#/studio/:studioId/show/new
/#/studio/:studioId/show/:showId
/#/studio/:studioId/show/:showId/design/blueprint
/#/studio/:studioId/show/:showId/design/segments
/#/studio/:studioId/show/:showId/design/segments/:segmentId
/#/studio/:studioId/show/:showId/design/layouts
/#/studio/:studioId/show/:showId/design/layouts/:layoutId
/#/studio/:studioId/show/:showId/episodes/new
/#/studio/:studioId/show/:showId/episodes/:episodeId
/#/studio/:studioId/show/:showId/episodes/:episodeId/segments/:episodeSegmentId
/#/studio/:studioId/show/:showId/episodes/:episodeId/rehearse
```

URLs should represent durable navigation context.

Transient panel state does not need to be encoded in the URL unless deep linking benefits users.

## 14.2 Feature Organization

Organize renderer code by feature:

```text
renderer/
├── app/
├── features/
│   ├── studios/
│   ├── shows/
│   ├── blueprint/
│   ├── storyboard/
│   ├── segments/
│   ├── layouts/
│   ├── components/
│   ├── resources/
│   ├── validation/
│   └── rehearsal/
├── shared/
│   ├── api/
│   ├── hooks/
│   ├── routing/
│   └── utilities/
└── styles/
```

Avoid one enormous global `components/` folder.

## 14.3 Business Logic

React components should:

- Render state
- Collect user intent
- Call feature hooks or application clients

React components should not:

- Decide domain ownership
- Construct SQL
- Implement Episode copying
- Validate all binding rules
- Access files
- Know OBS concepts

## 14.4 Query Keys

Define query keys centrally by domain.

Example:

```ts
showKeys.detail(showId)
blueprintKeys.byShow(showId)
segmentKeys.catalog(showId)
episodeKeys.detail(episodeId)
```

After a mutation, update or invalidate the smallest relevant cache scope.

## 14.5 Optimistic Updates

Use optimistic updates only for low-risk, reversible interactions:

- Reordering
- Renaming
- Simple field editing
- Selection-independent metadata

For destructive operations and complex transactional creation, wait for backend success before declaring completion.

## 14.6 Loading and Errors

Use:

- Skeletons for initial content
- Inline field errors
- Feature error boundaries
- A top-level fatal error boundary
- Retry only for operations that can safely be retried

Do not hide failed saves.

---

# 15. Storyboard Implementation

## 15.1 Data Model

A Storyboard renders ordered placement DTOs.

The renderer should not infer ordering from array position without a persisted order field.

## 15.2 Card Rendering

Use DOM-based cards.

Thumbnails may begin as:

- Layout snapshots
- Representative images
- Neutral placeholders

Do not block structural MVP work on perfect rendered thumbnails.

## 15.3 Reordering

Implement through an application command:

```ts
ReorderBlueprintPlacements
ReorderEpisodeSegments
```

The command receives:

- Parent ID
- Ordered list of child IDs or source and destination indices
- Expected revision if concurrency protection is added

The repository persists the new order transactionally.

## 15.4 Duplicate Semantics

Blueprint duplicate:

- Creates a new placement.
- References the same Show Segment.

Episode duplicate:

- Creates a new Episode Segment.
- Copies Episode data, notes, and supported overrides.
- Retains the same source Show Segment.

## 15.5 Virtualization

Do not virtualize the first Storyboard implementation unless necessary.

Add virtualization only after profiling projects with at least 100 cards.

Catalog lists may be virtualized earlier if they exceed hundreds of items.

---

# 16. Layout Canvas Implementation

## 16.1 Rendering Technology

Use DOM and CSS for the MVP Layout editor.

The canvas is an aspect-ratio container with absolutely positioned Slot elements.

Each Slot uses normalized coordinates or dimensions relative to the canvas:

```ts
type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
```

Recommended storage range:

```text
0.0 to 1.0
```

This keeps layouts independent of physical preview size.

## 16.2 Why Not a Canvas Library

Do not adopt Fabric.js, Konva, PixiJS, or a custom WebGL scene graph for the initial constrained editor.

The MVP requires:

- Rectangular Slots
- Selection
- Move
- Resize
- Layer order
- Component preview
- Safe areas

DOM and CSS are sufficient and easier to debug, test, and make accessible.

A rendering-engine change requires an explicit technical decision.

## 16.3 Canvas Coordinate Rules

- Store normalized logical bounds.
- Convert to pixels for display.
- Clamp Slots to valid bounds unless overflow is explicitly supported.
- Maintain minimum dimensions.
- Use deterministic rounding when persisting.
- Preserve aspect ratio metadata on the Layout.

## 16.4 Editing

Pointer interactions may use a small dedicated transform utility.

The same edits must be possible through numeric inspector fields.

## 16.5 Preview Versus Edit Mode

Edit mode may show:

- Slot outlines
- Labels
- Selection handles
- Safe areas
- Guides

Audience preview must hide all editor chrome.

## 16.6 Z-Order

Use an explicit integer layer order.

Render Component Placements in stable order.

Do not rely on DOM insertion timing as the persistent layer model.

## 16.7 Component Rendering

Implement built-in Component renderers through a registry:

```ts
interface ComponentRendererDefinition {
  type: ComponentType;
  render: React.ComponentType<ComponentRenderProps>;
  propertySchema: ZodSchema;
  supportedSlotRoles: SlotRole[];
}
```

A Component registry makes built-ins extensible without adding plugin infrastructure.

---

# 17. Binding and Resolution

## 17.1 Binding Representation

Use a discriminated union:

```ts
type Binding =
  | { kind: "literal"; value: unknown }
  | { kind: "resource"; resourceId: string }
  | { kind: "segmentField"; fieldKey: string }
  | { kind: "episodeMetadata"; field: string }
  | { kind: "showMetadata"; field: string };
```

## 17.2 Resolution Layer

Binding resolution belongs to application/domain services, not individual React components.

Input:

- Component property schema
- Placement binding
- Show metadata
- Episode metadata
- Episode Segment values
- Resource metadata

Output:

```ts
type ResolvedProperty =
  | { status: "resolved"; value: unknown }
  | { status: "missing"; reason: string }
  | { status: "invalid"; reason: string };
```

## 17.3 Validation

Use the same resolution service for:

- Editor preview
- Readiness validation
- Rehearsal
- Future broadcast execution

Do not create separate binding logic in each surface.

---

# 18. Animation Architecture

## 18.1 MVP Animation

Use CSS or Web Animations API for preset animations.

Represent animations as data:

```ts
type AnimationConfig = {
  preset:
    | "none"
    | "fade"
    | "slideUp"
    | "slideDown"
    | "slideLeft"
    | "slideRight"
    | "scaleIn"
    | "scaleOut"
    | "pop"
    | "wipe";
  durationMs: number;
  delayMs: number;
  easing: string;
};
```

## 18.2 Animation Registry

Map preset IDs to implementation centrally.

Do not store arbitrary CSS or JavaScript in production data.

## 18.3 Completion

Animation runners must return a completion promise or event that lifecycle and rehearsal engines can await.

Respect reduced-motion settings by shortening or removing nonessential motion without breaking lifecycle completion.

## 18.4 Non-Goals

Do not implement:

- Keyframes editable by users
- Motion paths
- Arbitrary easing editors
- Nested timelines
- After Effects-style composition
- User-provided scripts

---

# 19. Preview and Rehearsal Engine

## 19.1 Shared Runtime

Preview and rehearsal must share one deterministic runtime state machine.

Do not implement separate behavior for each screen.

## 19.2 Runtime States

At minimum:

```ts
type RuntimeState =
  | "idle"
  | "preparing"
  | "entering"
  | "active"
  | "exiting"
  | "cleaningUp"
  | "stopped"
  | "failed";
```

## 19.3 Runtime Inputs

The runtime consumes normalized execution instructions produced from:

- Episode Segment
- Source Show Segment
- Resolved Layouts
- Resolved Component Placements
- Resources
- Host Cues

## 19.4 Runtime Responsibilities

- Execute lifecycle in order.
- Activate Layouts.
- Wait for configured completion.
- Track current Segment.
- Trigger manual Host Cues.
- Complete timed Cues.
- Restore default state when configured.
- Stop cleanly.
- Emit state events for UI.

## 19.5 Renderer-Only MVP

The first preview/rehearsal engine may run in the renderer because it controls DOM media and animation.

However:

- Instruction generation must be separate from React.
- Execution contracts must remain engine neutral.
- Future OBS or native execution must be able to consume equivalent instructions.

## 19.6 Clock

Abstract time behind a clock interface for deterministic tests.

Do not scatter direct `setTimeout` calls throughout Cue and lifecycle components.

## 19.7 Cancellation

Every asynchronous runtime action must support cancellation when:

- Preview stops.
- User jumps to another Segment.
- Layout changes.
- Rehearsal exits.
- The window closes.

Use `AbortController` or an equivalent unified cancellation mechanism.

---

# 20. Autosave

## 20.1 Principle

There is no normal Save button.

All persistent changes travel through application commands.

## 20.2 Save Timing

- Structural changes: persist immediately.
- Select/drop operations: persist immediately.
- Text input: debounce approximately 300–500 ms.
- Large resource operations: show explicit progress.

## 20.3 Save State

The renderer tracks:

- Idle
- Saving
- Saved
- Failed

Do not display Saved until persistence confirms success.

## 20.4 Mutation Queue

Serialize conflicting mutations against the same entity.

Prevent an older debounced field update from overwriting a newer update.

## 20.5 Window Close

On close:

- Flush debounced mutations.
- Wait briefly for the mutation queue.
- If persistence fails, show a clear confirmation rather than silently discarding work.

---

# 21. Undo and Redo

## 21.1 Architecture

Use an application command pattern.

Each undoable command must produce enough information to execute its inverse.

Examples:

- Rename Segment
- Reorder Storyboard
- Add placement
- Remove placement
- Resize Slot
- Assign Component
- Change Resource binding

## 21.2 Scope

Maintain an in-memory undo stack per active editor session.

Undo history does not need to survive application restart in the MVP.

## 21.3 Command Coalescing

Coalesce:

- Continuous text edits to the same field
- Pointer-driven Slot movement
- Pointer-driven Slot resizing

One drag should produce one undo step.

## 21.4 Persistent Undo

Undo and redo commands also persist through normal repositories.

Do not maintain a renderer-only visual state that disagrees with the database.

## 21.5 Non-Undoable Operations

Some destructive or external operations may not be undoable:

- Permanent file deletion
- External device permission changes
- Database migration
- Application settings that restart the app

The UI must distinguish them.

---

# 22. Validation Architecture

## 22.1 Validation Layers

### Domain validation

Always true rules:

- Fixed lifecycle
- Show ownership
- Valid IDs
- Allowed component/slot relationships
- Valid binding forms

### Production validation

Readiness rules:

- Missing required field
- Missing Resource
- Missing Layout
- Unsatisfied binding
- Unavailable camera
- Unsupported media

### UI validation

Immediate form feedback:

- Empty name
- Invalid number
- Invalid duration

## 22.2 Validation Service

Create one application validation service that returns:

```ts
type ValidationIssue = {
  id: string;
  severity: "blocking" | "warning";
  code: string;
  message: string;
  entityType: string;
  entityId: string;
  fieldPath?: string;
  suggestedAction?: string;
};
```

## 22.3 Copy

Domain error codes remain technical and stable.

The renderer maps them to production-language copy.

Do not hardcode every user-facing message deep in persistence code.

---

# 23. Error Handling and Logging

## 23.1 Error Taxonomy

Use stable categories:

- Validation error
- Not found
- Conflict
- Persistence failure
- File unavailable
- Unsupported media
- Permission denied
- Device unavailable
- Runtime failure
- Internal error

## 23.2 Logging

Create a logging interface with:

- debug
- info
- warn
- error

Development:

- Console output
- Detailed stack traces

Packaged application:

- Rotating local log files
- No content of private notes by default
- No full media paths in telemetry
- Correlation ID for failed commands

A small maintained Electron-compatible logging package may implement the adapter.

Do not couple application code directly to one logger package.

## 23.3 User Error Presentation

Errors must state:

- What failed
- Where it failed
- Whether work was saved
- What the user can do next

## 23.4 Telemetry

No analytics or remote telemetry is required for MVP.

**OPEN TECHNICAL SPECIFICATION — Crash reporting and analytics**

Do not add third-party tracking without an explicit privacy and product decision.

---

# 24. Testing Strategy

## 24.1 Unit Tests

Use Vitest for:

- Domain invariants
- Episode creation mapping
- Storyboard reordering
- Duplication semantics
- Binding resolution
- Readiness calculation
- Lifecycle instruction generation
- Cue lifetime behavior
- Migration helpers

## 24.2 Renderer Tests

Use React Testing Library with Vitest for:

- Forms
- Scope indicators
- Empty states
- Validation presentation
- Storyboard card actions
- Inspector behavior
- Accessible names and keyboard operation

Mock `window.showflow` through a typed test adapter.

## 24.3 Repository Integration Tests

Run repositories against a temporary SQLite database.

Test:

- Migrations from empty state
- Transactions
- Foreign keys
- Ordering
- Cascade/restrict behavior
- JSON validation
- Rollback
- Backup

## 24.4 Browser-Level UX Tests

The renderer should be capable of running in a browser test harness with a mock desktop API.

Use Playwright for major UX flows:

- Create Studio
- Create Show
- Build Blueprint
- Create Episode
- Reorder Episode
- Edit Segment content
- Create Layout
- Rehearse

This provides stable UI testing without requiring Electron for every test.

## 24.5 Electron Smoke Tests

Use Playwright's Electron support only for a small smoke suite:

- App launches.
- Preload API is available.
- Database opens.
- Native import dialog can be invoked through an injectable adapter.
- Main navigation renders.
- Packaged app starts.

Electron automation support may be less stable than browser automation, so keep critical product logic covered below this layer.

## 24.6 Test Fixtures

Provide deterministic fixture builders:

```ts
studioFixture()
showFixture()
segmentFixture()
layoutFixture()
episodeFixture()
```

Avoid opaque giant JSON snapshots.

## 24.7 Required CI Checks

Every pull request must run:

- Install with frozen lockfile
- Format check
- Lint
- Typecheck
- Unit tests
- Renderer tests
- Repository integration tests
- Production build

---

# 25. Code Quality

## 25.1 Formatting and Linting

Use:

- Prettier
- ESLint flat configuration
- typescript-eslint
- React Hooks rules
- Import-boundary rules where practical

## 25.2 Prohibited Patterns

Avoid:

- `any`
- Non-null assertions without justification
- God objects
- Giant React components
- Circular workspace dependencies
- Hidden global mutable state
- Generic IPC channels
- Business logic in event handlers
- Raw database rows returned to UI
- Stringly typed entity kinds where unions exist
- Silent `catch` blocks
- Dependency injection frameworks

## 25.3 Module Size

Prefer cohesive small modules.

A file exceeding roughly 400–500 lines should trigger a review, not an automatic split.

## 25.4 Comments

Comments should explain:

- Why a constraint exists
- Why a workaround is necessary
- Which specification rule is being enforced

Do not comment obvious syntax.

---

# 26. Performance Targets

These are product targets, not premature micro-optimization requirements.

## 26.1 Startup

On a modern Apple Silicon Mac:

- Show the application window promptly.
- Restore the last Studio and route.
- Avoid blocking startup on thumbnail regeneration.
- Run background derivation after core data is usable.

## 26.2 Storyboard

Target smooth interaction with:

- 100 Segment cards
- 200 Catalog Segments
- 100 Layouts

## 26.3 Main Thread

Avoid synchronous work that visibly blocks the renderer.

Do not:

- Hash large files in renderer
- Parse entire large videos
- Render every hidden preview
- Load full media blobs into React state

## 26.4 Preview

Only mount media needed by:

- Current Layout
- Immediately entering Layout
- Explicitly preloaded next content

## 26.5 Profiling Rule

Do not introduce complex caching or virtualization without a measurable issue.

---

# 27. Accessibility Engineering

Required implementation support:

- Keyboard-accessible primary workflows
- Visible focus
- Semantic buttons rather than clickable divs
- ARIA labels for icon-only controls
- Reduced-motion media query
- Numeric Slot controls as alternatives to dragging
- Non-color validation states
- Correct dialog focus trapping
- Focus restoration after closing panels
- Logical tab order

Automated checks may use `axe-core` in renderer tests.

Accessibility must not be postponed until final polish.

---

# 28. Build, Packaging, and Distribution

## 28.1 Electron Forge Makers

Initial targets:

### macOS

- `.dmg` or `.zip`
- arm64 first
- x64 build where practical

### Windows

- Squirrel installer or a similarly standard Forge-supported maker
- x64

### Linux

- `.deb` for initial beta
- Optional `.rpm` later
- x64

## 28.2 Build Environment

Build each operating-system artifact on its own operating system through CI.

Do not depend on cross-compiling all installers from macOS.

## 28.3 Signing

**OPEN TECHNICAL SPECIFICATION — Signing credentials**

Eventually require:

- Apple Developer ID signing
- macOS notarization
- Windows code signing

The first internal development builds may be unsigned.

Keep signing configuration in environment variables and CI secrets, never in source control.

## 28.4 Auto-Update

DEFERRED.

Do not implement auto-update before:

- Release hosting is selected
- Signing is configured
- Update channels are defined
- Rollback behavior is understood

## 28.5 Versioning

Use semantic application versions.

Expose:

- App version
- Database schema version
- Desktop API version

These are separate concepts.

---

# 29. Continuous Integration

Use GitHub Actions.

## 29.1 Pull Request Workflow

Run on a primary Linux runner:

- Install
- Lint
- Format
- Typecheck
- Unit tests
- Renderer tests
- Repository tests
- Build packages

## 29.2 Platform Build Workflow

Use a matrix:

- macOS arm64-capable runner when available
- Windows x64
- Ubuntu x64

Produce nonrelease artifacts for smoke testing.

## 29.3 Release Workflow

Triggered by a version tag after signing is configured.

It should:

1. Build per platform.
2. Run smoke tests.
3. Sign/notarize where required.
4. Produce checksums.
5. Upload artifacts.
6. Generate release notes.

---

# 30. Development Commands

Root scripts should provide predictable commands:

```json
{
  "scripts": {
    "dev": "pnpm --filter @showflow/desktop start",
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "pnpm -r test",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "package": "pnpm --filter @showflow/desktop package",
    "make": "pnpm --filter @showflow/desktop make"
  }
}
```

Exact commands may vary, but the root must offer one obvious path for each common task.

---

# 31. Environment and Configuration

## 31.1 Node Tooling Version

Use Node 24 LTS for repository tooling to stay close to the Node runtime used by the reference Electron line.

Pin through:

- `.node-version` or `.nvmrc`
- `engines`
- `packageManager`

## 31.2 Environment Variables

Use environment variables only for:

- Build flags
- Signing credentials
- Release publishing
- Debug options

Do not use environment variables as a replacement for persisted user settings.

## 31.3 Secrets

No secrets are required for the local Producing MVP.

Never place certificates, private keys, tokens, or passwords in the repository.

---

# 32. Mobile and Tablet Preparation

## 32.1 What Must Be Shared

Future companions should be able to reuse:

- Domain types
- API contracts
- Execution contracts
- Validation messages/codes
- Rehearsal state definitions
- Cue definitions
- Storyboard summaries

## 32.2 What Must Not Be Shared

Do not force reuse of:

- Desktop window chrome
- Desktop Layout editor
- Electron preload
- Electron file dialogs
- Desktop-only CSS layout
- Node persistence adapter

## 32.3 Future Local Remote

The likely first companion architecture is:

```text
Showflow Desktop
→ local authenticated control service
→ WebSocket or local HTTP transport
→ responsive companion UI
```

Do not implement this service now.

Keep commands and events serializable so it can be introduced later.

## 32.4 Full Tablet Editor

A full iPad or Android tablet editor is an independent product decision.

Do not distort the desktop UX or choose a cross-platform native UI framework solely for this hypothetical future.

---

# 33. Future Broadcast Integration

Broadcasting is intentionally outside this specification.

Prepare for it through an adapter boundary:

```ts
interface ProductionExecutionAdapter {
  prepare(instructions: ExecutionInstruction[]): Promise<void>;
  execute(instruction: ExecutionInstruction): Promise<ExecutionResult>;
  stop(): Promise<void>;
  getHealth(): Promise<ExecutionHealth>;
}
```

Future adapters may target:

- OBS WebSocket
- Native renderer
- Recording-only engine
- Remote execution service

The domain must never store OBS scene IDs as its primary production model.

Adapter-specific mappings belong in adapter configuration.

---

# 34. Open Technical Specification Register

The coding agent must not silently finalize these areas.

| Area | Current handling |
|---|---|
| Final Showflow Design System | Central neutral tokens until specified |
| `node:sqlite` production suitability | Complete required packaged-app spike |
| Persistence fallback | `better-sqlite3` behind same repository interfaces |
| Portable project export/import | Deferred |
| Managed media library | Linked files in MVP |
| Media proxies | Deferred |
| FFmpeg/ffprobe bundling | Deferred until required |
| Advanced codec support | Chromium-supported preview only |
| Full camera/microphone UX | Simple device abstraction |
| Advanced audio routing | Deferred |
| Custom Component authoring | Built-in registry only |
| Renderer technology beyond DOM/CSS | DOM/CSS for MVP |
| Multi-aspect linked Layout variants | Separate fixed-ratio Layouts |
| Cloud sync | Deferred |
| Collaboration | Deferred |
| Remote mobile control | Contracts only; no server |
| Native mobile apps | Deferred |
| OBS adapter | Deferred |
| Code-signing credentials | Configuration hooks only |
| Auto-update | Deferred |
| Crash reporting/analytics | None until privacy decision |
| Full production version locking | Deferred |
| Plugin system | Deferred |

---

# 35. Initial Implementation Milestones

## Milestone 0 — Technical Foundation

Required:

- pnpm workspace
- Electron Forge + Vite
- React renderer
- Strict TypeScript
- Preload bridge
- Typed IPC proof
- Routing
- CSS token foundation
- Test harness
- CI skeleton
- SQLite packaged-app spike

Exit criteria:

- Packaged app starts on macOS arm64.
- One typed IPC query and command work.
- One SQLite entity persists.
- Renderer has no Node integration.
- Unit and smoke tests run.

## Milestone 1 — Core Domain and Navigation

- Studios
- Shows
- Show Detail
- Blueprint
- Segment Catalog
- Episode creation
- Episode Storyboard
- Reorder, duplicate, insert, remove
- Autosave
- Basic undo/redo

## Milestone 2 — Segment Data and Validation

- Show Segment editor
- Simple field schema
- Episode Segment values
- Notes
- Readiness validation
- Scope indicators
- Production-language errors

## Milestone 3 — Layouts and Resources

- Layout Catalog
- Fixed-aspect DOM canvas
- Slots
- Built-in Components
- Linked Resources
- Custom resource protocol
- Bindings
- Preview

## Milestone 4 — Lifecycle and Cues

- Enter, Active, Exit
- Automatic Prepare/Cleanup summary
- Animation registry
- Layout activation
- Single-action Host Cues
- Cancellation
- Deterministic runtime tests

## Milestone 5 — Rehearsal

- Episode runtime
- Notes
- Previous/next/restart
- Cue palette
- Elapsed timing
- Basic error recovery
- Readiness summary

Do not start OBS or streaming integration before this vertical slice works coherently.

---

# 36. Technical Acceptance Criteria

The technical MVP foundation is acceptable when:

1. The same repository builds on macOS, Windows, and Linux.
2. macOS arm64 is the primary tested package.
3. The renderer has no direct Node access.
4. All privileged operations use a narrow typed preload API.
5. Domain and application packages import no Electron APIs.
6. Show-level Segment/Layout/Component ownership is enforced below the UI.
7. Episode creation from Blueprint is transactional.
8. Storyboard reordering persists and supports undo.
9. Autosave reports failure honestly.
10. The database migrates safely.
11. Resource files are loaded by Resource ID rather than arbitrary renderer paths.
12. Large media files are not loaded fully into memory.
13. Layouts render through a constrained DOM/CSS canvas.
14. Binding resolution is shared by preview, validation, and rehearsal.
15. Lifecycle and Cue timing are deterministic and cancellable.
16. Core workflows have unit, integration, and browser-level tests.
17. Electron-specific tests remain a small smoke layer.
18. Temporary design values are centralized as tokens.
19. No OBS-specific concepts enter the domain.
20. Open technical areas remain isolated rather than invented.

---

# 37. Codex Coding Rules

The coding agent must follow these rules during implementation.

1. Read the Architecture PRD and UX Specification before implementing a feature.
2. Preserve canonical terminology.
3. Implement the smallest coherent vertical slice.
4. Do not add frameworks without a concrete need.
5. Prefer official Electron and web-platform APIs.
6. Avoid native Node add-ons unless the persistence spike requires the approved fallback.
7. Keep domain logic pure.
8. Keep IPC narrow and typed.
9. Validate data at every process and persistence boundary.
10. Do not expose raw Electron APIs to React.
11. Do not put SQL in renderer code.
12. Do not put business invariants only in UI validation.
13. Do not create Episode-only Segments, Layouts, or Components.
14. Do not build a general-purpose canvas, timeline, or automation system.
15. Do not implement deferred mobile, cloud, or broadcast functionality preemptively.
16. Add tests with every domain command and repository method.
17. Keep migrations forward-only.
18. Add an issue or specification note when blocked by an open decision.
19. Do not silently choose permanent behavior for an open specification.
20. Leave the codebase easier to reason about than it was before the change.

---

# 38. Reference Documentation

These official references informed the initial technical choices:

- Electron documentation: https://www.electronjs.org/docs/latest/
- Electron process model: https://www.electronjs.org/docs/latest/tutorial/process-model
- Electron IPC: https://www.electronjs.org/docs/latest/tutorial/ipc
- Electron security: https://www.electronjs.org/docs/latest/tutorial/security
- Electron releases: https://releases.electronjs.org/
- Electron Forge: https://www.electronforge.io/
- Electron Forge Vite template: https://www.electronforge.io/templates/vite-typescript
- Electron Forge Vite plugin: https://www.electronforge.io/config/plugins/vite
- Node SQLite: https://nodejs.org/docs/latest-v24.x/api/sqlite.html
- pnpm workspaces: https://pnpm.io/workspaces
- React: https://react.dev/
- Vite: https://vite.dev/
- Playwright Electron API: https://playwright.dev/docs/api/class-electron

---

# 39. Final Technical Summary

Showflow should begin as a local-first Electron desktop application with:

```text
Electron Forge
+ Vite
+ React
+ strict TypeScript
+ pnpm workspaces
+ typed IPC
+ SQLite repositories
+ linked media Resources
+ DOM/CSS Layout canvas
+ deterministic preview/rehearsal runtime
```

The architecture separates:

```text
Product domain
from
Application use cases
from
Persistence and desktop adapters
from
React UI
```

macOS on Apple Silicon is the primary reference platform, while the same application is designed to package for Windows and Linux.

Future mobile, cloud, and broadcast capabilities should connect through contracts and adapters. They must not dictate or complicate the Producing MVP before the core Showflow workflow has been validated.
