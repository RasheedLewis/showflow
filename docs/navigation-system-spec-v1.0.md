# Showflow
## Navigation System UI/UX Specification
### Version 1.0 — Consistent Desktop Navigation

**Document status:** Implementation reference

**Primary audience:** Product designers, software engineers, and coding agents

**Date:** August 8, 2026

**Applies after:** Sprint 9
**Scope:** Desktop application navigation for completed MVP destinations and
future destinations introduced by Sprints 10–14

**Controlling documents:**

- Showflow Architecture PRD v1.3
- Showflow MVP UX Specification v1.0
- Showflow Technical Specification v1.0
- Showflow Design System Specification v1.0

---

## 1. Purpose

This specification defines one consistent navigation language for Showflow.
It resolves implementation drift in which navigation controls have appeared:

- Beside the Studio switcher
- As the filled gold action at the far right of the top bar
- Inside page headers, cards, toolbars, forms, and editor footers
- In more than one of those locations for the same destination

The problem is semantic, not only visual. Parent navigation, workspace
commands, peer destinations, object opening, and sequential movement currently
share button treatments even though they serve different purposes.

This specification assigns each navigation role a predictable location,
hierarchy, behavior, and accessibility contract. It is the implementation
reference for a navigation consistency pass before Sprint 10 and for subsequent
MVP navigation work.

---

## 2. Authority and Interpretation

This is a supplemental specification. It refines the global shell and
navigation behavior already required by the MVP UX Specification and Design
System Specification. It does not override the four controlling documents.

When a conflict exists, authority remains:

1. Architecture PRD
2. MVP UX Specification
3. Technical Specification
4. Design System Specification
5. This Navigation System UI/UX Specification
6. Detailed Implementation Plan
7. Existing implementation

The following existing requirements remain controlling:

- The top bar is persistent.
- Studio switching is globally available.
- A context breadcrumb or Back path is visible.
- The current page title and editing scope are visible.
- Each immediate context has no more than one filled Primary action.
- Back navigation preserves spatial and editing context when possible.
- URLs represent durable navigation context.
- Design Show uses the documented MVP default of top-level tabs plus a picker
  drawer until the final Catalog navigation pattern is approved.
- The Show Blueprint or Episode Storyboard remains visually dominant.

This specification does not settle the open question of whether Catalogs will
eventually become tabs, drawers, or separate pages. It makes the documented MVP
tabs durable and consistent while keeping Catalog content modular.

---

## 3. Navigation Principles

### 3.1 One Control, One Meaning

A control must not change semantic roles between screens.

- Back and Return controls move to a parent or origin.
- Tabs move among peer sections of one workspace.
- Cards and rows open the object they represent.
- Previous and Next move through an ordered collection.
- A Primary action performs the main command for the current context.

### 3.2 Navigation Is Not a Primary Command

Gold is reserved for the primary command, current state, selection, focus, and
key progress. A control is not eligible for Primary styling merely because it is
important or located at the far right of the top bar.

The following labels must not use filled Primary styling:

- Back
- Return
- Open
- View
- Previous
- Next
- Go to

Creating, adding, previewing, and beginning rehearsal are examples of commands
that may be Primary when they are the main action for the current context.

### 3.3 One Primary Action Per Immediate Context

The same command must not appear as filled Primary in both the top bar and page
content. When a Primary action is available, its normal location is the far
right of the persistent top bar.

Exceptions are limited to:

- A modal or drawer with its own contained decision context
- A destructive confirmation dialog
- A startup or blocking error state in which the normal shell action is not
  usable

Empty states do not relocate or duplicate a shell-level Primary action. They
may explain the action and point toward its location using copy, or provide a
neutral supporting control when necessary.

### 3.4 Parent Navigation Is Stable

Navigation to the parent or opening origin always appears in the top bar's
context area. It must not move into page content or into the Primary action area
when the destination changes.

### 3.5 Scope and Location Are Distinct

