# Showflow
## Detailed MVP Implementation Plan
### Version 1.0 — Gated Sprints for Codex

**Document status:** Execution plan  
**Primary audience:** Codex coding agents and supervising engineers  
**Companion documents:**
- `docs/architecture-prd-v1.3.md`
- `docs/ux-spec-v1.0.md`
- `docs/technical-spec-v1.0.md`
- `docs/design-system-spec-v1.0.md`

**Primary development platform:** macOS on Apple Silicon  
**Desktop targets:** macOS, Windows, and Linux  
**MVP boundary:** Designing Shows, producing Episodes, previewing Segments, and rehearsing Episodes  
**Not in MVP:** Live broadcasting, OBS integration, cloud sync, mobile applications, collaboration, advanced media processing

---

# 1. How to Use This Plan

This plan is deliberately dependency ordered.

Each Sprint must produce:

1. A coherent increment.
2. Passing automated tests.
3. A short implementation note or Architecture Decision Record when a technical choice is made.
4. Updated documentation when behavior changes.
5. No unresolved regressions from earlier Sprints.

Do not begin the next Sprint until the current Sprint's required test gate passes.

A Sprint is not complete merely because its UI renders. Its domain rules, persistence, accessibility, error behavior, and tests must also be complete to the level specified here.

---

# 2. Task and Decision Labels

## `[REQUIRED]`

Must be implemented in the Sprint.

## `[DECISION REQUIRED]`

A product, UI/UX, or feature decision must be made before the affected task can be finalized.

The agent must stop at that task, document the exact decision needed, and continue only on unrelated work.

## `[USE MVP DEFAULT]`

The area is open in a specification, but the existing documents provide an acceptable temporary MVP behavior. The agent should use that behavior without broadening it.

## `[DEFERRED]`

Do not implement during this plan.

## `[SPIKE]`

A time-boxed technical proof whose outcome determines a later implementation choice. The spike must produce written findings and tests, not production architecture by accident.

---

# 3. Agent Iteration Protocol

## 3.1 Before Each Sprint

The agent must:

1. Read the four companion specifications.
2. Read this Sprint and all dependencies.
3. Inspect the current implementation rather than assuming earlier tasks were completed exactly as planned.
4. Create or update a Sprint checklist in the issue or pull request.
5. Identify any `[DECISION REQUIRED]` items before writing production code.
6. Run the full existing test suite to establish a clean baseline.

## 3.2 During Each Sprint

The agent should:

- Implement one numbered subtask at a time.
- Add tests with the behavior, not after all code is written.
- Prefer small commits organized by subtask.
- Keep product logic out of React components.
- Keep Electron APIs behind the preload boundary.
- Preserve all Architecture PRD invariants.
- Avoid adding dependencies that are not named in the Technical Specification unless an ADR explains the need.

## 3.3 At the End of Each Sprint

The agent must provide:

- Completed subtask list
- Test results
- New migrations
- New dependencies
- Open issues
- Decisions made
- Screenshots or recordings for user-visible changes where practical
- Confirmation that the Sprint exit criteria pass

## 3.4 Regression Rule

Every later Sprint must continue running all earlier automated tests.

A test may be changed only when:

- A newer approved specification changes the behavior, or
- The original test was demonstrably incorrect.

Do not weaken a test merely to make a build pass.

---

# 4. Global Definition of Done

A task is done only when:

- TypeScript passes in strict mode.
- Lint and formatting pass.
- Runtime inputs are validated where they cross IPC, persistence, or file boundaries.
- Relevant unit, integration, renderer, and end-to-end tests exist.
- Keyboard and focus behavior are covered for primary interactions.
- Loading, empty, error, and success states are handled.
- User-facing copy uses production terminology.
- No temporary hardcoded design values appear outside centralized tokens.
- No open specification has been silently finalized.
- No domain invariant exists only in the UI.

---

# 5. Sprint Sequence

| Sprint | Name | Primary Outcome |
|---:|---|---|
| 0 | Repository and secure Electron foundation | Packaged shell with typed IPC and CI |
| 1 | Persistence proof and database foundation | Approved SQLite adapter and migrations |
| 2 | Domain and application kernel | Enforced Showflow invariants and use-case layer |
| 3 | Design system foundation and application shell | Reusable dark UI system and navigation shell |
| 4 | Studios, Shows, and Show Detail | First complete navigation flow |
| 5 | Segment Catalog and Show Blueprint | Usable Design Show structural workflow |
| 6 | Episodes and Episode Storyboard | Blueprint-to-Episode production flow |
| 7 | Show Segment schema and behavior editor | Reusable Segment definitions |
| 8 | Episode Segment content editor | Episode-specific production content |
| 9 | Resource system | Secure linked media and Resource browsing |
| 10 | Layout Catalog and constrained Layout editor | Reusable compositions and Slots |
| 11 | Components, Placements, and bindings | Rendered production layouts |
| 12 | Preview runtime and Segment lifecycle | Deterministic Segment execution |
| 13 | Host Cues | Manual production controls |
| 14 | Episode rehearsal | End-to-end nonbroadcast show run |
| 15 | Hardening, accessibility, and performance | Reliable production-grade MVP behavior |
| 16 | Cross-platform release candidate | Packaged macOS, Windows, and Linux builds |

---

# Sprint 0 — Repository and Secure Electron Foundation

## Goal

Create a minimal, secure, testable Electron application and repository structure that all later work can build upon.

## User-Visible Increment

A packaged Showflow window opens with:

- Dark application background
- Text wordmark placeholder
- Basic top bar
- A neutral “Showflow is ready” development screen

No production features are required yet.

## Subtasks

### 0.1 — Add Product Documentation `[REQUIRED]`

Add the four companion specifications to `docs/` using canonical filenames.

Add `docs/README.md` explaining:

- Document authority order
- Canonical terminology
- How open specifications should be handled
- How to update version references

### 0.2 — Add Codex Repository Instructions `[REQUIRED]`

Create root `AGENTS.md` containing:

- Required documents to read
- Canonical architectural invariants
- Prohibited patterns
- Test gate rule
- Open-decision protocol
- Common repository commands

Do not copy every specification into `AGENTS.md`; link and summarize.

### 0.3 — Initialize pnpm Workspace `[REQUIRED]`

Create:

- Root `package.json`
- `pnpm-workspace.yaml`
- `.npmrc` with `node-linker=hoisted`
- Pinned `packageManager`
- Pinned Node tooling version
- Base TypeScript configuration

Create the initial package structure from the Technical Specification.

### 0.4 — Initialize Electron Forge and Vite `[REQUIRED]`

Create `apps/desktop` with:

- Electron main entry
- Preload entry
- React renderer
- Electron Forge Vite configuration
- Development, package, and make commands

Use a current stable Electron version and pin it in the lockfile.

### 0.5 — Enforce Secure BrowserWindow Defaults `[REQUIRED]`

Configure:

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- Restrictive navigation behavior
- External links opened through the OS browser
- Content Security Policy
- No remote content in the main application window

### 0.6 — Implement Typed IPC Proof `[REQUIRED]`

Create a single semantic API method:

```ts
window.showflow.app.getRuntimeInfo()
```

Return:

- Application version
- Desktop API version
- Platform
- Architecture

Validate the response with Zod.

Do not expose generic `invoke(channel, data)`.

### 0.7 — Establish Package Boundaries `[REQUIRED]`

Create placeholder packages:

- `domain`
- `application`
- `contracts`
- `persistence`
- `resources`
- `execution-contracts`
- `ui`
- `test-fixtures`

Add import-boundary lint rules or tests.

### 0.8 — Establish Code Quality Tooling `[REQUIRED]`

Configure:

- ESLint flat config
- typescript-eslint
- React Hooks lint rules
- Prettier
- Strict TypeScript
- No `any` rule with narrow justified exceptions
- Workspace typecheck scripts

### 0.9 — Establish Test Harnesses `[REQUIRED]`

Configure:

- Vitest for packages
- React Testing Library
- Playwright browser harness with mock desktop API
- Playwright Electron smoke harness
- Temporary test output and coverage directories

### 0.10 — Establish CI Skeleton `[REQUIRED]`

GitHub Actions pull-request workflow must run:

- Frozen install
- Format check
- Lint
- Typecheck
- Unit tests
- Renderer tests
- Build

Add placeholder platform packaging workflow without signing.

### 0.11 — Add ADR and Decision Templates `[REQUIRED]`

Create:

- `docs/decisions/`
- ADR template
- Product decision request template
- Open specification issue template

### 0.12 — Create Initial Design Token File `[REQUIRED]`

Create centralized CSS custom properties from Design System v1.0.

Use:

- Warm charcoal surfaces
- Warm white text
- Provisional gold accent
- Geist stack with system fallback
- Comfortable spacing
- Radius and motion tokens

Do not yet implement every component.

## Decision Notes

### D0.1 — Exact Icon Library `[USE MVP DEFAULT]`

The icon package remains open.

For Sprint 0:

- Use no product icons beyond a minimal temporary back/menu icon if required.
- Wrap icons through a local `Icon` interface.
- Do not spread direct library imports throughout features.

A final library decision is required before Sprint 15 polish.

### D0.2 — Final Logo and Wordmark `[USE MVP DEFAULT]`

Use a text wordmark:

```text
Showflow
```

No logo design is required.

## Required Tests

### 0.T1 — Strict Typecheck

Command:

```text
pnpm typecheck
```

Must pass across every workspace package.

### 0.T2 — Lint and Format

```text
pnpm lint
pnpm format:check
```

Must pass with no ignored broad error groups.

### 0.T3 — Domain Package Isolation

An automated architecture test must fail if `packages/domain` imports:

- Electron
- React
- Node file-system APIs
- SQLite adapters

### 0.T4 — Renderer Isolation

An automated source test must verify the renderer does not import:

- `electron`
- `node:fs`
- `node:path`
- Raw `ipcRenderer`

### 0.T5 — Typed IPC Contract

Unit and integration tests must verify:

- Valid `getRuntimeInfo` response passes Zod.
- Invalid response is rejected.
- Unknown generic channels cannot be invoked through preload.

### 0.T6 — BrowserWindow Security Smoke Test

Electron smoke test verifies:

- `window.require` is unavailable.
- `window.process` is not exposed as a Node process API.
- `window.showflow` exists.
- External navigation is prevented or redirected appropriately.

### 0.T7 — Renderer Startup Test

