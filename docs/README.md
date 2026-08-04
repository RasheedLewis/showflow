# Showflow documentation

This directory contains the authoritative product and engineering specifications
for Showflow's Producing MVP. Read the documents relevant to a change before
editing code, user-facing behavior, architecture, or visual foundations.

> [!IMPORTANT]
> The current specification boundary ends at designing Shows, producing Episodes,
> previewing Segments, and rehearsing Episodes. Live broadcasting, OBS integration,
> cloud synchronization, collaboration, and mobile applications are deferred.

## Document map

| Document | Authority | Current version | Use it for |
|---|---:|---:|---|
| [Architecture PRD](architecture-prd-v1.3.md) | 1 | 1.3 | Domain ownership, canonical concepts, invariants, and MVP scope |
| [MVP UX Specification](ux-spec-v1.0.md) | 2 | 1.0 | User-facing workflows, navigation, interaction behavior, and accessibility |
| [Technical Specification](technical-spec-v1.0.md) | 3 | 1.0 | Stack, package boundaries, security, persistence, testing, and distribution |
| [Design System Specification](design-system-spec-v1.0.md) | 4 | 1.0 | Visual foundations, components, tokens, motion, and content voice |
| [Detailed Implementation Plan](implementation-plan-v1.0.md) | Operational | 1.0 | Dependency-ordered Sprints, test gates, decision timing, and completion criteria |

The implementation plan sequences the work. It does not override the four
product and engineering specifications.

Accepted implementation choices are recorded in [`decisions/`](decisions/).

## Authority order

When documents overlap or appear to conflict, resolve them in this order:

1. The **Architecture PRD** controls domain ownership, terminology, invariants,
   and scope.
2. The **MVP UX Specification** controls visible behavior and user workflows,
   provided it preserves the architecture.
3. The **Technical Specification** controls implementation decisions and system
   boundaries, provided it preserves the architecture and UX.
4. The **Design System Specification** controls visual and interaction styling,
   provided it preserves the first three specifications.

Existing code is authoritative only where it does not conflict with these
documents. If a conflict cannot be resolved through this order, stop the affected
work and record the exact decision required; do not silently choose a new product
model.

## Canonical terminology

Use these names consistently in code, UI copy, documentation, and tests.

| Term | Meaning |
|---|---|
| **Studio** | Top-level workspace for a creator, brand, or organization |
| **Show** | Recurring production that owns reusable production objects and Episodes |
| **Show Blueprint** | Default Storyboard used to initialize new Episodes |
| **Catalog** | A Show's reusable collection of Show Segments |
| **Show Segment** | Reusable definition of one production segment |
| **Episode** | One specific production instance of a Show |
| **Episode Storyboard** | Ordered Segments for one Episode |
| **Episode Segment** | Editable Segment instance within an Episode |
| **Layout** | Reusable screen composition |
| **Slot** | Named position or region within a Layout |
| **Component** | Reusable visual, media, or input element |
| **Component Placement** | Use of a Component in a Slot within one Layout |
| **Resource** | Image, video, audio, camera, font, text, or structured data source |
| **Host Cue** | Optional manual action available while a Segment is active |
| **Lifecycle** | Fixed `Prepare → Enter → Active → Exit → Cleanup` phases |

**Show Blueprint** or **default Storyboard** is the preferred user-facing name;
**Format** is only an architectural synonym. The canonical v1 term is **Segment**,
not “Moment.” Primary UI and validation copy must not expose OBS-oriented terms
such as “scene,” “source,” “bus,” or “binding resolution.”

## Open specifications

The documents use four status labels:

| Label | Required handling |
|---|---|
| **REQUIRED** | Implement as specified for the MVP |
| **RECOMMENDED** | Preserve the intent; small implementation adjustments are acceptable |
| **OPEN SPECIFICATION** or **DECISION REQUIRED** | Do not finalize permanent behavior without an approved decision |
| **DEFERRED** | Do not implement within the current MVP |

When work reaches an open area:

1. Use the documented MVP default when one exists.
2. Otherwise isolate a neutral placeholder, hide the feature, present a clearly
   disabled control, or implement only the explicitly specified minimum.
3. Record the unresolved question and the specification section that raised it.
4. Keep the decision behind a replaceable boundary where practical.
5. Continue unrelated work, but do not turn a temporary choice into an accidental
   permanent product model.

> [!WARNING]
> Implementation convenience is not a reason to redefine domain ownership,
> create Episode-only Segments or Layouts, expose raw Electron APIs, or introduce
> deferred broadcasting concepts.

## Updating documents and versions

Specifications are versioned records. Update them deliberately:

1. Identify the controlling document using the authority order above.
2. Edit the smallest set of documents needed to keep the specification coherent.
3. Increment the document version when behavior, ownership, architecture, or an
   accepted decision changes materially. Typographical fixes do not require a
   version bump.
4. Rename the file when its version changes, using the existing canonical pattern:
   `architecture-prd-v<major>.<minor>.md` or `<topic>-spec-v<major>.<minor>.md`.
5. Update the title block, document status, companion-document references, this
   index, the root README, and any implementation-plan references in the same
   change.
6. Search the repository for the previous filename and version before merging.
7. Describe the reason for the revision and any migration or compatibility impact
   in the pull request or an Architecture Decision Record.

Do not overwrite historical meaning silently. When a revision materially changes
an implemented contract, preserve migration guidance and update affected tests.

## Reading workflow

Before starting a Sprint:

- Read all four specifications, the current Sprint, and its dependencies.
- Inspect the existing implementation and open decision register.
- Establish a clean test baseline when a test suite exists.
- Track the Sprint's required subtasks and test gates.

Before implementing a feature:

```text
Architecture rule
  → user-facing behavior
    → technical boundary
      → design-system treatment
        → Sprint task and tests
```

At completion, update documentation whenever implemented behavior or an approved
decision changes what these documents promise.