Location answers “Where am I?” Scope answers “What will this change affect?”
Both remain visible, but they must not be combined into one ambiguous label.

### 3.6 Storyboard and Canvas Remain Dominant

Navigation chrome must remain compact. Showflow must not introduce a generic
administration sidebar or persistent destination tree that reduces the space
available to the Storyboard or audience canvas.

### 3.7 Preserve Origin, Not Browser History

Back navigation returns to the logical parent or recorded opening origin. It
must not rely exclusively on the browser history stack, which may contain
startup redirects, restored routes, dialogs, or unrelated Studio changes.

---

## 4. Navigation Taxonomy

| Navigation class | Purpose | Required location | Visual treatment |
| --- | --- | --- | --- |
| Studio switcher | Change the active Studio | Top-bar identity area | Compact neutral menu trigger |
| Parent path | Return to logical parent or opening origin | Top-bar context area | Back icon plus short text, Ghost |
| Workspace tabs | Move among peer sections | Directly below workspace header or scope line | Route-backed tabs |
| Object navigation | Open a Show, Episode, Segment, Layout, or Resource | Object card, row, or explicit Open action | Neutral card/Secondary/Ghost |
| Sequential navigation | Move through ordered Segment instances | Editor footer or compact sequence bar | Previous/Next Secondary or Ghost |
| Contextual cross-link | Inspect a related object in another scope | Relevant panel or inspector | Labeled Ghost or text action |
| Primary command | Perform the main action for the current context | Top-bar action area | One filled Primary button |
| Supporting command | Modify the local object or open a tool | Local toolbar or panel | Secondary or Ghost |

Implementation routing does not determine visual semantics. For example,
Rehearse may open another route, but it represents a mode transition and may be
the Primary command. “Return to Storyboard” is always parent navigation even
though it also changes the route.

---

## 5. Persistent Shell Anatomy

### 5.1 Standard Desktop Arrangement

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Showflow  [Studio ▾]  │  [← Parent]  Page title     Saved  ↶  ↷  [Command]  ••• │
├──────────────────────────────────────────────────────────────────────────────┤
│ Scope: Changes become the default for future Episodes.                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ Workspace                                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

The vertical divider is required when both the Studio switcher and context path
are present. It prevents Studio switching and parent navigation from reading as
one undifferentiated button group.

### 5.2 Shell Regions

The top bar contains three semantic regions.

#### Identity region

- Showflow wordmark
- Studio switcher
- Divider from navigation context

#### Context region

- Optional parent path
- Current page title
- No unrelated commands

#### Action region

- Save state when relevant
- Undo and redo when relevant
- Support-panel toggles when relevant
- One optional Primary command
- More menu when relevant

### 5.3 Parent Path

The parent path uses a standard Back control with:

- A left arrow icon
- A short destination label
- Ghost styling
- A minimum 44 px hit target
- An accessible name that includes the destination

Preferred labels name the destination rather than narrating the interaction:

| Avoid | Use |
| --- | --- |
| Back to Shows | Shows |
| Back to Show Detail | Show overview |
| Return to Blueprint | Blueprint |
| Return to Storyboard | Storyboard |
| Go back | The actual parent destination |

The accessible name may include “Back to,” such as `Back to Storyboard`, even
when the visible label is `Storyboard`.

Only one parent path is shown. Deep breadcrumb trails are not required in the
MVP because they consume workspace width and may obscure the recorded origin.

### 5.4 Page Title

The title identifies the current destination or edited object, not its parent.

Examples:

- Shows
- Top 10 Music Videos
- Design Show
- Opening
- Week 32
- New Episode

Do not repeat the same title immediately inside page content unless the content
heading introduces a distinct section or object.

### 5.5 Scope Line

Show, Show Segment, Episode, and Episode Segment editing use the existing quiet
scope line below the top bar. The wording remains governed by the MVP UX
Specification.

The scope line must not contain Back, tab, or Primary controls.