Browser-level test renders the development screen using a mock API.

### 0.T8 — Packaged macOS Launch

The app packages and launches on macOS arm64.

### 0.T9 — CI Test

The pull-request workflow completes on a clean branch.

## Exit Criteria

- Repository commands are predictable.
- Secure Electron shell launches.
- Typed preload bridge works.
- All tests 0.T1–0.T9 pass.
- No feature implementation has bypassed package boundaries.

---

# Sprint 1 — Persistence Proof and Database Foundation

## Goal

Prove and establish the local-first SQLite persistence layer before production features depend on it.

## User-Visible Increment

The application can persist and reload one internal application setting across restarts. No user-facing database UI is required.

## Subtasks

### 1.1 — Run `node:sqlite` Packaged-App Spike `[SPIKE]`

Build a minimal persistence proof that:

- Opens a file-backed database
- Creates a table
- Writes and reads text
- Writes and reads validated JSON
- Commits a transaction
- Rolls back a transaction
- Enables foreign keys
- Enables WAL mode
- Produces a backup
- Runs in a packaged application

### 1.2 — Validate Cross-Platform Packaging `[SPIKE]`

Run the spike on:

- macOS arm64
- Windows x64 CI runner
- Linux x64 CI runner

Document:

- Electron version
- Bundled Node version
- `node:sqlite` behavior
- Packaging issues
- Performance observations
- Any stability warnings

### 1.3 — Decide SQLite Adapter `[DECISION REQUIRED]`

Decision rule:

- Use `node:sqlite` if all required packaged tests pass and no blocking API limitation exists.
- Otherwise use `better-sqlite3` behind the same interfaces.

Create ADR:

```text
ADR-0011 SQLite adapter
```

This decision must be made before Subtask 1.4.

### 1.4 — Implement Database Service `[REQUIRED]`

Create:

- Database initialization
- Connection lifecycle
- PRAGMA configuration
- Transaction wrapper
- Typed query helpers
- Controlled shutdown
- Test database factory

### 1.5 — Implement Migration System `[REQUIRED]`

Create:

- `schema_migrations` table
- Numbered SQL migration loader
- Forward-only migration runner
- Transactional application
- Startup failure handling
- Migration logging

### 1.6 — Implement Backup Service `[REQUIRED]`

Create:

- Timestamped pre-migration backup
- Rolling retention count
- Backup directory creation
- Backup failure handling

### 1.7 — Add Application Settings Repository `[REQUIRED]`

Implement one simple repository to prove the full path:

```text
Renderer
→ typed IPC
→ application service
→ repository interface
→ SQLite adapter
```

Persist:

- Last Studio ID, initially nullable
- Last route
- Window preferences, if straightforward

### 1.8 — Add Persistence Error Mapping `[REQUIRED]`

Map low-level database errors to stable application errors.

Do not expose raw SQL or database stack traces to renderer copy.

## Decision Notes

### D1.1 — User-Facing Project Export `[DEFERRED]`

Internal backup is not portable project export.

Do not design export/import here.

### D1.2 — Cloud Synchronization `[DEFERRED]`

Do not add sync metadata, user accounts, or conflict resolution.

## Required Tests

### 1.T1 — File-Backed Database Test

Creates, closes, reopens, and retrieves persisted data.

### 1.T2 — Transaction Commit Test

Multiple writes commit atomically.

### 1.T3 — Transaction Rollback Test

A thrown error leaves no partial writes.

### 1.T4 — Foreign-Key Enforcement Test

Invalid references are rejected.

### 1.T5 — WAL Configuration Test

Database reports WAL mode after initialization.

### 1.T6 — Migration From Empty Test

All migrations apply in order to a blank database.

### 1.T7 — Migration Idempotence Test

A second startup applies no migration twice.

### 1.T8 — Failed Migration Test

A failing migration rolls back and produces a clear startup error.

### 1.T9 — Backup Test

Backup opens independently and contains the pre-migration state.

### 1.T10 — JSON Boundary Validation

Malformed stored JSON is rejected through a controlled repository error.

### 1.T11 — Settings End-to-End Test

Renderer mock or Electron integration test persists and reloads the last route.

### 1.T12 — Platform Spike Matrix

Packaged spike passes on macOS, Windows, and Linux before the chosen adapter is approved.

## Exit Criteria

- ADR-0011 records the approved SQLite adapter.
- Migrations, transactions, and backups work.
- The persistence API is hidden behind repositories.
- Tests 1.T1–1.T12 pass.

---

# Sprint 2 — Domain and Application Kernel

## Goal

Implement the canonical Showflow domain, invariants, repository interfaces, commands, and queries without depending on UI or Electron.

## User-Visible Increment

None required. This Sprint establishes the product logic that later screens must use.

## Subtasks

### 2.1 — Implement Canonical IDs and Timestamps `[REQUIRED]`

Create:

- UUID ID types or branded aliases
- UTC timestamp utilities
- Entity metadata types
- Deterministic clock injection for tests

### 2.2 — Implement Core Entities `[REQUIRED]`

Implement domain representations for:

- Studio
- Show
- Show Blueprint
- Blueprint Segment Placement
- Show Segment
- Segment Data Field
- Segment Lifecycle
- Episode
- Episode Segment
- Layout
- Slot
- Component
- Component Placement
- Resource
- Host Cue
- Validation Issue

### 2.3 — Implement Closed Lifecycle Model `[REQUIRED]`

Enforce exactly:

```text
prepare
enter
active
exit
cleanup
```

No user-created lifecycle phases.

### 2.4 — Implement Show-Scoped Ownership Rules `[REQUIRED]`

Enforce below UI:

- Segment belongs to Show.
- Layout belongs to Show.
- Component belongs to Show.
- Blueprint placement references Segment in the same Show.
- Episode belongs to Show.
- Episode Segment source Segment belongs to the Episode's Show.

### 2.5 — Implement Domain Factories `[REQUIRED]`

Create factories that produce valid defaults for:

- Studio
- Show
- Show Segment
- Layout
- Episode
- Episode Segment

Factories must not silently produce invalid cross-scope references.

### 2.6 — Implement Repository Interfaces `[REQUIRED]`

Define application-facing interfaces for:

- Studios
- Shows
- Blueprints
- Segments
- Layouts
- Components
- Resources
- Episodes
- Settings
- Transactions

### 2.7 — Implement Core Commands `[REQUIRED]`

Initial commands:

- CreateStudio
- RenameStudio
- CreateShow
- RenameShow
- CreateShowSegment
- CreateLayout
- AddSegmentToBlueprint
- ReorderBlueprintPlacements
- DuplicateBlueprintPlacement
- RemoveBlueprintPlacement
- CreateEpisodeFromBlueprint
- ReorderEpisodeSegments
- DuplicateEpisodeSegment
- RemoveEpisodeSegment

### 2.8 — Implement Core Queries `[REQUIRED]`

Initial queries:

- ListStudios
- GetStudioHome
- GetShowDetail
- GetBlueprint
- ListSegmentCatalog
- GetEpisodeStoryboard

### 2.9 — Implement Episode Creation Mapping `[REQUIRED]`

Create Episode transaction mapping that:

- Copies ordered Blueprint placements
- Creates independent Episode Segment IDs
- Links each to source Show Segment
- Copies placement defaults
- Preserves duplicate Segment references
- Does not create a partial Episode

### 2.10 — Implement Base Validation Service `[REQUIRED]`

Validate:

- Ownership
- Required references
- Ordering uniqueness
- Archived references
- Lifecycle shape
- Basic entity names

### 2.11 — Add Deterministic Test Fixtures `[REQUIRED]`

Provide fixture builders with explicit overrides.

## Decision Notes

No new product decisions should be required. The Architecture PRD is authoritative.

If a domain ambiguity appears, stop and record it rather than solving it through database convenience.

## Required Tests

### 2.T1 — Fixed Lifecycle Test

A Segment always exposes exactly five phases in canonical order.

### 2.T2 — Cross-Show Segment Reference Test

A Blueprint cannot reference a Segment from another Show.

### 2.T3 — Episode Ownership Test

An Episode Segment cannot source a Segment from another Show.

### 2.T4 — Show-Scoped Creation Test

Commands invoked from an Episode context still create Segments and Layouts at Show scope.

### 2.T5 — Blueprint Duplicate Test

Duplicating a placement creates a new placement ID but retains the same Show Segment ID.

### 2.T6 — Episode Duplicate Test

Duplicating an Episode Segment creates a new Episode Segment with copied data and the same source Show Segment.

### 2.T7 — Blueprint Removal Test

Removing a placement does not delete the Show Segment.

### 2.T8 — Episode Removal Test

Removing an Episode Segment changes neither Blueprint nor Catalog.

### 2.T9 — Episode Creation From Empty Blueprint Test

Creates an Episode with an empty Storyboard.

### 2.T10 — Episode Creation From Blueprint Test

Copies order and defaults exactly.

### 2.T11 — Duplicate Source Segment Mapping Test

A Blueprint containing the same Segment twice creates two independent Episode Segments.

### 2.T12 — Transaction Failure Test

A failure in Episode Segment creation rolls back the entire Episode.

### 2.T13 — Pure Package Test

Domain and application unit tests run without Electron or browser globals.

### 2.T14 — Validation Error Test

Invalid ownership produces a stable domain/application error code.

## Exit Criteria

- Domain rules are executable and tested.
- Application commands exist for the first two main workflows.
- Episode creation behavior is fully deterministic.
- Tests 2.T1–2.T14 pass.

---

# Sprint 3 — Design System Foundation and Application Shell

## Goal

Implement the reusable visual foundation and desktop workspace shell before feature screens diverge visually.

## User-Visible Increment

A coherent dark Showflow shell with:

- Top bar
- Studio switcher placeholder
- Breadcrumb area
- Workspace title
- Autosave indicator
- Primary action area
- Basic dialogs, menus, panels, cards, and form controls

## Subtasks

### 3.1 — Load Geist `[REQUIRED]`

Use Geist Sans throughout.

Use Geist Mono only for:

- Durations
- Timecode
- Measurements
- Shortcut display

Do not share font files as product artifacts outside the application repository.

### 3.2 — Implement Semantic Tokens `[REQUIRED]`

Implement all initial:

- Color
- Typography
- Spacing
- Radius
- Border
- Elevation
- Motion
- Z-index
- Breakpoint tokens

### 3.3 — Implement Foundational Components `[REQUIRED]`

Build and document:

- Button
- IconButton
- TextInput
- TextArea
- Select
- Checkbox
- Toggle
- Tabs
- Badge
- Tooltip
- Menu
- Dialog
- Drawer
- Panel
- Divider
- Skeleton
- EmptyState
- SaveStateIndicator

### 3.4 — Implement Production Object Primitives `[REQUIRED]`

Build reusable shells for:

- ObjectCard
- StoryboardCard
- StatusBadge
- ScopeLabel
- InspectorSection
- PropertyRow
- NotesPanel
- ValidationItem

### 3.5 — Implement Application Shell `[REQUIRED]`

Build:

- Persistent 64 px top bar
- Page content frame
- Optional left drawer
- Optional right inspector
- Bottom notes area support
- Responsive panel collapse
- Main content focus area

### 3.6 — Implement Focus and Keyboard Foundations `[REQUIRED]`

Every foundational control must include:

- Visible focus
- Correct semantics
- Escape behavior for overlays
- Focus trap for dialogs
- Focus restoration
- 44 px minimum target

### 3.7 — Implement Reduced Motion `[REQUIRED]`

All foundation motion must respect `prefers-reduced-motion`.

### 3.8 — Add Component Development Gallery `[REQUIRED]`

Create an internal development route showing:

- Every component
- Every state
- Dark background contexts
- Validation states
- Focus states
- Long-label behavior

This may be a custom gallery rather than Storybook.

## Decision Notes

### D3.1 — Exact Icon Library `[DECISION REQUIRED BEFORE 3.3 FINALIZATION]`

**Decision recorded 2026-08-06:** Use Lucide React through the local `Icon`
adapter. See [ADR 0014](decisions/0014-lucide-icon-library.md).

Choose one library before foundational icon buttons are considered stable.

Selection criteria:

- Outlined, precise, modern
- Consistent stroke
- Good React and TypeScript support
- Maintained
- Complete common UI vocabulary

Until decided, use a local adapter with a very small temporary icon set.

### D3.2 — Final Gold Calibration `[USE MVP DEFAULT]`

Use the Design System v1.0 values.

Visual refinement may occur in Sprint 15.

### D3.3 — Light Theme `[DEFERRED]`

Do not implement.

## Required Tests

### 3.T1 — Token Usage Test

Feature-independent components contain no raw hex colors outside token definitions.

### 3.T2 — Visual State Renderer Tests

Each component renders:

- Default
- Hover-triggerable
- Focused
- Disabled
- Error where applicable

### 3.T3 — Keyboard Tests

Menus, dialogs, tabs, and drawers can be operated by keyboard.

### 3.T4 — Focus Restoration Test

Closing a dialog or drawer returns focus to its opener.

### 3.T5 — Accessibility Scan

Development gallery has no serious Axe violations.

### 3.T6 — Minimum Target Test

Critical controls meet the 44 px minimum target.

### 3.T7 — Reduced Motion Test

Reduced-motion mode removes or shortens nonessential transitions.

### 3.T8 — Responsive Shell Test

At representative widths:

- Main content remains visible.
- Inspector can collapse.
- Catalog can become a drawer.
- Top action remains accessible.

### 3.T9 — Cross-Platform Font Fallback Test

The UI remains legible if Geist fails and falls back to system sans.

## Exit Criteria

- Design primitives are reusable.
- The shell is visually coherent.
- The icon decision is recorded or temporary adapter remains explicitly marked.
- Tests 3.T1–3.T9 pass.

---

# Sprint 4 — Studios, Shows, and Show Detail

## Goal

Implement the first complete user navigation path from application launch into a Show.

## User-Visible Increment

A user can:

1. Create a Studio.
2. Switch Studios.
3. Create a Show.
4. Open a Show.
5. See Create New Episode, Design Show, and Recent Episodes sections.

## Subtasks

### 4.1 — Implement Studio Persistence `[REQUIRED]`

Add migrations and repository implementation for Studios.

### 4.2 — Implement Studio Creation `[REQUIRED]`

Fields:

- Studio name
- Optional logo placeholder only if easy

After creation:

- Select Studio
- Navigate to Studio Home

### 4.3 — Implement Studio Switcher `[REQUIRED]`

Account-style menu with:

- Current Studio
- Other Studios
- Create Studio
- Studio settings placeholder

Persist last selected Studio.

### 4.4 — Implement Studio Home `[REQUIRED]`

Include:

- Studio name
- New Show
- Search Shows
- Show card grid
- Empty state

Do not show expanded Episode lists.

### 4.5 — Implement Show Creation `[REQUIRED]`

Fields:

- Show name
- Optional description
- Optional thumbnail

After creation, navigate to Show Detail or Design Show according to the UX default selected below.

### 4.6 — Implement Show Cards `[REQUIRED]`

Display:

- Thumbnail placeholder or image
- Title
- Description
- Episode count
- Last edited

Actions:

- Open
- Rename
- Archive
- Delete with confirmation

### 4.7 — Implement Show Detail `[REQUIRED]`

Information order:

1. Create New Episode
2. Design Show
3. Recent Episodes

Include empty placeholders before Episodes exist.

### 4.8 — Implement Basic Search `[REQUIRED]`

Search Show names within current Studio.

### 4.9 — Implement Last Route Restore `[REQUIRED]`

On application restart:

- Restore last Studio.
- Restore a safe durable route.
- Fall back to Studio Home if the object no longer exists.

## Decision Notes

### D4.1 — New Show Destination `[USE MVP DEFAULT]`

After Show creation, navigate to Design Show with an empty Blueprint.

This can be changed later without altering the domain.

### D4.2 — Brand Kit Setup `[USE MVP DEFAULT]`

Studio name is required. Logo is optional. Full Brand Kit is deferred.

### D4.3 — Starter Show Templates `[USE MVP DEFAULT]`

Offer Blank Show only.

### D4.4 — Illustration Style `[USE MVP DEFAULT]`

Use minimal geometric placeholders. No mascots.

## Required Tests

### 4.T1 — Studio Repository Integration Tests

Create, list, rename, and archive Studios.

### 4.T2 — Studio Isolation Test

Shows from Studio A never appear in Studio B.

### 4.T3 — Last Studio Restore Test

Restart selects the last valid Studio.

### 4.T4 — Studio Empty-State Renderer Test

Correct copy and Create Studio action appear.

### 4.T5 — Show Creation End-to-End Test

Create Studio → Create Show → arrive at correct Show.

### 4.T6 — Show Search Test

Search filters only current Studio's Shows.

### 4.T7 — Show Card Accessibility Test

Card has an accessible name and non-pointer Open action.

### 4.T8 — Delete Confirmation Test

Referenced destructive action requires confirmation.

### 4.T9 — Show Detail Hierarchy Test

Create New Episode is the primary action and appears before Design Show and Recent Episodes in semantic order.

### 4.T10 — Route Recovery Test

Missing last route falls back without blank screen or crash.

## Exit Criteria

- Studio and Show navigation works after restart.
- Studio isolation is enforced.
- Show Detail reflects the UX hierarchy.
- Tests 4.T1–4.T10 pass.

---

# Sprint 5 — Segment Catalog and Show Blueprint

## Goal

Make the structural Design Show workflow usable before adding detailed Segment content or visual Layout composition.

## User-Visible Increment

A user can:

- Enter Design Show.
- Create reusable Segments.
- Browse the Segment Catalog.
- Add Segments to the Blueprint.
- Reorder, duplicate, and remove Blueprint placements.
- See scope and autosave status.

## Subtasks

### 5.1 — Add Segment and Blueprint Schema `[REQUIRED]`

Implement migrations for:

- Show Segments
- Show Blueprints
- Blueprint placements
- Ordering
- Archive state

### 5.2 — Implement Design Show Route and Scope Header `[REQUIRED]`

Display:

```text
Design Show
Changes become the default for future Episodes.
```

### 5.3 — Implement Design Show Navigation `[REQUIRED]`

Use MVP default tabs:

- Blueprint
- Segments
- Layouts

The Layout tab may show a placeholder until Sprint 10.

### 5.4 — Implement Segment Catalog `[REQUIRED]`

Include:

- Search
- Alphabetical and recently edited sort
- New Segment
- Segment cards
- Usage count
- Archive action

### 5.5 — Implement Minimal Segment Creation `[REQUIRED]`

Fields:

- Name
- Optional description

Creation from Blueprint:

- Saves at Show scope
- Adds placement at requested position
- Opens a minimal Segment detail placeholder

### 5.6 — Implement Blueprint Storyboard `[REQUIRED]`

Use a responsive card grid.

Each card displays:

- Thumbnail placeholder
- Segment name
- Expected duration placeholder
- Validation placeholder

### 5.7 — Implement Add Segment Picker `[REQUIRED]`

Drawer over Blueprint with:

- Search
- Catalog list
- Add existing
- Create new

### 5.8 — Implement Blueprint Reordering `[REQUIRED]`

Use `@dnd-kit` after confirming the interaction spike.

Persist transactionally and support keyboard alternative.

### 5.9 — Implement Placement Duplicate and Remove `[REQUIRED]`

Duplicate:

- New placement
- Same Show Segment reference

Remove:

- Blueprint only
- Segment remains in Catalog

### 5.10 — Implement Structural Undo/Redo `[REQUIRED]`

Cover:

- Add placement
- Remove placement
- Duplicate placement
- Reorder

### 5.11 — Implement Autosave Status `[REQUIRED]`

Structural commands persist immediately.

Show:

- Saving
- Saved
- Failed

### 5.12 — Implement Blueprint Empty State `[REQUIRED]`

Use approved copy from UX Specification.

## Decision Notes

### D5.1 — Catalog Navigation `[USE MVP DEFAULT]`

Use top-level tabs plus a picker drawer.

Keep Catalog components modular.

### D5.2 — Card Opening Interaction `[USE MVP DEFAULT]`

For MVP:

- Single click selects.
- Double click or Enter opens.
- Explicit Open action is available.

Do not yet implement the full expansion transition.

### D5.3 — Storyboard Zoom `[USE MVP DEFAULT]`

One medium card size only.

### D5.4 — Catalog Organization `[USE MVP DEFAULT]`

Search and simple sort only. No folders.

### D5.5 — Drag Library Viability `[SPIKE]`

Before full reorder implementation, verify:

- Pointer drag
- Keyboard reorder
- Auto-scroll
- Electron behavior
- Undo grouping

If the chosen library fails, document replacement decision.

## Required Tests

### 5.T1 — Catalog Scope Test

A created Segment belongs to the current Show.

### 5.T2 — Create-From-Blueprint Test

Creating from the picker both creates the Catalog Segment and inserts the placement.

### 5.T3 — Add Existing Segment Test

Adds placement without duplicating Segment definition.

### 5.T4 — Reorder Domain Test

Reorder produces exact requested order.

### 5.T5 — Reorder Repository Test

Order survives reload.

### 5.T6 — Keyboard Reorder Test

A selected card can move before or after without pointer input.

### 5.T7 — Duplicate Placement Test

New placement ID, same Segment ID.

### 5.T8 — Remove Placement Test

Segment remains searchable in Catalog.

### 5.T9 — Undo/Redo Structural Test

Each structural operation can be undone and redone persistently.

### 5.T10 — Save Failure Test

A failed reorder restores or clearly reconciles UI state and displays Save failed.

### 5.T11 — Empty Blueprint End-to-End Test

Add First Segment creates a Segment and places it.

### 5.T12 — Scope Copy Test

Design Show scope message remains visible.

### 5.T13 — Accessibility Test

Storyboard is represented as an ordered list and controls have keyboard alternatives.

## Exit Criteria

- A reusable Show structure can be designed.
- Segment ownership and placement semantics are correct.
- Structural undo/redo and autosave work.
- Tests 5.T1–5.T13 pass.

---

# Sprint 6 — Episodes and Episode Storyboard

## Goal

Complete the core reusable workflow: Blueprint → new Episode → independently editable Episode Storyboard.

## User-Visible Increment

A user can:

- Create an Episode from a Blueprint.
- Open Produce Episode.
- See copied Segment cards.
- Reorder, duplicate, remove, and insert Segments without changing the Blueprint.

## Subtasks

### 6.1 — Add Episode Persistence `[REQUIRED]`

Migrations for:

- Episodes
- Episode Segments
- Episode ordering
- Episode metadata
- Status

### 6.2 — Implement New Episode Flow `[REQUIRED]`

Fields:

- Title
- Optional episode number
- Optional planned date

If Blueprint is empty:

- Offer Design Show
- Or Create Blank Episode

### 6.3 — Implement Transactional Create From Blueprint `[REQUIRED]`

Use the application command from Sprint 2.

### 6.4 — Implement Produce Episode Route `[REQUIRED]`

Persistent scope:

```text
Produce Episode
Changes apply only to this Episode.
```

### 6.5 — Implement Episode Storyboard `[REQUIRED]`

Cards display:

- Segment name
- Episode summary placeholder
- Expected duration
- Readiness placeholder
- Validation count placeholder

### 6.6 — Implement Episode Structural Editing `[REQUIRED]`

Support:

- Reorder
- Duplicate Episode Segment
- Remove
- Insert Catalog Segment
- Create new reusable Segment and insert

### 6.7 — Implement Episode Progress Summary `[REQUIRED]`

Initial calculation:

- Segment count
- Ready count placeholder
- Needs content count placeholder
- Sum expected durations

### 6.8 — Implement Recent Episodes on Show Detail `[REQUIRED]`

Display:

- Title
- Episode number
- Planned date
- Draft/Ready
- Last edited
- Thumbnail strip placeholder

### 6.9 — Implement Episode Search/List View `[RECOMMENDED]`

A simple View All screen may be included if needed to avoid dead navigation.

### 6.10 — Implement Episode Undo/Redo `[REQUIRED]`

Cover structural operations.

## Decision Notes

### D6.1 — Episode Status Lifecycle `[USE MVP DEFAULT]`

Use:

- Draft
- Ready

No Scheduled, Live, Complete, or Archived production lifecycle yet.

### D6.2 — Runtime Calculation `[USE MVP DEFAULT]`

Sum expected Segment durations only.

Label as Estimated runtime.

### D6.3 — Blank Episode Behavior `[USE MVP DEFAULT]`

Permit blank Episode after explicit choice.

## Required Tests

### 6.T1 — Create From Blueprint Transaction Test

Episode and all Episode Segments commit atomically.

### 6.T2 — Episode Independence Test

Reordering Episode does not alter Blueprint.

### 6.T3 — Episode Removal Independence Test

Removing Episode Segment does not remove Blueprint placement or Catalog Segment.

### 6.T4 — Episode Duplicate Test

Copies Episode data and source reference into a separate instance.

### 6.T5 — Insert Existing Segment Test

Creates Episode Segment without modifying Blueprint.

### 6.T6 — Create New Segment From Episode Test

Creates Show Segment in Catalog and inserts Episode Segment.

### 6.T7 — Duplicate Source Segment Test

Two occurrences can be edited independently later.

### 6.T8 — Empty Blueprint Flow Test

Both Design Show and Create Blank Episode actions work.

### 6.T9 — Scope Copy Test

Episode scope message remains visible.

### 6.T10 — Runtime Sum Test

Expected durations sum deterministically and tolerate missing durations.

### 6.T11 — Recent Episodes Test

New Episode appears on Show Detail after creation.

### 6.T12 — Structural Undo Test

Episode reorder, duplicate, remove, and insert can be undone and redone.

### 6.T13 — Browser E2E Core Flow

Create Studio → Show → Blueprint → Episode → reorder Episode.

## Exit Criteria

- The central Showflow promise is structurally demonstrable.
- Episodes diverge safely from Blueprints.
- Tests 6.T1–6.T13 pass.

---

# Sprint 7 — Show Segment Schema and Behavior Editor

## Goal

Allow producers to define what Episode-specific content a reusable Show Segment expects and configure its basic reusable production behavior.

## User-Visible Increment

A producer can open a Show Segment and define:

- Data fields
- Expected duration
- Notes template
- Active default placeholder configuration
- Fixed lifecycle navigation

## Subtasks

### 7.1 — Add Segment Data Field Persistence `[REQUIRED]`

Support field types:

- Short text
- Long text
- Number
- Image Resource
- Video Resource
- Audio Resource
- Boolean

Store:

- Label
- Generated key
- Type
- Required
- Default value
- Help text
- Order

### 7.2 — Implement Show Segment Editor Shell `[REQUIRED]`

Include:

- Segment name
- Scope indicator
- Lifecycle step control
- Main canvas placeholder
- Right inspector
- Notes template

### 7.3 — Implement Lifecycle Navigation `[REQUIRED]`

Show fixed:

```text
Prepare | Enter | Active | Exit | Cleanup
```

No add/remove/reorder controls.

### 7.4 — Implement Data Field Editor `[REQUIRED]`

Support:

- Create
- Rename
- Reorder
- Delete with usage warning later
- Required toggle
- Defaults
- Help text

Generate a stable key at creation. Renaming the label must not silently change the key.

### 7.5 — Implement Expected Duration `[REQUIRED]`

Use a clear duration control with tabular numerals.

### 7.6 — Implement Notes Template `[REQUIRED]`

Plain text or minimal rich text only.

### 7.7 — Implement Active Configuration Skeleton `[REQUIRED]`

Fields:

- Default Layout: unavailable placeholder until Sprint 10
- Available Layouts: unavailable placeholder
- Host Cues: unavailable placeholder until Sprint 13

The UI must explain dependencies rather than present broken controls.

### 7.8 — Implement Prepare and Cleanup Summary `[REQUIRED]`

Display read-only inferred summaries.

Do not build a technical action editor.

### 7.9 — Implement Enter and Exit Action Data Model `[REQUIRED]`

Persist empty ordered action lists and basic APIs.

The visible action builder may remain minimal until Sprint 12.

### 7.10 — Implement Segment-Level Validation `[REQUIRED]`

Validate:

- Name
- Duplicate field keys
- Invalid defaults
- Negative duration
- Required resource defaults where relevant

## Decision Notes

### D7.1 — Advanced Lifecycle Editing `[USE MVP DEFAULT]`

Prepare/Cleanup are inferred and read-only.

Enter/Exit support only the limited action set implemented later.

### D7.2 — Structured Data `[USE MVP DEFAULT]`

No lists, objects, repeaters, rankings, guests, or poll schemas.

### D7.3 — Rich Notes `[USE MVP DEFAULT]`

Use plain text or minimal rich text. No teleprompter.

### D7.4 — Deleting a Used Field `[DECISION REQUIRED BEFORE DESTRUCTIVE UX]`

Before allowing deletion of a field used by:

- Layout binding
- Episode value
- Component property

decide whether to:

- Block deletion
- Cascade into missing validation
- Offer migration

Until Sprint 11 introduces bindings, allow deletion only when no Episode values exist or require confirmation that values will be removed.

## Required Tests

### 7.T1 — Field Key Stability Test

Changing label does not change key.

### 7.T2 — Field Type Validation Tests

Each supported type accepts valid defaults and rejects invalid defaults.

### 7.T3 — Field Ordering Test

Reorder persists.

### 7.T4 — Required Field Test

Required metadata is retained and exposed to validation.

### 7.T5 — Fixed Lifecycle Renderer Test

Exactly five lifecycle steps appear and cannot be changed.

### 7.T6 — Duration Test

Reject negative duration and normalize valid input.

### 7.T7 — Notes Template Persistence Test

Notes survive reload and preserve line breaks.

### 7.T8 — Scope Test

Editor indicates Show Segment scope and future-use semantics.

### 7.T9 — Autosave Race Test

Rapid field edits do not allow an older save to overwrite a newer value.

### 7.T10 — Undo Coalescing Test

A typing sequence becomes one reasonable undo step.

### 7.T11 — Validation Copy Test

User-facing errors use production language.

## Exit Criteria

- Show Segments can define simple reusable content requirements.
- The lifecycle is visible and structurally correct.
- Tests 7.T1–7.T11 pass.

---

# Sprint 8 — Episode Segment Content Editor

## Goal

Allow creators to fill one Episode's content using the Show Segment's schema without changing the reusable definition.

## User-Visible Increment

A creator can open an Episode Segment and:

- Fill text, numbers, booleans, and Resource placeholders
- Edit Episode notes
- Navigate Previous/Next
- See readiness and missing content
- Reset limited overrides

## Subtasks

### 8.1 — Add Episode Segment Value Persistence `[REQUIRED]`

Store values keyed by Show Segment field key.

Validate values against source schema.

### 8.2 — Copy Defaults During Episode Creation `[REQUIRED]`

When Episode Segment is created:

- Copy Blueprint placement default
- Otherwise use Show Segment field default
- Otherwise leave empty

Document precedence.

### 8.3 — Implement Episode Segment Editor Shell `[REQUIRED]`

Show:

- Episode scope indicator
- Source Show Segment
- View Show Segment action
- Content panel
- Canvas placeholder
- Inspector
- Notes
- Previous/Next
- Return to Storyboard

### 8.4 — Render Dynamic Field Controls `[REQUIRED]`

Map simple schema types to controls.

### 8.5 — Implement Episode Notes `[REQUIRED]`

Initialize from notes template.

Editing Episode notes does not change template.

### 8.6 — Implement Readiness Calculation `[REQUIRED]`

A Segment is not Ready when required values are missing.

Display:

- Ready
- Needs content
- Has warnings
- Blocking issue

### 8.7 — Implement Previous and Next Navigation `[REQUIRED]`

Preserve autosave and selection.

At boundaries:

- Disable unavailable direction
- Keep Return to Storyboard

### 8.8 — Implement Limited Overrides `[REQUIRED]`

Support:

- Expected duration
- Notes
- Field values

Layout and Resource overrides arrive in later Sprints.

Include:

- Show default label
- Override indicator
- Reset to Show default

### 8.9 — Update Episode Storyboard Cards `[REQUIRED]`

Display Episode-specific summaries using a safe fallback:

- First meaningful short-text field
- Or user-provided placement label later
- Otherwise Segment name only

### 8.10 — Implement Direct Validation Navigation `[REQUIRED]`

Clicking a missing field issue focuses the field.

## Decision Notes

### D8.1 — Full Override Model `[USE MVP DEFAULT]`

Only the limited overrides listed above.

Do not expose lifecycle or Cue overrides.

### D8.2 — Episode-Specific Placement Label `[DECISION REQUIRED BEFORE CUSTOM LABEL UI]`

The architecture allows an optional placement label, but detailed UX is not complete.

For MVP, derive summary from content rather than adding a label editor.

### D8.3 — Optional Segments `[USE MVP DEFAULT]`

All Storyboard Segments are required. Remove unused Segments.

## Required Tests

### 8.T1 — Default Precedence Test

Blueprint placement default overrides Show Segment default.

### 8.T2 — Episode Isolation Test

Editing one Episode Segment does not alter:

- Source Show Segment
- Another occurrence in same Episode
- Another Episode

### 8.T3 — Dynamic Field Renderer Tests

Every supported field type renders and saves correctly.

### 8.T4 — Required Readiness Test

Missing required field produces Needs content.

### 8.T5 — Ready Test

All required fields filled produces Ready when no other blockers exist.

### 8.T6 — Notes Copy Test

Episode notes initially copy template but diverge independently.

### 8.T7 — Override Reset Test

Reset restores current Show default without changing the Show.

### 8.T8 — Previous/Next Test

Navigation follows Episode Storyboard order.

### 8.T9 — Save Flush Test

Navigating away flushes pending input updates.

### 8.T10 — Validation Focus Test

Selecting an issue moves focus to the relevant field.

### 8.T11 — Storyboard Summary Test

Cards show deterministic, escaped content summary.

### 8.T12 — Browser E2E Content Flow

Create schema → create Episode → enter values → Ready status updates.

## Exit Criteria

- Episodes contain real content.
- Show and Episode scope remain clearly separated.
- Readiness is meaningful before Layouts exist.
- Tests 8.T1–8.T12 pass.

---

# Sprint 9 — Resource System

## Goal

Implement secure, local-first linked media Resources and allow them to populate Episode fields and later Layout Components.

## User-Visible Increment

A user can:

- Import an image, video, or audio file.
- See it in a Resource Browser.
- Assign it to compatible Segment fields.
- Detect and repair missing files.

## Subtasks

### 9.1 — Add Resource Persistence `[REQUIRED]`

Store metadata from Technical Specification.

### 9.2 — Implement Native Import Flow `[REQUIRED]`

Use native file dialog through typed IPC.

Support drag/drop through approved APIs.

### 9.3 — Implement File Validation `[REQUIRED]`

Validate:

- Extension
- MIME where available
- File existence
- File size
- Compatible Resource category

### 9.4 — Implement Resource Scopes `[REQUIRED]`

Support:

- Studio
- Show
- Episode

Default based on context.

### 9.5 — Implement Resource Browser `[REQUIRED]`

Include:

- Import
- Search
- Type filter
- Thumbnail/icon
- Name
- Scope
- Availability state

### 9.6 — Implement Secure Custom Protocol `[REQUIRED]`

Use Resource ID, not arbitrary renderer path.

Protect against:

- Path traversal
- Unknown IDs
- Unauthorized cross-Studio access
- MIME confusion

### 9.7 — Implement Image Thumbnail Derivation `[REQUIRED]`

Cache derived thumbnails.

### 9.8 — Implement Basic Media Metadata `[REQUIRED]`

Use browser media APIs for:

- Dimensions
- Duration where available

Do not bundle FFmpeg.

### 9.9 — Implement Missing Resource Detection `[REQUIRED]`

States:

- Available
- Missing
- Unsupported

Actions:

- Locate
- Replace

### 9.10 — Integrate Resource Fields `[REQUIRED]`

Episode Segment Resource fields use visual pickers.

### 9.11 — Implement Resource Usage References `[REQUIRED]`

Show where a Resource is used before destructive removal.

### 9.12 — Add Large File Safety `[REQUIRED]`

Never load full video/audio into renderer memory.

## Decision Notes

### D9.1 — Managed Library and Packaging `[USE MVP DEFAULT]`

Files remain linked in place.

### D9.2 — Device Inputs `[DEFERRED TO SPRINT 11]`

Camera Component support may introduce device Resources later.

### D9.3 — Advanced Codec Support `[DEFERRED]`

Use Chromium-supported playback.

### D9.4 — Resource Hashing `[RECOMMENDED]`

Hash only when needed for duplicate detection; perform outside renderer for large files.

## Required Tests

### 9.T1 — Import Metadata Test

Valid file creates Resource metadata.

### 9.T2 — Unsupported File Test

Unsupported file produces actionable error.

### 9.T3 — Scope Isolation Test

Episode Resource is not shown as reusable Show Resource unless explicitly promoted in a future feature.

### 9.T4 — Protocol Traversal Test

Path traversal attempts are rejected.

### 9.T5 — Unknown Resource Test

Unknown ID returns controlled error, not arbitrary file access.

### 9.T6 — Cross-Studio Access Test

Resource from another Studio cannot be resolved through current context.

### 9.T7 — Stream Safety Test

Large media response is streamed and not read into one in-memory buffer.

### 9.T8 — Missing File Test

Deleted/moved source is marked Missing while usage remains intact.

### 9.T9 — Locate Test

Relinking updates path and restores availability.

### 9.T10 — Replace Test

Replacement preserves Resource ID and updates derived metadata.

### 9.T11 — Thumbnail Cache Test

Thumbnail regenerates after source modification.

### 9.T12 — Resource Field E2E Test

Import image → assign to required field → readiness updates.

### 9.T13 — Permission Denial Test

Denied file/device permission shows clear recovery path.

## Exit Criteria

- Resources are secure, persistent, and reusable by scope.
- No arbitrary path access reaches the renderer.
- Tests 9.T1–9.T13 pass.

---

# Sprint 10 — Layout Catalog and Constrained Layout Editor

## Goal

Create reusable Show-level Layouts with fixed aspect ratios and rectangular Slots using a constrained DOM/CSS editor.

## User-Visible Increment

A producer can:

- Create a Layout from a preset.
- Add, move, resize, rename, and layer Slots.
- Preview the audience frame.
- Use numeric controls instead of drag.

## Subtasks

### 10.1 — Add Layout and Slot Persistence `[REQUIRED]`

Store:

- Show ownership
- Name
- Aspect ratio
- Slots
- Normalized coordinates
- Role
- Layer
- Clip setting
- Allowed Component categories

### 10.2 — Implement Layout Catalog `[REQUIRED]`

Include:

- Search
- New Layout
- Preview placeholder
- Aspect ratio
- Usage count
- Duplicate
- Rename
- Archive

### 10.3 — Implement MVP Presets `[REQUIRED]`

Create data-driven presets:

- Blank
- Host
- Host + Video
- Fullscreen Video

### 10.4 — Implement Layout Editor Shell `[REQUIRED]`

Include:

- Component panel placeholder
- Resource panel
- Central canvas
- Right inspector
- Canvas toolbar

### 10.5 — Implement Fixed Aspect Ratio Canvas `[REQUIRED]`

Support:

- 16:9
- 9:16

One Layout has one ratio.

### 10.6 — Implement Normalized Slot Geometry `[REQUIRED]`

Store coordinates 0–1.

Convert deterministically for display.

### 10.7 — Implement Slot Creation `[REQUIRED]`

Allow:

- Preset-generated Slots
- Rectangle creation tool

### 10.8 — Implement Slot Selection and Editing `[REQUIRED]`

Support:

- Move
- Resize
- Rename
- Delete
- Layer order
- Clip
- Semantic role
- Allowed Component category

### 10.9 — Implement Numeric Inspector Controls `[REQUIRED]`

Accessible controls for:

- X
- Y
- Width
- Height
- Layer

### 10.10 — Implement Guides and Safe Areas `[REQUIRED]`

Use restrained blueprint visual language.

### 10.11 — Implement Slot Undo/Redo `[REQUIRED]`

One drag = one undo step.

### 10.12 — Implement Create Layout From Episode Context `[REQUIRED]`

Create at Show scope and return to origin.

## Decision Notes

### D10.1 — Layout Preset Details `[USE MVP DEFAULT]`

Use four presets. Exact Slot geometry can be tuned, but must be data-driven.

### D10.2 — Aspect Ratio Strategy `[USE MVP DEFAULT]`

Separate fixed-ratio Layouts. No linked responsive variants.

### D10.3 — Accessible Canvas Manipulation `[USE MVP DEFAULT]`

Numeric inspector is required.

### D10.4 — Snap Rules `[DECISION REQUIRED BEFORE POLISH]`

Basic edge and center snapping can be implemented.

Before advanced guide behavior, decide:

- Snap threshold
- Whether Slot-to-Slot snapping is included
- Modifier key behavior

Use simple edge/center snapping for MVP.

## Required Tests

### 10.T1 — Normalized Geometry Round-Trip Test

Persist and reload without meaningful drift.