### 5.6 Primary Command

The top-bar Primary command:

- Uses a verb-first label
- Includes visible text
- Remains in a stable far-right location
- Changes only when the current route or active workspace tab changes the main
  task
- Is omitted when no implemented command deserves Primary emphasis

Do not fill the area with a navigation control merely to keep the layout
visually balanced.

### 5.7 Loading and Error States

The shell structure and parent path should remain stable while content loads.
Controls that cannot operate safely may be disabled.

For a missing or inaccessible object:

- Keep any verified parent destination available in the top bar.
- Present the production-language error in content.
- Do not add a second filled return action in the error panel.
- A content-level neutral recovery action is allowed only when the normal parent
  path cannot be rendered or the recovery target differs from it.

---

## 6. Workspace Navigation

### 6.1 Route-Backed Tabs

Tabs representing durable Design Show sections must map to routes:

```text
/#/studio/:studioId/show/:showId/design/blueprint
/#/studio/:studioId/show/:showId/design/segments
/#/studio/:studioId/show/:showId/design/layouts
```

The existing shorter Design Show route should redirect to `design/blueprint`
for compatibility.

Requirements:

- Reload preserves the active tab.
- Startup restoration preserves a valid active tab.
- Browser-level deep links open the requested section.
- Switching tabs preserves meaningful selection where specified.
- The active tab is exposed through semantic tab state and is not communicated
  by color alone.
- Layouts may remain a clearly labeled placeholder until Sprint 10.

The tab routes formalize the documented MVP default. They do not make tabs the
permanent post-MVP Catalog decision.

### 6.2 Tabs Versus Parent Navigation

Tabs move laterally within one workspace. The parent path moves upward or back
to the opening origin. A tab must never be labeled Back or Return.

### 6.3 Object Navigation

Cards and rows are the normal entry point for production objects.

- Show card → Show Detail
- Episode card → Produce Episode
- Segment card or Storyboard placement → Segment editor
- Layout card → Layout editor
- Validation item → relevant editor location

Object cards must provide semantic keyboard operation. When single selection
and opening are distinct, preserve the documented MVP interaction: single click
selects, double click or Enter opens, and an explicit Open action is available.

### 6.4 Supporting Tools

Catalog drawers, Resource pickers, inspectors, and validation panels are tools,
not top-level destinations. Their open/close controls remain neutral icon or
labeled controls in the shell or local workspace toolbar.

Opening or closing transient panels does not normally change the URL.

---

## 7. Sequential Editor Navigation

Episode Segment editors require Previous and Next navigation following Episode
Storyboard order.

The controls appear together in a stable footer or sequence bar:

```text
[Previous Segment]                  Segment 3 of 8                  [Next Segment]
```

Requirements:

- Previous is disabled at the first Segment.
- Next is disabled at the last Segment.
- Disabled state is semantic and visible without relying only on color.
- Pending autosave is flushed before route transition.
- Focus moves to the new editor's primary heading or restored field target.
- The parent path in the top bar provides the single Return to Storyboard
  control.
- Previous and Next never use filled Primary styling.

Show Segment editors do not require Previous and Next unless an approved later
workflow introduces ordered Catalog traversal.

---

## 8. Screen Contract

### 8.1 Current Destinations