### 10.T2 — Bounds Test

Slots cannot become invalid or negative.

### 10.T3 — Minimum Size Test

Resize respects minimum dimensions.

### 10.T4 — Aspect Ratio Test

Canvas maintains selected ratio across container sizes.

### 10.T5 — Preset Test

Each preset creates expected Slot roles and bounds.

### 10.T6 — Pointer Move/Resize Test

Pointer interaction updates geometry.

### 10.T7 — Numeric Control Test

Keyboard-only user can position and resize Slot.

### 10.T8 — Undo Coalescing Test

One continuous drag produces one undo entry.

### 10.T9 — Layer Order Test

Slots render in stable persistent order.

### 10.T10 — Create From Episode Scope Test

Layout belongs to Show and returns to Episode context.

### 10.T11 — Safe Area Visibility Test

Guides appear only in editing mode.

### 10.T12 — Accessibility Scan

Canvas controls expose names, values, and keyboard paths.

## Exit Criteria

- Layouts are reusable Show objects.
- The editor remains constrained rather than general-purpose.
- Tests 10.T1–10.T12 pass.

---

# Sprint 11 — Components, Placements, and Bindings

## Goal

Render reusable Components inside Layout Slots and resolve fixed values, Resources, and Episode Segment data.

## User-Visible Increment

A producer can build a reusable Host Layout containing:

- Background
- Camera or camera placeholder
- Logo
- Lower Third

and preview it using sample or Episode data.

## Subtasks

### 11.1 — Add Component and Placement Persistence `[REQUIRED]`

Store:

- Component definition
- Type
- Property schema
- Defaults
- Enter/exit configuration
- Placement
- Slot reference
- Bindings
- Overrides

### 11.2 — Implement Built-In Component Registry `[REQUIRED]`

MVP types:

- Camera
- Video
- Image
- Text
- Background
- Logo
- Lower Third

### 11.3 — Implement Component Browser `[REQUIRED]`

Allow drag or selection into compatible Slot.

### 11.4 — Implement Placement Lifecycle `[REQUIRED]`

Support:

- Assign
- Replace
- Remove
- Select
- Inspect

### 11.5 — Implement Static Component Rendering `[REQUIRED]`

Render through DOM/CSS.

### 11.6 — Implement Binding Discriminated Union `[REQUIRED]`

Support:

- Literal
- Resource
- Segment field
- Episode metadata
- Show metadata

### 11.7 — Implement Shared Binding Resolver `[REQUIRED]`

Use same resolver for:

- Editor
- Preview
- Validation
- Rehearsal

### 11.8 — Implement Binding UI `[REQUIRED]`

Use production language:

```text
Title text
Use Segment field: Lower Third Title
```

### 11.9 — Implement Lower Third Template `[REQUIRED]`

Expose:

- Title
- Subtitle
- Optional image/logo
- Restrained style preset
- Default enter/exit values

### 11.10 — Implement Fixed Resource Assignment `[REQUIRED]`

Allow background, logo, and media to be assigned once at Layout level.

### 11.11 — Implement Camera Device Abstraction `[REQUIRED MINIMUM]`

Represent camera as a logical device Resource.

Support states:

- Available
- Permission required
- Unavailable
- Disconnected

A static placeholder is acceptable in browser tests.

### 11.12 — Implement Compatibility Validation `[REQUIRED]`

Validate:

- Slot category
- Component type
- Required property
- Binding source
- Resource type
- Missing device

### 11.13 — Integrate Layout Into Segment Editor `[REQUIRED]`

Allow Show Segment Active configuration to choose:

- Default Layout
- Available Layouts

### 11.14 — Integrate Layout Into Episode Editor `[REQUIRED]`

Render Active default Layout with Episode data.

Support limited Episode override:

- Default Layout
- Fixed Resource replacement

Include Reset to Show default.

## Decision Notes

### D11.1 — Custom Component Creation `[USE MVP DEFAULT]`

Built-in templates only. No general authoring environment.

### D11.2 — Typography and Graphic Styling `[USE MVP DEFAULT]`

Use restrained style presets and limited token-backed properties.

### D11.3 — Camera Device UX `[USE MVP DEFAULT]`

Simple device picker and unavailable status only.

### D11.4 — Deleting a Bound Segment Field `[DECISION REQUIRED]`

Before field deletion can proceed when bindings exist, choose one:

- Block until bindings are removed, recommended for MVP.
- Allow and create validation errors.

Recommended MVP: block and list usages.

## Required Tests

### 11.T1 — Component Registry Test

Every declared type has:

- Schema
- Renderer
- Supported Slot roles
- Default configuration

### 11.T2 — Slot Compatibility Test

Incompatible Component cannot be placed.

### 11.T3 — Literal Binding Test

Literal resolves correctly.

### 11.T4 — Resource Binding Test

Compatible Resource resolves and incompatible Resource fails clearly.

### 11.T5 — Segment Field Binding Test

Episode value appears in rendered Component.

### 11.T6 — Metadata Binding Test

Show and Episode metadata resolve correctly.

### 11.T7 — Missing Binding Test

Resolver returns a structured missing result.

### 11.T8 — Shared Resolver Test

Editor preview and readiness validation produce the same result for the same input.

### 11.T9 — Fixed Layout Resource Reuse Test

Same background/logo is reused across multiple Segments without repeated assignment.

### 11.T10 — Lower Third Rendering Test

Title and subtitle bind and render with defaults.

### 11.T11 — Camera State Test

Unavailable device produces production-language issue.

### 11.T12 — Default Layout Selection Test

Show Segment stores and reloads default/available Layouts.

### 11.T13 — Episode Resource Override Test

Override affects only Episode Segment and can reset.

### 11.T14 — Bound Field Deletion Test

Deletion is blocked and usages are listed.

### 11.T15 — Visual Preview E2E Test

Create Layout → place Background/Logo/Lower Third → bind fields → render Episode values.

## Exit Criteria

- Reusable visual compositions render meaningful Episode data.
- One Host Layout can be reused across Segments.
- Tests 11.T1–11.T15 pass.

---

# Sprint 12 — Preview Runtime and Segment Lifecycle

## Goal

Execute a Show Segment deterministically through Prepare, Enter, Active, Exit, and Cleanup using engine-neutral instructions.

## User-Visible Increment

A user can preview a Segment:

- Run Enter
- See Active Layout
- Switch available Layouts
- Run Exit
- Restart or stop

## Subtasks

### 12.1 — Implement Execution Instruction Types `[REQUIRED]`

Support initial instructions:

- Preload Resource
- Activate Layout
- Play Resource
- Stop Resource
- Wait for animation completion
- Wait for media completion
- Set Active defaults
- Clear temporary state

### 12.2 — Implement Instruction Generator `[REQUIRED]`

Convert Segment configuration into normalized instructions.

### 12.3 — Implement Runtime State Machine `[REQUIRED]`

States:

- Idle
- Preparing
- Entering
- Active
- Exiting
- Cleaning Up
- Stopped
- Failed

### 12.4 — Implement Abstract Clock `[REQUIRED]`

Use fake clock in tests.

### 12.5 — Implement Cancellation `[REQUIRED]`

Use unified cancellation for:

- Stop
- Restart
- Jump
- Window close
- Layout change

### 12.6 — Implement Animation Registry `[REQUIRED]`

Presets:

- None
- Fade
- Slide Up
- Slide Down
- Slide Left
- Slide Right
- Scale In
- Scale Out
- Pop
- Wipe

### 12.7 — Implement Placement Animation Configuration `[REQUIRED]`

Support:

- Component default
- Placement override
- Duration
- Delay
- Easing

### 12.8 — Implement Layout Activation `[REQUIRED]`

On activation:

- Resolve Placements
- Render Components
- Run enter animation
- Deactivate prior Layout with exits

### 12.9 — Implement Minimal Enter/Exit Action Editor `[REQUIRED]`

Support ordered:

- Activate Layout
- Wait for animation
- Start/stop media where necessary

No branching or keyframes.

### 12.10 — Implement Segment Preview UI `[REQUIRED]`

Controls:

- Restart
- Enter
- Active
- Exit
- Stop

### 12.11 — Implement Blueprint Visual Preview `[REQUIRED MINIMUM]`

Show visual sequence of thumbnails and allow opening Segment Preview.

Do not run the full Blueprint as a production yet.

### 12.12 — Implement Failure Presentation `[REQUIRED]`

If Resource, Layout, or media fails:

- Move runtime to Failed
- Show affected production object
- Offer Stop or Retry when safe

## Decision Notes

### D12.1 — Full Blueprint Runtime Preview `[USE MVP DEFAULT]`

Visual sequence only. Full runtime belongs to Rehearsal.

### D12.2 — Dual Audience/Host Preview `[USE MVP DEFAULT]`

Audience preview only.

### D12.3 — Prepare/Cleanup Manual Controls `[USE MVP DEFAULT]`

Infer basic behavior and show summary.

### D12.4 — Wipe Implementation Detail `[RECOMMENDED]`

Use one restrained default direction. Do not create a complex wipe editor.

## Required Tests

### 12.T1 — Runtime State Transition Test

Valid transition sequence follows lifecycle order.

### 12.T2 — Invalid Transition Test

Runtime rejects impossible transitions.

### 12.T3 — Instruction Generation Test

Known Segment produces exact normalized instruction list.

### 12.T4 — Prepare Failure Test

Missing required Resource prevents Enter and produces failure.

### 12.T5 — Layout Activation Test

New Layout enters and previous Layout exits in correct order.

### 12.T6 — Animation Completion Test

Runtime waits for configured completion.

### 12.T7 — Reduced Motion Completion Test

Reduced motion still resolves completion deterministically.

### 12.T8 — Cancellation Test

Stop cancels pending wait/media/animation and clears temporary state.

### 12.T9 — Restart Test

Restart returns to clean initial state.

### 12.T10 — Media Completion Test

Wait-for-media advances only after media completion or cancellation.

### 12.T11 — Renderer Preview Test

Segment preview displays correct active audience output.

### 12.T12 — Failure Copy Test

Error names Segment/Layout/Resource rather than internal command.

### 12.T13 — No General Timeline Test

Architecture test confirms no user keyframe/timeline model has been introduced.

## Exit Criteria

- Segment runtime is deterministic and cancellable.
- Preview uses the same binding and instruction layers intended for rehearsal.
- Tests 12.T1–12.T13 pass.

---

# Sprint 13 — Host Cues

## Goal

Add manually triggered production actions during Active without creating a general automation system.

## User-Visible Increment

A producer can configure and test single-action Host Cues such as:

- Activate Layout
- Show/hide Component
- Play sound
- Start/stop media

## Subtasks

### 13.1 — Add Cue Persistence `[REQUIRED]`

Store:

- Name
- Single action
- Target
- Lifetime
- Completion
- Retrigger behavior
- Order
- Optional shortcut

### 13.2 — Implement Cue Editor `[REQUIRED]`

Fields:

- Name
- Action
- Target
- Lifetime
- Completion
- Retrigger behavior

### 13.3 — Implement Manual Trigger API `[REQUIRED]`

A Cue cannot start through timer or condition.

### 13.4 — Implement Cue Actions `[REQUIRED]`

Support:

- Activate Layout
- Show Component
- Hide Component
- Play sound
- Start media
- Pause media
- Restart media
- Stop media

### 13.5 — Implement Lifetime `[REQUIRED]`

Support:

- Until dismissed
- Fixed duration
- Until Segment exit

### 13.6 — Implement Completion `[REQUIRED]`

Support:

- Run target exit/hide
- Restore prior Layout
- Restore Active default Layout
- Stop media

### 13.7 — Implement Retrigger Behavior `[REQUIRED]`

Support:

- Restart lifetime
- Dismiss
- Ignore
- Restart action

Do not add overlapping instances in MVP unless already trivial and safe.

### 13.8 — Implement Cue Palette `[REQUIRED]`

Large labeled controls with:

- Ready
- Active
- Remaining time
- Dismiss where allowed
- Failed

### 13.9 — Integrate Cue Testing Into Segment Preview `[REQUIRED]`

### 13.10 — Add Shortcut Conflict Validation `[REQUIRED]`

Shortcuts are optional.

Do not define the full global shortcut map.

## Decision Notes

### D13.1 — Multi-Action Cue Builder `[USE MVP DEFAULT]`

Single-action only. Data structures may allow arrays later.

### D13.2 — Showtime Safety Controls `[USE MVP DEFAULT]`

Use reversible, non-destructive Cues. No hold-to-trigger system yet.

### D13.3 — Global Keyboard Shortcut Map `[DECISION REQUIRED BEFORE FINAL SHORTCUT POLISH]`

Only optional local shortcuts now. Avoid collisions with platform standards.

## Required Tests

### 13.T1 — Manual Trigger Invariant Test

No Cue can begin without explicit trigger call.

### 13.T2 — Fixed Duration Test

Cue completes at exact fake-clock time.

### 13.T3 — Until Dismissed Test

Cue remains until explicit dismissal.

### 13.T4 — Segment Exit Test

Cue configured until Segment exit completes during Exit.

### 13.T5 — Restore Prior Layout Test

Temporary Cue returns to prior Layout.

### 13.T6 — Restore Default Layout Test

Cue returns to Active default.

### 13.T7 — Retrigger Restart Test

Lifetime restarts deterministically.

### 13.T8 — Retrigger Ignore Test

Second trigger has no effect.

### 13.T9 — Cue Cancellation Test

Stopping preview clears active Cues.

### 13.T10 — Shortcut Conflict Test

Duplicate local shortcuts produce validation issue.

### 13.T11 — Cue Palette Accessibility Test

Cues are keyboard operable with clear active states.

### 13.T12 — Single-Action Boundary Test

UI cannot add a second action.

### 13.T13 — Preview E2E Cue Test

Trigger timed graphic → observe active state → automatic completion → default restored.

## Exit Criteria

- Manual Cues work in Segment Preview.
- Cue behavior is deterministic and does not become automation.
- Tests 13.T1–13.T13 pass.

---

# Sprint 14 — Episode Rehearsal

## Goal

Run an Episode end to end without broadcasting using the same Segment runtime and Cues.

## User-Visible Increment

A creator can rehearse from the beginning or any Segment and operate:

- Current Segment
- Next Segment
- Notes
- Host Cues
- Previous
- Restart
- Next
- Stop
- Elapsed time

## Subtasks

### 14.1 — Implement Rehearsal Session Model `[REQUIRED]`

Track:

- Episode ID
- Ordered Segment IDs
- Current index
- Runtime state
- Elapsed Episode time
- Actual Segment durations
- Cues triggered
- Failures

Persistence of full history is optional; current session state is required.

### 14.2 — Implement Start From Beginning `[REQUIRED]`

### 14.3 — Implement Start From Selected Segment `[REQUIRED]`

### 14.4 — Implement Segment Navigation `[REQUIRED]`

- Previous
- Next
- Restart
- Stop

Next must execute current Exit/Cleanup before next Prepare/Enter.

### 14.5 — Implement Rehearsal Workspace `[REQUIRED]`

Layout:

- Large audience preview
- Current and Next
- Notes
- Cue palette
- Navigation controls
- Elapsed/estimated time

### 14.6 — Implement Current and Next State Styling `[REQUIRED]`

Use:

- Gold for Current
- Neutral emphasis for Next

### 14.7 — Implement Notes Display `[REQUIRED]`

Host-readable sizing.

### 14.8 — Implement Timing `[REQUIRED]`

Track:

- Episode elapsed
- Current Segment elapsed
- Estimated runtime

### 14.9 — Implement Runtime Failure Recovery `[REQUIRED MINIMUM]`

Allow:

- Retry current action where safe
- Restart Segment
- Skip to next Segment
- Stop rehearsal

### 14.10 — Update Readiness Entry Gate `[REQUIRED]`

Allow rehearsal with warnings.

Before starting with blocking issues:

- Show issue summary
- Permit explicit continue only if runtime can safely proceed
- Otherwise block with fix navigation

### 14.11 — Implement Rehearsal Session Cleanup `[REQUIRED]`

Stopping or closing clears:

- Timers
- Media
- Cues
- Temporary Layout state
- Device streams

## Decision Notes

### D14.1 — Rehearsal Reporting `[USE MVP DEFAULT]`

Show elapsed time and optionally actual per-Segment duration.

No report dashboard.

### D14.2 — Audience Versus Host Monitor `[USE MVP DEFAULT]`

One audience preview with controls outside it.

### D14.3 — Teleprompter `[DEFERRED]`

Notes panel only.

### D14.4 — Recovery Simulation `[DEFERRED]`

Do not simulate network/device failures.

## Required Tests

### 14.T1 — Begin at First Segment Test

Correct Segment prepares and enters.

### 14.T2 — Begin at Selected Segment Test

Earlier Segments do not execute.

### 14.T3 — Next Transition Test

Current Exit/Cleanup completes before next Prepare.

### 14.T4 — Previous Transition Test

Previous Segment restarts in clean state.

### 14.T5 — Restart Segment Test

Current temporary state is cleared before restart.

### 14.T6 — Stop Cleanup Test

All media, Cues, waits, and timers stop.

### 14.T7 — Timing Test

Fake clock yields deterministic Segment and Episode time.

### 14.T8 — Notes Test

Correct Episode notes appear for Current Segment.

### 14.T9 — Current/Next Test

UI updates labels and visual state at every transition.

### 14.T10 — Blocking Validation Test

Unsafe rehearsal is blocked with navigation to issue.

### 14.T11 — Warning Continue Test

Nonblocking warning permits rehearsal after acknowledgement.

### 14.T12 — Failure Recovery Test

Failed Resource permits Restart, Skip, or Stop without corrupted runtime.

### 14.T13 — Full Episode E2E Test

Run a fixture Episode with:

- Three Segments
- Multiple Layouts
- Media
- Timed Cue
- Previous/Next
- Clean stop

### 14.T14 — Accessibility Test

All rehearsal controls are keyboard accessible and have large targets.

## Exit Criteria

- A complete Episode can be rehearsed without broadcasting.
- Runtime state remains clean across navigation.
- Tests 14.T1–14.T14 pass.

---

# Sprint 15 — Hardening, Accessibility, and Performance

## Goal

Turn the complete vertical slice into a reliable MVP suitable for sustained personal use.

## User-Visible Increment

The existing workflows become more resilient, accessible, and polished. No major new feature domain should be introduced.

## Subtasks

### 15.1 — Complete Validation Coverage `[REQUIRED]`

Add all Architecture PRD validation cases:

- Missing required data
- Missing Resource
- Deleted Layout
- Deleted Component
- Invalid Slot
- Unsupported Component
- Unsatisfied binding
- Cue target errors
- Camera unavailable
- Unsupported media
- Archived Segment reference

### 15.2 — Implement Validation Panel `[REQUIRED]`

Include:

- Severity
- Production-language message
- Affected object
- Fix navigation
- Storyboard summary

### 15.3 — Harden Autosave Queue `[REQUIRED]`

Verify:

- Per-entity serialization
- Debounce ordering
- Failed mutation recovery
- Window-close flush
- No stale overwrite

### 15.4 — Harden Undo/Redo `[REQUIRED]`

Cover all MVP editing surfaces.

Set bounded stack size.

### 15.5 — Implement Session Restoration `[REQUIRED MINIMUM]`

Restore:

- Last Studio
- Last safe route
- Persisted edits

Do not promise recovery of an uncommitted pointer drag.

### 15.6 — Conduct Accessibility Pass `[REQUIRED]`

Cover:

- Keyboard
- Focus
- Ordered Storyboard semantics
- Drag alternatives
- Reduced motion
- Contrast
- Target sizes
- Screen-reader labels
- Numeric canvas controls

### 15.7 — Conduct Performance Pass `[REQUIRED]`

Test fixture sizes:

- 100 Storyboard cards
- 200 Segment Catalog entries
- 100 Layouts
- Large media links

Profile before optimizing.

### 15.8 — Harden Error Boundaries and Logging `[REQUIRED]`

Add:

- Feature boundaries
- Fatal boundary
- Rotating local log adapter
- Correlation IDs
- Privacy-safe logging

### 15.9 — Visual Design QA `[REQUIRED]`

Review:

- Geist scale
- Comfortable density
- Gold usage
- Panel quietness
- Canvas dominance
- Focus states
- Cross-platform visual differences

### 15.10 — Finalize Icon Library `[DECISION REQUIRED]`

Select and normalize one icon set before release candidate.

Document:

- Package
- Version
- Wrapper conventions
- Stroke/size rules

### 15.11 — Interaction Decisions `[DECISION REQUIRED FOR POLISH]`