| Destination | Parent path | Page title | Primary command | Content navigation |
| --- | --- | --- | --- | --- |
| Startup | None | Opening Showflow | None | Retry only on failure |
| Create Studio, first run | None | Create Studio | Create Studio | None |
| Create Studio, from switcher | Current Studio | Create Studio | Create Studio | None |
| Studio Home | None | Shows | New Show | Show cards |
| Create Show | Shows | New Show | Create Show | None |
| Show Detail | Shows | Show name | Create New Episode | Design Show entry and Episode cards |
| New Episode | Show overview | New Episode | Create Episode or Create Blank Episode | Design Show alternative when Blueprint is empty |
| Design Show — Blueprint | Show overview | Design Show | Add Segment | Routed tabs and Storyboard cards |
| Design Show — Segments | Show overview | Design Show | New Segment | Routed tabs and Segment cards |
| Design Show — Layouts placeholder | Show overview | Design Show | None until Sprint 10 | Routed tabs |
| Show Segment editor | Recorded Design Show origin | Segment name | None until Preview Segment exists | Lifecycle step control |
| Produce Episode | Show overview | Episode title | None until Rehearse exists | Episode Storyboard cards; Add Segment as supporting tool |
| Episode Segment editor | Storyboard | Segment name | None until Preview or Rehearse is available | Previous and Next; contextual View Show Segment |

### 8.2 Sprint 10 and Later Destinations

| Destination | Parent path | Primary command | Notes |
| --- | --- | --- | --- |
| Layout Catalog | Show overview through Design Show shell | New Layout | Remains the Layouts peer tab for the MVP |
| Layout editor from Catalog | Layout Catalog | Preview Layout when available | Return to recorded Catalog position |
| Layout editor from Segment | Recorded Segment origin | Preview Layout when available | Do not force a detour through Layout Catalog |
| Show Segment editor with preview | Recorded Design Show origin | Preview Segment | Preview is a command, not peer navigation |
| Produce Episode with rehearsal | Show overview | Rehearse | Add Segment remains a supporting Storyboard command |
| Rehearsal | Episode Storyboard | Start or Resume Rehearsal as context requires | Production controls follow their own safety hierarchy |

### 8.3 Dynamic Primary Commands

When Design Show tabs change, the top-bar command changes with the active route:

```text
Blueprint → Add Segment
Segments  → New Segment
Layouts   → New Layout
```

A disabled future command must not be shown merely as a roadmap marker. Before
its Sprint is implemented, omit it and explain unavailable capability only in
the relevant placeholder content.

---

## 9. Origin-Aware Return Behavior

### 9.1 Recorded Origin

Focused editors must receive or derive a safe return origin containing only
application-owned route context, such as:

- Route identifier
- Active workspace section
- Storyboard placement or Catalog item identifier
- Optional scroll or selection restoration key

The origin must remain serializable and must not contain arbitrary URLs or file
paths.

### 9.2 Fallback Order

If the recorded origin is absent or invalid, use this fallback order:

1. The logical parent within the same Show or Episode
2. Show Detail
3. Studio Home

Cross-Studio or missing-object origins must be rejected rather than followed.

### 9.3 Restoration

Returning from an editor should restore when practical:

- Active tab
- Selected Storyboard placement or Catalog card
- Scroll position
- Keyboard focus

The full storyboard-card expansion motion remains recommended rather than
required, but the hierarchy and return target are required.

---

## 10. Creation and Decision Flows

### 10.1 Creation Pages

Full-page creation flows use:

- Parent path in the top bar
- Form title as the page title
- One submit action in the top-bar Primary position
- Inline validation beside the relevant fields

The top-bar button may submit a form by stable form identifier.

After successful creation, navigate automatically to the specified destination.
Only show an `Open…` recovery action when creation succeeded but navigation
failed.

### 10.2 Empty Blueprint Episode Choice

When the Blueprint is empty, New Episode presents two legitimate workflow
choices:

- Design Show — neutral supporting navigation
- Create Blank Episode — Primary command

The Primary command may remain in the top bar while the supporting choice and
explanation remain in content. The page must make clear that blank creation is
intentional.

### 10.3 Dialogs and Drawers

Dialogs and drawers have their own immediate action context. Their Primary
button does not count as a second page-level Primary action while the overlay is
open because the underlying page is inert.

On close, focus returns to the control that opened the overlay.

---

## 11. Responsive Behavior

The MVP remains desktop-first, with a minimum comfortable width of 1280 px.

At narrower desktop widths:

1. Preserve the Studio switcher, page title, and Primary command.
2. Collapse supporting Catalog and inspector panels into drawers.
3. Keep the parent path available. It may reduce to an icon with an accessible
   label only when the visible destination label cannot fit.
4. Collapse Save state to its concise healthy state.
5. Move low-priority actions into the More menu before hiding navigation.
6. Allow workspace tabs to scroll horizontally without converting them into
   unrelated menus.

The parent path must not disappear at the same breakpoint where the current
implementation hides breadcrumb content.

---

## 12. Accessibility

### 12.1 Landmarks and Semantics

- The shell uses one application header and one main workspace landmark.
- The parent path is a semantic link when it only navigates.
- Buttons are used for commands and state changes.
- Tabs use the tab, tablist, and tabpanel semantics already provided by the
  shared Tabs primitive.
- Previous and Next are contained in a labeled navigation landmark.
- The current route is identified with `aria-current` where applicable.

### 12.2 Focus

- All targets meet the 44 px minimum hit area.
- Every interactive control has a visible focus state.
- Route changes place focus on the destination heading unless a more specific
  restoration target exists.
- Returning from a focused editor restores focus to the originating card when
  it still exists.
- Opening and closing drawers restores focus to the trigger.

### 12.3 Labels

Visible labels remain short. Accessible names may be more descriptive.

Examples:

| Visible label | Accessible name |
| --- | --- |
| Shows | Back to Shows |
| Storyboard | Back to Episode Storyboard |
| Previous Segment | Previous Segment: Interview |
| Next Segment | Next Segment: Sponsor Read |

### 12.4 Non-Color Communication

Active tabs, disabled controls, current sequence position, scope, and save state
must not depend on color alone.

---

## 13. Motion

Navigation motion explains hierarchy without delaying work.

- Parent navigation reverses the relationship used to enter the destination.
- Tab changes use restrained crossfade or selected-indicator movement.
- Storyboard card expansion may be added later as specified.
- No navigation transition blocks input after the destination is ready.
- Reduced-motion mode replaces spatial transforms with an instant transition or
  short fade.
- Focus restoration and route state must work identically with motion disabled.

---

## 14. Content and Naming Rules

Use canonical production language.

Preferred destination labels:

- Shows
- Show overview
- Design Show
- Blueprint
- Segments
- Layouts
- Storyboard
- Preview Segment
- Rehearse

Avoid:

- Home when the destination can be named precisely
- Dashboard
- Workspace manager
- Scene list
- Source browser
- Generic Back or Return without a destination
- Directional labels such as Continue when the resulting action can be named

Primary commands use concise verbs:

- New Show
- Create Show
- Create New Episode
- Add Segment
- New Segment
- New Layout
- Preview Segment
- Rehearse

---

## 15. Shared Component Contract

The implementation should replace unrestricted navigation slots with semantic
contracts.

### 15.1 Application Shell

The shell should distinguish:

- `studioSwitcher`
- `parentNavigation`
- `title`
- `scope`
- `saveState`
- `historyActions`
- `panelActions`
- `primaryAction`
- `menu`

The shell must not treat arbitrary breadcrumb content and parent actions as the
same untyped slot.

### 15.2 Parent Navigation Component

A shared parent navigation component owns:

- Standard icon and spacing
- Visible and accessible labels
- Disabled or unavailable behavior
- Focus treatment
- Optional origin-restoration metadata

### 15.3 Route Tabs

The shared tab-navigation wrapper owns:

- Route generation
- Active route matching
- Keyboard tab behavior
- `aria-current` or selected state
- Compatibility redirects

Feature components supply labels and destinations but must not reimplement the
navigation mechanics.

### 15.4 Sequence Navigator

A shared sequence navigator owns:

- Previous and Next controls
- Boundary-disabled states
- Position summary
- Accessible destination names
- Pending-navigation state

---

## 16. Prohibited Patterns

Do not:

- Use the Primary action slot for Back, Return, Open, View, Previous, or Next.
- Render the same Primary command in both the shell and page content.
- Place parent navigation inside a page header when the shell is present.
- Use passive breadcrumb text on one route and an interactive button in the same
  slot on another route without semantic distinction.
- Hide all parent navigation at narrower desktop widths.
- Use browser history as the only return mechanism.
- Store durable workspace tab selection only in React component state.
- Add a generic persistent sidebar solely to solve destination inconsistency.
- Expose technical route fragments, IDs, or broadcast-engine terminology in
  labels.
- Show disabled future-Sprint Primary buttons as permanent top-bar clutter.

---

## 17. Implementation Sequence

This sequence is a navigation consistency pass, not Sprint 10 Layout work.

1. Introduce semantic parent-navigation and route-tab contracts in the shared UI
   layer.
2. Update the Application Shell layout, divider, responsive behavior, and
   accessibility tests.
3. Add durable Design Show Blueprint, Segments, and Layouts routes while keeping
   the Layouts placeholder.
4. Migrate Studio, Show, Design Show, and creation destinations.
5. Migrate Show Segment, Produce Episode, and Episode Segment destinations.
6. Add origin restoration for Storyboard and Catalog editor entry points.
7. Update renderer and browser-level tests before beginning Sprint 10.

No domain, persistence, IPC, migration, or dependency changes are required for
the navigation system itself.

---

## 18. Acceptance Criteria

### NAV.T1 — Stable Parent Location

Every non-root destination exposes its logical parent or recorded origin in the
same top-bar context position.

### NAV.T2 — Primary Action Semantics

No Back, Return, Open, View, Previous, or Next control uses filled Primary
styling or occupies the Primary action slot.

### NAV.T3 — Single Primary Instance

Each page has no more than one visible filled Primary action outside an active
modal, drawer, or destructive confirmation context.

### NAV.T4 — Design Show Route Durability

Blueprint, Segments, and Layouts each have a durable URL and survive reload.

### NAV.T5 — Compatibility Redirect

The previous Design Show root route redirects to Blueprint without losing the
selected Studio or Show.

### NAV.T6 — Origin-Aware Return

Opening a Segment from Blueprint, Segment Catalog, or Episode Storyboard returns
to the correct origin with selection and focus restored when possible.

### NAV.T7 — Sequential Navigation

Episode Segment Previous and Next follow Storyboard order, flush autosave, and
expose correct boundary-disabled states.

### NAV.T8 — Responsive Parent Access

At supported narrow desktop widths, parent navigation remains keyboard and
screen-reader accessible even when its visible label is compacted.

### NAV.T9 — Scope Persistence

Show, Show Segment, Episode, and Episode Segment scope copy remains visible and
distinct from location navigation.

### NAV.T10 — Keyboard and Focus

All navigation is keyboard operable, route changes receive useful focus, and
returning restores the originating control when available.

### NAV.T11 — Error Recovery

Loading and error states preserve a verified parent path without introducing a
duplicate filled recovery action.

### NAV.T12 — Production Language

Navigation labels use Showflow terminology and expose no technical route,
Electron, database, or broadcast-engine language.

### NAV.T13 — Regression Gate

All previously required navigation, scope, autosave, undo/redo, renderer, and
browser workflow tests continue to pass after migration.

---

## 19. Completion Checklist

The navigation consistency pass is complete only when:

- Parent navigation has one stable location and shared treatment.
- The Studio switcher and context path are visually separated.
- Page titles describe the current destination consistently.
- Primary commands are singular, stable, and semantically correct.
- Design Show tabs are route-backed.
- Segment return behavior preserves origin.
- Episode Segment Previous and Next remain available without duplicating Return
  to Storyboard.
- Empty, loading, and error states follow the same placement rules.
- Narrow-width navigation remains accessible.
- Automated tests NAV.T1–NAV.T13 pass alongside all earlier Sprint gates.
- No Sprint 10 Layout behavior has been implemented as part of the pass.