Resolve or explicitly defer:

- Single-click versus double-click Segment open
- Full keyboard shortcut map
- Snap thresholds
- Multi-select
- Context-menu behavior

Only implement decisions approved for MVP.

### 15.12 — Security Review `[REQUIRED]`

Review against Electron security checklist:

- Navigation
- IPC sender validation
- CSP
- Custom protocol
- Permission handlers
- External links
- Path access
- Electron fuses
- Dependency audit

## Required Tests

### 15.T1 — Full Validation Fixture Suite

Every defined validation code has:

- Trigger fixture
- Severity
- Production copy
- Navigation target

### 15.T2 — Autosave Ordering Stress Test

Rapid edits across same and different entities preserve newest values.

### 15.T3 — Window Close Save Test

Pending valid mutations flush or user receives explicit failure confirmation.

### 15.T4 — Undo Regression Suite

All undoable commands persist correct inverse state.

### 15.T5 — Accessibility Full-Flow Test

Keyboard-only flow:

Create Show → Blueprint → Episode → edit content → rehearse.

### 15.T6 — Axe Suite

No serious/critical Axe violations on required screens.

### 15.T7 — Reduced Motion Full-Flow Test

Navigation and runtime remain functional.

### 15.T8 — Storyboard Performance Test

100 cards render and reorder within an agreed baseline recorded in CI or profiling notes.

### 15.T9 — Catalog Performance Test

200 Segments search and scroll without visible blocking on reference Mac.

### 15.T10 — Resource Memory Test

Large video preview does not create whole-file renderer allocation.

### 15.T11 — Security IPC Fuzz Test

Malformed and unexpected IPC payloads are rejected.

### 15.T12 — Protocol Security Regression Test

Traversal, unknown IDs, and cross-scope access remain blocked.

### 15.T13 — Error Boundary Test

Feature failure does not destroy the entire unsaved application session.

### 15.T14 — Cross-Platform Visual Smoke Tests

Core screens render without clipping on macOS, Windows, and Linux.

### 15.T15 — Dependency Audit

No known high-severity production dependency issue remains unaddressed.

## Exit Criteria

- Core workflows are stable and accessible.
- Performance is acceptable on the reference Mac.
- Security review is documented.
- Open interaction decisions are either approved or explicitly deferred.
- Tests 15.T1–15.T15 pass.

---

# Sprint 16 — Cross-Platform Release Candidate

## Goal

Produce installable, smoke-tested MVP builds for macOS, Windows, and Linux.

## User-Visible Increment

A release candidate can be installed and used on the supported desktop platforms.

## Subtasks

### 16.1 — Configure Platform Makers `[REQUIRED]`

Produce:

- macOS arm64 DMG or ZIP
- macOS x64 where practical
- Windows x64 installer
- Linux x64 DEB

### 16.2 — Add Platform Build Matrix `[REQUIRED]`

Build artifacts on their own operating systems.

### 16.3 — Add Packaged-App Database Tests `[REQUIRED]`

Run migration and persistence smoke tests against packaged builds.

### 16.4 — Add Packaged Resource Tests `[REQUIRED]`

Verify:

- Import
- Protocol
- Playback
- Thumbnail
- Locate/Replace

### 16.5 — Add Platform Device Smoke Tests `[REQUIRED WHERE AVAILABLE]`

At minimum manually verify camera permission/state on macOS.

Windows/Linux CI may use mocks if hardware is unavailable.

### 16.6 — Add Upgrade Test `[REQUIRED]`

Install previous internal build with old schema, then upgrade and preserve data.

### 16.7 — Add Release Notes and Known Limitations `[REQUIRED]`

State:

- macOS arm64 primary
- Windows supported
- Linux beta
- Chromium codec limitations
- Linked media behavior
- No live broadcasting
- No cloud sync

### 16.8 — Configure Signing Hooks `[REQUIRED STRUCTURE]`

Add environment-driven configuration.

Actual signing may remain unavailable until credentials exist.

### 16.9 — Run Manual Acceptance Script `[REQUIRED]`

On macOS arm64:

1. Install cleanly.
2. Create Studio.
3. Create Show.
4. Build Blueprint.
5. Define Segment fields.
6. Import media.
7. Create Layout and bindings.
8. Create Episode.
9. Fill content.
10. Preview Segment.
11. Trigger Cue.
12. Rehearse Episode.
13. Quit and reopen.
14. Confirm data and Resources remain correct.

Repeat a reduced smoke script on Windows and Linux.

### 16.10 — Tag MVP Release Candidate `[REQUIRED]`

Only after every automated and manual gate passes.

## Decision Notes

### D16.1 — Signing Credentials `[DECISION/EXTERNAL DEPENDENCY]`

Required for public distribution, not necessarily internal testing.

### D16.2 — Auto-Update `[DEFERRED]`

Do not implement.

### D16.3 — Release Hosting `[DECISION REQUIRED BEFORE PUBLIC RELEASE]`

Not required for local artifact testing.

## Required Tests

### 16.T1 — macOS arm64 Package Launch

Installs or opens and completes main smoke flow.

### 16.T2 — Windows x64 Package Launch

Installs and opens to Studio Home.

### 16.T3 — Linux x64 Package Launch

Installs and opens to Studio Home on supported distribution.

### 16.T4 — Packaged Migration Test

Upgrade preserves all fixture data.

### 16.T5 — Packaged IPC Security Test

Renderer remains isolated in release build.

### 16.T6 — Packaged Resource Protocol Test

Media loads by Resource ID.

### 16.T7 — Restart Persistence Test

Core project survives application restart.

### 16.T8 — Clean Uninstall/Reinstall Data Policy Test

Behavior matches documented user-data policy.

### 16.T9 — Artifact Checksum Test

Release artifacts have generated checksums.

### 16.T10 — Full Regression Suite

All prior Sprint tests pass against release branch.

## Exit Criteria

- Installable artifacts exist for the target platforms.
- macOS arm64 passes complete manual acceptance.
- Windows and Linux pass smoke acceptance.
- Known limitations are documented.
- Tests 16.T1–16.T10 pass.

---

# 6. Decision Register by Required Timing

## Decisions Needed Before Sprint 3 Completion

### P-01 — Exact icon library

Does not block Sprint 0 or early Sprint 3 scaffolding, but must be decided before foundational components are finalized.

## Decisions Needed Before Sprint 7 Destructive Field Editing

### P-02 — Behavior when deleting a Segment field already used by Episode values

Temporary recommendation: prevent deletion and show usages.

## Decisions Needed Before Sprint 11 Binding Completion

### P-03 — Behavior when deleting a Segment field used by Layout bindings

Temporary recommendation: block deletion until bindings are removed.

## Decisions Needed Before Sprint 15 Polish

### P-04 — Segment card opening behavior

Options:

- Single click opens
- Single click selects, double click opens
- Single click selects with explicit Open action

Current MVP default: single select, double/Enter open.

### P-05 — Keyboard shortcut vocabulary

Only platform-standard shortcuts are currently approved.

### P-06 — Layout snapping details

Basic edge/center snapping is approved. Advanced behavior is open.

### P-07 — Multi-select

Not required for MVP unless approved.

### P-08 — Context menus

Basic overflow menus exist; full right-click vocabulary is open.

## Decisions Needed Before Public Release

### P-09 — Signing credentials and legal distribution identity

### P-10 — Release hosting

### P-11 — Privacy policy if telemetry or crash reporting is added

Telemetry remains absent by default.

---

# 7. Explicitly Deferred Backlog

The agent must not pull these into the MVP Sprints without a new approved specification.

## Broadcasting

- OBS adapter
- Restream integration
- Streaming
- Recording engine
- Stream health
- Encoder configuration
- Audio routing
- Scene/source migration

## Mobile and Remote

- iPhone companion
- iPad editor
- Android companion
- Local remote server
- Host monitor
- Mobile Cue surface

## Cloud and Collaboration

- Accounts
- Sync
- Shared Studios
- Concurrent editing
- Comments
- Permissions
- Cloud media

## Advanced Production

- Multi-action Cues
- Conditional automation
- Timed automatic triggers
- Optional Storyboard branches
- Replay
- Remote guests
- Failure simulation
- Teleprompter
- Multiple host monitors

## Advanced Design and Media

- General Component authoring
- Vector graphics
- Keyframes
- Motion paths
- Linked responsive Layout variants
- FFmpeg transcoding
- Proxy media
- Project consolidation
- Plugin system

---

# 8. Recommended Pull Request Breakdown

Each Sprint may be one or more pull requests. Prefer divisions like:

```text
Sprint 5
PR 5A — Schema and application commands
PR 5B — Catalog and Blueprint UI
PR 5C — Reorder, undo, autosave, and E2E tests
```

A pull request should not combine unrelated future-Sprint work.

Every pull request description should include:

- Sprint and subtask IDs
- Specifications consulted
- Test IDs added
- Screenshots
- Open decisions
- Migrations
- Dependency changes
- Rollback notes where relevant

---

# 9. MVP Completion Definition

The MVP is complete only when a creator can perform this sequence in a packaged macOS arm64 build:

```text
Create Studio
→ Create Show
→ Create reusable Segments
→ Arrange Show Blueprint
→ Define Segment fields and notes
→ Create reusable Layouts
→ Place Components and assign fixed Resources
→ Bind Component properties to Segment data
→ Create Episode from Blueprint
→ Enter Episode content
→ Adjust Episode Storyboard
→ Preview Segment lifecycle
→ Trigger Host Cues
→ Rehearse the Episode
→ Quit and return without losing work
```

The same codebase must build and launch on Windows and Linux.

The MVP is not complete if:

- The renderer has direct Node access.
- Episode changes alter the Blueprint unexpectedly.
- Segments or Layouts can become Episode-only.
- Resource paths are exposed arbitrarily.
- The Layout editor becomes a general design tool.
- Preview and Rehearsal use conflicting execution logic.
- Autosave can silently lose work.
- Required test gates are skipped.
- Open product decisions are silently invented.

---

# 10. Final Instruction to Codex

Implement Showflow as a sequence of validated vertical slices.

Do not maximize the number of screens or abstractions created.

Maximize the amount of the real producer workflow that is coherent, persistent, testable, and understandable at the end of each Sprint.

When a choice is open:

1. Use the documented MVP default if one exists.
2. Isolate the implementation behind a clear boundary.
3. Record the open decision.
4. Do not turn a temporary choice into an accidental permanent product model.
