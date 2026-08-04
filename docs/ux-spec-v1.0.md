# Showflow
## MVP UX Specification
### Version 1.0 — Design Show and Produce Episode

**Document status:** First implementation-oriented pass  
**Primary audience:** Codex coding agents, software engineers, product designers  
**Companion document:** Showflow Architecture PRD v1.3  
**Scope:** Desktop-first UX for designing a recurring Show and producing an Episode. Broadcasting execution is not included.

---

## 1. Purpose

This document defines the MVP user experience for Showflow's two central workspaces:

1. **Design Show**
2. **Produce Episode**

The Architecture PRD defines the domain model and ownership rules. This UX Specification defines how users encounter, understand, create, edit, and navigate those objects.

Showflow should feel familiar to a producer or creator before it feels familiar to a broadcast engineer.

The product should make this workflow natural:

```text
Design the reusable Show
→ Create an Episode
→ Replace this week's content
→ Adjust the Storyboard
→ Preview or rehearse
→ Host the Show
```

The MVP must demonstrate that recurring live productions can be prepared through a Storyboard-first workflow without requiring users to think in scenes, sources, or technical broadcast configuration.

---

## 2. Specification Status Legend

This document uses the following labels.

### REQUIRED

The behavior is specified for MVP and should be implemented as written.

### RECOMMENDED

The behavior is a strong first-pass direction. Small implementation changes are acceptable if they preserve the intent.

### OPEN SPECIFICATION

The product decision is not complete enough for a coding agent to finalize.

For an **OPEN SPECIFICATION** item, the implementation must do one of the following:

- Use a clearly isolated placeholder.
- Hide the feature.
- Present a disabled control labeled appropriately.
- Implement only the explicitly specified minimal behavior.
- Add a tracked issue referencing the open specification.

The agent must not silently invent a permanent interaction model.

### DEFERRED

The feature is intentionally outside the current MVP.

---

## 3. UX Goals

The MVP should allow a creator to:

1. Enter a Studio and understand what Shows exist.
2. Open a Show and immediately know how to create an Episode.
3. Design a reusable default Storyboard.
4. Build a Catalog of reusable Segments.
5. Build reusable Layouts without using a general-purpose design tool.
6. Create a new Episode from the Show Blueprint.
7. Change the Episode's order and content without changing the Blueprint.
8. Open any Segment and edit it in a familiar canvas-based workspace.
9. Understand whether they are editing reusable Show behavior or one Episode.
10. Preview and rehearse production behavior without broadcasting.
11. Encounter production language rather than technical broadcast jargon.

---

## 4. UX Principles Applied

### 4.1 Storyboard First

The primary visual object in Design Show is the **Show Blueprint**.

The primary visual object in Produce Episode is the **Episode Storyboard**.

### 4.2 Reuse Over One-Offs

Segments, Layouts, and Components are reusable Show objects.

Users may initiate their creation from an Episode, but Showflow saves them to the Show automatically.

### 4.3 One Hero Per Screen

Supporting panels must not visually compete with the screen's primary object.

### 4.4 Familiarity Over Novelty

Use recognizable patterns:

- Show cards
- Storyboard cards
- Canvas editor
- Inspector
- Notes area
- Catalog drawers
- Preview controls

### 4.5 Scope Must Always Be Visible

The user should never wonder whether a change affects:

- Future Episodes
- The current Episode
- A reusable Layout
- One Component Placement

### 4.6 Production Language

Prefer:

- Add Segment
- Design Layout
- Preview Segment
- Rehearse Episode
- Missing artwork
- Camera unavailable

Avoid:

- Add scene
- Add source
- Resolve binding
- Bus error
- Node target

---

## 5. Information Architecture

```text
Application
└── Studio
    ├── Studio Home
    └── Show
        ├── Show Detail
        ├── Design Show
        │   ├── Show Blueprint
        │   ├── Segment Catalog
        │   ├── Show Segment Editor
        │   ├── Layout Catalog
        │   └── Layout Editor
        └── Episode
            ├── Produce Episode
            │   ├── Episode Storyboard
            │   ├── Segment Catalog
            │   └── Episode Segment Editor
            └── Rehearsal
```

Components and Resources are exposed contextually within Segment and Layout editing. They do not need equal prominence in the main application navigation.

---

## 6. Global Application Shell

### 6.1 Required Structure

The desktop application shell contains:

- A persistent top bar
- A Studio switcher
- A context breadcrumb or back path
- The current page title
- Autosave status
- Undo and redo controls when relevant
- A contextual primary action
- A user/application menu

### 6.2 Top Bar Hierarchy

Recommended arrangement:

```text
[Studio Switcher] [Back/Breadcrumb] [Page Title]
                         [Autosaved] [Undo] [Redo] [Primary Action] [Menu]
```

### 6.3 Autosave Status

Possible states:

- Saving...
- Saved
- Offline
- Save failed

The status should be quiet when healthy and visually prominent only when attention is required.

### 6.4 Back Navigation

Back navigation should preserve the user's spatial and editing context whenever possible.

Examples:

- Segment Editor → returns to the originating Storyboard card
- Layout Editor → returns to the Segment or Catalog context from which it was opened
- Show Detail → returns to Studio Home

### 6.5 Keyboard Navigation

**OPEN SPECIFICATION — Keyboard Shortcut Map**

Undo and redo are required. The complete shortcut vocabulary for Storyboard editing, Segment navigation, Cue testing, and canvas editing has not been specified.

MVP implementation:

- Use platform-standard undo, redo, copy, paste, duplicate, delete, and save shortcuts where applicable.
- Do not define an extensive custom shortcut system yet.

---

## 7. Studio Switching

### 7.1 Required Behavior

Opening Showflow enters the most recently used Studio.

The Studio switcher opens a compact account-style menu containing:

- Current Studio
- Other Studios
- Create Studio
- Studio settings

Switching Studios reloads the workspace within the selected Studio.

### 7.2 Design Intent

The interaction should feel like switching profiles or accounts, not navigating a folder hierarchy.

### 7.3 Empty State

When no Studio exists:

```text
Create your first Studio

A Studio contains your Shows, brand assets, and production resources.

[Create Studio]
```

### 7.4 Studio Creation

Minimum fields:

- Studio name
- Optional logo

**OPEN SPECIFICATION — Brand Kit Setup**

The complete onboarding flow for colors, fonts, logos, safe areas, and reusable brand defaults is not yet specified.

MVP implementation:

- Allow creation with a name.
- Make logo optional.
- Defer full Brand Kit configuration to a later settings surface.

---

## 8. Studio Home

### 8.1 Hero Object

The hero object is the collection of **Shows**.

### 8.2 Required Content

- Studio name
- New Show button
- Search Shows
- Show card grid
- Optional recent sorting control

Do not display expanded Episode lists on Studio Home.

### 8.3 Show Card

A Show card displays:

- Show thumbnail or key art
- Show title
- Optional short description
- Number of Episodes
- Date last edited
- Optional next planned Episode

Primary interaction:

- Select the card to open Show Detail.

Secondary menu:

- Rename
- Duplicate
- Archive
- Delete

Deletion must require confirmation.

### 8.4 Empty State

```text
Create your first Show

Design a reusable production once, then create new Episodes from it.

[New Show]
```

### 8.5 New Show Flow

Minimum required fields:

- Show name

Optional:

- Description
- Thumbnail

After creation, enter the new Show's Design Show workspace or a setup state within Show Detail.

**OPEN SPECIFICATION — Starter Show Templates**

Starter templates such as Talk Show, Interview, Countdown, and Video Commentary have not been designed.

MVP implementation:

- Offer a blank Show only.
- Keep template infrastructure out of the first implementation unless it can be isolated cleanly.

---

## 9. Show Detail

### 9.1 Purpose

Show Detail is the launch surface for recurring work.

### 9.2 Information Hierarchy

The page must prioritize:

1. **Create New Episode**
2. **Design Show**
3. **Recent Episodes**

### 9.3 Recommended Layout

```text
Show header
[Create New Episode]

[Design Show card or section]

Recent Episodes
Episode card
Episode card
Episode card
[View All]
```

### 9.4 Show Header

Displays:

- Show thumbnail
- Show name
- Description
- Show settings menu

### 9.5 Create New Episode

This is the largest and most visually prominent action.

Selecting it opens a small creation flow.

Minimum fields:

- Episode title
- Optional episode number
- Optional planned date

Action:

- Create Episode from the current Show Blueprint.
- Enter Produce Episode.

If the Show Blueprint is empty, the flow must explain that an Episode can still be created but will begin with an empty Storyboard.

Recommended prompt:

```text
This Show does not have a Blueprint yet.

You can design the Show first or create a blank Episode.

[Design Show] [Create Blank Episode]
```

### 9.6 Design Show Entry

The Design Show entry should communicate:

> Build the reusable Storyboard, Segments, and Layouts used by future Episodes.

It displays:

- Blueprint thumbnail or mini Storyboard
- Segment count
- Layout count
- Last edited date

### 9.7 Recent Episode Card

Displays:

- Episode title
- Episode number, if present
- Planned or created date
- Readiness state
- Last edited
- Storyboard thumbnail strip

### 9.8 Episode Status

**OPEN SPECIFICATION — Episode Status Model**

A detailed lifecycle such as Draft, Ready, Rehearsed, Scheduled, Live, Complete, and Archived has not been finalized.

MVP implementation:

- Support `Draft` and `Ready` only.
- Compute or manually set Ready based on validation.
- Do not model live or completed broadcast states yet.

---

# PART I — DESIGN SHOW

## 10. Design Show Workspace

### 10.1 Purpose

Design Show defines the reusable production system for future Episodes.

### 10.2 Hero Object

The **Show Blueprint** is the hero.

The Segment Catalog and Layout Catalog support it.

### 10.3 Persistent Scope Header

The page must always display:

```text
Design Show
Changes become the default for future Episodes.
```

This wording or an equivalent scope indicator must remain visible while editing the Blueprint.

### 10.4 Recommended Desktop Layout

```text
Top bar

Optional compact left rail | Main Blueprint workspace | Contextual right panel
```

The main Blueprint should receive most horizontal space.

The Catalog should open as:

- A left drawer
- A side panel
- Or a modal picker

It should not permanently shrink the Blueprint excessively.

### 10.5 Primary Actions

- Add Segment
- Preview Blueprint

Secondary actions:

- Open Segment Catalog
- Open Layout Catalog
- Show validation
- More menu

### 10.6 Design Show Sections

The first MVP may use tabs:

- Blueprint
- Segments
- Layouts

Recommended default:

- Enter on Blueprint.
- Open Segments and Layouts in secondary Catalog views.
- Preserve current selection when switching.

**OPEN SPECIFICATION — Final Catalog Navigation Pattern**

We have not finalized whether Catalogs are persistent tabs, drawers, or separate pages.

MVP recommendation:

- Use three top-level tabs within Design Show: `Blueprint`, `Segments`, `Layouts`.
- Allow Add Segment to open a picker drawer over the Blueprint.
- Keep the underlying architecture independent of this choice.

---

## 11. Show Blueprint Storyboard

### 11.1 Required Representation

The Blueprint is displayed as a visual Storyboard grid.

Recommended grid:

- Three columns on wide desktop
- Two columns on narrower desktop
- One column only when the window cannot support two

Cards are scanned left to right, then top to bottom.

### 11.2 Storyboard Toolbar

Required:

- Add Segment
- Search or filter, when Catalog is open
- Preview Blueprint
- Validation indicator

Recommended:

- Zoom control: Large, Medium, Compact

**OPEN SPECIFICATION — Storyboard Zoom**

Card dimensions and the exact information visible at each zoom level have not been specified.

MVP implementation:

- Use one well-designed medium card size.
- Do not add zoom controls until card behavior is stable.

### 11.3 Blueprint Segment Card

Displays:

- Thumbnail
- Segment name
- Optional placement label
- Expected duration
- Reuse indicator if the same Show Segment appears multiple times
- Validation state

Hover or selected state reveals:

- Open
- Duplicate placement
- Remove from Blueprint
- More menu

### 11.4 Card Thumbnail

The thumbnail should be:

1. A rendered preview of the Segment's Active default Layout when available.
2. Otherwise, the Show Segment's representative thumbnail.
3. Otherwise, a neutral placeholder based on Segment type/name.

### 11.5 Card Selection and Opening

Recommended:

- Single click selects.
- Double click or Enter opens the Segment editor.
- A visible Open action also opens it.

Earlier discussion favored single-click expansion, but selection is useful for reorder, multiselect, and keyboard behavior.

**OPEN SPECIFICATION — Single Click Versus Double Click**

The final opening interaction has not been locked.

MVP implementation:

- Single click selects.
- Double click opens.
- Include an explicit Open button or Enter-key behavior.
- Keep card expansion animation compatible with a future single-click model.

### 11.6 Reordering

Required:

- Drag and drop cards.
- Show insertion position.
- Preserve scrolling.
- Undo the reorder.

Keyboard reordering is recommended but not required in the first build.

### 11.7 Duplicating a Placement

Duplicate creates another Blueprint placement referencing the same Show Segment.

It does not duplicate the reusable Show Segment definition.

The duplicated placement should appear immediately after the original.

### 11.8 Removing a Placement

Remove affects only the Blueprint placement.

It does not delete or archive the Show Segment from the Catalog.

### 11.9 Empty Blueprint

```text
Design your Show's default Storyboard

Add reusable Segments in the order they usually occur. Every new Episode will begin here.

[Add First Segment]
```

Supporting link:

- Browse Segment Catalog

### 11.10 Blueprint Save Behavior

All changes autosave.

A new Episode uses the latest saved Blueprint.

Existing Episodes are not automatically updated.

---

## 12. Add Segment Flow

### 12.1 Entry Points

- Blueprint toolbar
- Between-card insertion control
- Episode Storyboard toolbar
- Episode between-card insertion control

### 12.2 Segment Picker

The picker displays the Segment Catalog.

Required:

- Search
- Segment cards or rows
- Preview thumbnail
- Segment name
- Short description
- Add action
- Create New Segment

### 12.3 Adding Existing Segment

Selecting a Segment:

- Inserts it at the chosen position.
- Closes the picker or permits adding more, based on entry context.
- Selects or highlights the new placement.

Recommended behavior:

- Default to closing after one insertion.
- Provide `Add another` if needed.

### 12.4 Creating New Segment

The new Segment is created at Show scope.

Minimum initial fields:

- Segment name
- Optional description

After creation:

- Add it to the current Blueprint or Episode.
- Open the Show Segment editor.
- Preserve the origin so Back returns to the correct Storyboard.

### 12.5 Segment Naming

Names should describe reusable production roles:

- Opening
- Interview
- Video Playback
- Sponsor Read

The UI may advise against Episode-specific names such as:

- Interview with Jane
- Week 12 Opening

Episode-specific labels belong on the placement or Episode Segment data.

---

## 13. Segment Catalog

### 13.1 Purpose

The Catalog is the Show's reusable vocabulary of Segments.

### 13.2 Catalog View

Displays:

- Search
- Filter or category control
- New Segment
- Segment card grid or list
- Usage count
- Archive state

### 13.3 Segment Catalog Card

Displays:

- Thumbnail
- Segment name
- Description
- Used in Blueprint: yes/no or count
- Used in Episodes: count
- Last edited

Actions:

- Open
- Add to Blueprint
- Duplicate Segment
- Archive
- Delete

### 13.4 Delete Versus Archive

If a Segment is referenced anywhere:

- Prefer Archive.
- Prevent destructive deletion until references are removed or explicitly handled.

If unreferenced:

- Delete may be allowed with confirmation.

### 13.5 Organization

**OPEN SPECIFICATION — Catalog Organization**

Tags, categories, folders, favorites, and custom sorting are not fully specified.

MVP implementation:

- Search by name.
- Sort by recently edited and alphabetical.
- Support a single optional category string or tag list only if simple.
- Do not build nested folders.

---

## 14. Show Segment Editor

### 14.1 Purpose

The Show Segment editor defines reusable production behavior.

### 14.2 Persistent Scope Indicator

Always display:

```text
Show Segment
Changes affect future uses of this Segment.
```

Because existing Episodes do not automatically synchronize, avoid wording that implies every existing Episode will update immediately.

Recommended detailed helper:

> Changes apply when this Segment is added in the future. Existing Episode instances keep their current configuration unless updated manually.

### 14.3 Recommended Layout

```text
Top bar with Segment name and scope

Left panel          Main canvas             Right inspector
- Lifecycle         Audience preview        Context settings
- Layouts
- Host Cues

Notes template at bottom
```

The central canvas remains the visual focus.

### 14.4 Editor Modes

Recommended contextual modes:

- Active
- Enter
- Exit
- Prepare
- Cleanup

Active should be selected by default.

### 14.5 Lifecycle Navigation

Display the fixed lifecycle as a compact step control:

```text
Prepare | Enter | Active | Exit | Cleanup
```

The phases cannot be added, removed, renamed, or reordered.

### 14.6 Active Editor

Required controls:

- Default Layout
- Available Layouts
- Host Cues
- Expected duration
- Notes template

### 14.7 Enter and Exit Editor

Required:

- Ordered list of high-level actions
- Add action
- Reorder actions
- Remove action
- Preview phase

The UI should phrase actions as production instructions:

- Show Winner Title
- Then switch to Host + Video
- Wait for the animation to finish

Do not expose low-level command identifiers.

### 14.8 Prepare and Cleanup Editor

**OPEN SPECIFICATION — Advanced Lifecycle Editing**

The exact user-facing controls for preload, resource release, and technical readiness are not fully specified.

MVP implementation:

- Display Prepare and Cleanup phases.
- Automatically infer basic preload and cleanup behavior where possible.
- Provide a read-only summary.
- Do not expose a large manual technical action builder.
- Permit only a very small set of explicit actions if needed for the end-to-end example.

### 14.9 Segment Data Fields

The user can define Episode-specific fields required by the Segment.

Each field needs:

- Label
- Internal key generated from label
- Type
- Required toggle
- Default value
- Help text

MVP field types:

- Short text
- Long text
- Number
- Image Resource
- Video Resource
- Audio Resource
- Boolean

**OPEN SPECIFICATION — Structured Data Field UX**

Objects, lists, repeaters, guest records, polls, rankings, and external data sources are not specified.

MVP implementation:

- Support only the simple field types above.
- Do not build arbitrary schema editing.

### 14.10 Notes Template

A reusable notes template appears below the canvas.

It may include:

- Speaking prompts
- Checklist items
- Reminders

**OPEN SPECIFICATION — Rich Notes**

Formatting, checklists, teleprompter behavior, cue markers, and collaborative comments are not specified.

MVP implementation:

- Use plain text or minimal rich text.
- Preserve line breaks.
- Do not build a document editor.

### 14.11 Segment Editor Empty State

For a new Segment:

```text
Choose what the audience should see while this Segment is active.

[Select a Layout] [Create a Layout]
```

Then guide the user to:

1. Choose Default Layout.
2. Add expected Episode fields.
3. Add notes.
4. Optionally configure Enter, Exit, and Host Cues.

---

## 15. Layout Catalog

### 15.1 Purpose

The Layout Catalog contains reusable Show compositions.

### 15.2 Catalog View

Displays:

- Search
- New Layout
- Layout previews
- Layout name
- Aspect ratio
- Usage count
- Last edited

Actions:

- Open
- Duplicate
- Rename
- Archive
- Delete

### 15.3 New Layout

Recommended initial choices:

- Blank
- Host
- Host + Video
- Fullscreen Video
- Split Screen
- Title Card

**OPEN SPECIFICATION — Layout Preset Library**

The complete preset catalog and exact Slot configurations have not been designed.

MVP implementation:

- Include only `Blank`, `Host`, `Host + Video`, and `Fullscreen Video`.
- Keep presets as data rather than hardcoded UX branches where practical.

### 15.4 Layout Creation From Episode

When initiated from an Episode:

1. Create the Layout in the Show Layout Catalog.
2. Open the Layout editor.
3. On completion, return to the Episode Segment.
4. Assign the Layout where the action originated.

No scope dialog should appear.

---

## 16. Layout Editor

### 16.1 Purpose

The Layout editor composes reusable Components into named Slots.

It is deliberately constrained.

### 16.2 Recommended Layout

```text
Top bar

Left panel       Canvas                 Right inspector
Components       Audience composition   Selected Slot/Placement
Resources
```

### 16.3 Canvas

Required:

- Fixed audience frame
- Aspect ratio label
- Safe-area overlay toggle
- Slot boundaries in edit mode
- Layer selection
- Zoom to fit

### 16.4 Add Slot

A Slot may be added from:

- Preset
- Rectangle tool

Minimum editable properties:

- Name
- Semantic role
- Position
- Size
- Layer order
- Clip content
- Allowed Component category

### 16.5 Slot Manipulation

Required:

- Select
- Move
- Resize
- Align to canvas edges and center
- Delete
- Rename

Recommended:

- Snap guides
- Numeric x, y, width, and height in inspector

### 16.6 Component Placement

The user may:

- Drag a Component into a compatible Slot.
- Select an empty Slot and choose a Component.
- Replace the Component in a Slot.
- Remove a Component Placement.

### 16.7 Fixed Resource Assignment

The user can assign reusable Resources once.

Examples:

- Background image
- Show logo
- Host camera
- Frame graphic

### 16.8 Data Binding

A Component property may be set to:

- Fixed value
- Fixed Resource
- Segment field
- Episode metadata
- Show metadata

The UI should use plain language:

```text
Title text
[Use Segment field: Lower Third Title]
```

not:

```text
Binding target: segment.lowerThirdTitle
```

### 16.9 Component Animation

For each Placement:

- Use Component default
- Override enter
- Override exit

Animation controls:

- Preset
- Duration
- Delay
- Easing

### 16.10 Layout Preview

Required:

- Preview enter
- Preview exit
- Replay
- Fill sample data

### 16.11 Multi-Aspect Layouts

**OPEN SPECIFICATION — Aspect Ratio Strategy**

We have discussed landscape and mobile broadcasts, but have not specified whether one Layout contains responsive variants or whether each aspect ratio uses a separate Layout.

MVP implementation:

- One Layout has one fixed aspect ratio.
- Default to 16:9.
- Allow a Layout to be created as 9:16.
- Do not implement responsive synchronization between variants.
- Clearly label aspect ratio on Layout cards.

### 16.12 Arbitrary Canvas Design

DEFERRED:

- Vector drawing
- Freeform shapes
- Pen tool
- Masks
- Advanced typography controls
- Keyframes
- Motion paths
- Nested groups
- Responsive constraints

---

## 17. Component Selection and Editing

### 17.1 Built-In Components

MVP Component types:

- Camera
- Video
- Image
- Text
- Background
- Logo
- Lower Third

### 17.2 Component Browser

Displays:

- Component type
- Preview icon
- Short description
- Add or drag action

### 17.3 Reusable Components

Architecture treats Components as reusable Show objects.

**OPEN SPECIFICATION — Custom Component Creation**

We have not fully specified whether MVP users create named custom Component definitions or only configure built-in Component templates through Placements.

MVP recommendation:

- Ship built-in Component templates.
- Permit duplication and naming of a configured Component only if implementation remains simple.
- Do not build a full Component-authoring environment.
- Preserve the architecture's Component entity for future expansion.

### 17.4 Lower Third

The Lower Third template should expose:

- Title
- Subtitle
- Optional image/logo
- Typography preset
- Background style
- Enter preset
- Exit preset

**OPEN SPECIFICATION — Typography and Graphic Styling**

The complete design-token and style-editing system is not yet specified.

MVP implementation:

- Use a restrained set of predefined styles.
- Allow font size, alignment, text color, and background selection only if the Design System provides them.
- Do not create unconstrained graphic design controls.

---

## 18. Resources UX

### 18.1 Resource Browser

Required:

- Import
- Search
- Type filter
- Thumbnail or file icon
- Resource name
- Scope indicator
- Usage count where available

### 18.2 Import

The user may drag files into the Resource Browser or use an Import button.

After import:

- Generate preview where possible.
- Retain original filename.
- Allow rename within Showflow.
- Validate file support.

### 18.3 Resource Scope

Display one of:

- Studio
- Show
- Episode

Default import scope depends on context:

- Layout editor → Show
- Show Segment editor → Show
- Episode Segment content field → Episode
- Brand settings → Studio

### 18.4 Missing Resources

If a local Resource is unavailable:

- Mark its usages.
- Explain which Segment and Component are affected.
- Offer Replace or Locate.

### 18.5 Resource Storage

**OPEN SPECIFICATION — File Management and Storage**

Managed copies versus linked files, project packaging, deduplication, proxies, and cloud storage are not yet specified.

MVP implementation:

- Use the approach chosen in the Technical Architecture.
- Keep the UX language generic: Import, Replace, Locate.
- Do not expose storage implementation details unnecessarily.

### 18.6 Camera and Microphone Inputs

**OPEN SPECIFICATION — Device Configuration**

Device discovery, permission requests, reconnection, fallback inputs, and audio monitoring are not fully specified.

MVP implementation:

- Represent camera inputs as selectable Resources.
- Provide a simple device picker if the technical stack supports it.
- Show unavailable status.
- Do not build advanced routing or monitoring.

---

# PART II — PRODUCE EPISODE

## 19. Produce Episode Workspace

### 19.1 Purpose

Produce Episode prepares one specific broadcast using the reusable Show system.

This is expected to be the application's most frequently used workspace.

### 19.2 Hero Object

The **Episode Storyboard** is the hero.

### 19.3 Persistent Scope Header

Always display:

```text
Produce Episode
Changes apply only to this Episode.
```

### 19.4 Required Header Content

- Episode title
- Show name
- Episode status
- Autosave
- Validation status
- Preview
- Rehearse

### 19.5 Recommended Layout

Use the same Storyboard shell as Design Show.

Differences:

- Episode-specific content and readiness are emphasized.
- Rehearse is a primary action.
- Segment Catalog is available for insertion.
- Layout Catalog is not a primary top-level tab.

---

## 20. Episode Storyboard

### 20.1 Initialization

When created from a non-empty Blueprint:

- Display copied Episode Segment cards in Blueprint order.
- Preserve links to source Show Segments.
- Copy default placement data.

When created blank:

- Display an empty state.

### 20.2 Episode Segment Card

Displays:

- Rendered thumbnail using Episode data
- Segment name
- Episode-specific label or content summary
- Expected duration
- Readiness state
- Validation issue count

Examples of content summary:

```text
Ranking Reveal
#3 — SZA, "Saturn"
```

```text
Interview
Guest: Jane Doe
```

### 20.3 Card States

Required:

- Default
- Hover
- Selected
- Dragging
- Invalid
- Ready

Recommended readiness language:

- Needs content
- Ready
- Has warnings

### 20.4 Structural Editing

Required:

- Reorder
- Duplicate Episode Segment
- Remove
- Insert existing Show Segment
- Create new reusable Show Segment and insert

### 20.5 Duplicate Episode Segment

Duplicating an Episode Segment copies:

- Source Show Segment reference
- Episode-specific data
- Notes
- Local overrides

It remains a separate Episode Segment instance.

### 20.6 Remove Episode Segment

Removal affects only the Episode.

It does not alter the Blueprint or Catalog.

### 20.7 Episode Empty State

```text
Build this Episode's Storyboard

Add Segments from the Show Catalog. New Segments you create will be reusable in future Episodes.

[Add Segment]
```

### 20.8 Progress Summary

Recommended above or beside the Storyboard:

```text
8 of 10 Segments ready
2 need content
Estimated runtime: 42 minutes
```

**OPEN SPECIFICATION — Runtime Calculation**

The relationship between expected duration, media duration, Cue duration, and rehearsal timing is not fully specified.

MVP implementation:

- Sum Segment expected durations.
- Treat it as an estimate.
- Do not attempt automatic timing inference beyond media metadata.

---

## 21. Episode Segment Editor

### 21.1 Purpose

The Episode Segment editor fills in and adjusts one Segment instance for the current Episode.

### 21.2 Persistent Scope Indicator

Display:

```text
Episode Segment
Changes apply only to this Episode.
```

Also display the source Show Segment name and an action:

- View Show Segment

### 21.3 Recommended Layout

Use the shared Segment editor shell:

```text
Top bar
Left content panel | Central audience canvas | Right inspector
Notes at bottom
```

The Episode editor should prioritize content fields over reusable behavior.

### 21.4 Content Panel

Displays fields defined by the Show Segment:

- Text fields
- Resource pickers
- Numbers
- Toggles

Required fields are clearly marked.

### 21.5 Canvas

The canvas renders the current Active default Layout using Episode values.

The user can:

- Select Component Placements.
- See which data field powers each property.
- Preview enter and exit.
- Switch among available Layouts.

### 21.6 Right Inspector

When nothing is selected:

- Segment summary
- Expected duration
- Default Layout
- Available Layouts
- Validation
- Local overrides

When a Placement is selected:

- Resolved values
- Resource
- Data source
- Placement override
- Animation override

### 21.7 Local Overrides

The architecture permits local Episode overrides.

**OPEN SPECIFICATION — Override Model**

We have not fully specified which Show Segment behaviors may be overridden, how inheritance is visualized, or how users reset to Show defaults.

MVP implementation:

- Support only:
  - Expected duration override
  - Notes override
  - Field values
  - Fixed Resource replacement
  - Default Layout override
- Label overrides clearly.
- Provide `Reset to Show default`.
- Do not expose arbitrary lifecycle or Cue-set overrides in the first build.

### 21.8 Notes

Episode notes begin from the Show Segment's notes template.

The user may edit them freely.

Editing Episode notes must not change the reusable template.

### 21.9 Previous and Next Navigation

Required controls:

- Previous Segment
- Next Segment
- Return to Storyboard

Moving Next or Previous autosaves current edits.

### 21.10 Unsaved or Invalid Navigation

Because autosave is required, navigation should not normally prompt to save.

Invalid fields do not block navigation, but the Segment remains marked as needing content.

---

## 22. Spatial Expansion Interaction

### 22.1 Intent

Opening a Segment should feel like zooming into the Storyboard card rather than opening an unrelated document.

### 22.2 Recommended Motion

- Selected card elevates.
- Other cards fade or move back.
- Card expands toward the central editor.
- Returning reverses the motion toward its original position.

### 22.3 Accessibility

The transition must:

- Respect reduced-motion settings.
- Never delay interaction excessively.
- Preserve focus.
- Provide an immediate nonanimated fallback.

### 22.4 Implementation Flexibility

This transition is RECOMMENDED rather than required for the first functional build.

The navigation hierarchy and return location are REQUIRED.

---

## 23. Preview

### 23.1 Entry Points

- Layout Editor
- Show Segment Editor
- Episode Segment Editor
- Blueprint
- Episode Storyboard

### 23.2 Preview Levels

Required for MVP:

- Layout preview
- Segment preview
- Episode sequence preview

### 23.3 Segment Preview

Executes:

- Enter
- Active default state
- Manual test Cues
- Exit

Controls:

- Restart
- Enter
- Trigger Cue
- Exit
- Stop

### 23.4 Blueprint Preview

**OPEN SPECIFICATION — Blueprint Preview Depth**

It is not decided whether Blueprint preview should fully execute lifecycle behavior or simply show a visual sequence.

MVP implementation:

- Provide a visual sequence preview using Segment thumbnails.
- Allow opening an individual Segment preview.
- Full Blueprint runtime preview may be deferred to Rehearsal.

### 23.5 Audience and Host Preview

**OPEN SPECIFICATION — Dual Preview Modes**

Audience view versus Host view, confidence monitors, notes visibility, and control overlays are not fully specified.

MVP implementation:

- Preview the audience output.
- Keep editor controls outside the audience frame.
- Do not implement a separate Host monitor.

---

## 24. Rehearsal

### 24.1 Purpose

Rehearsal allows the creator to practice the Episode without broadcasting.

### 24.2 Required Behavior

The user can:

- Start from Episode beginning
- Start from a selected Segment
- Advance to next Segment
- Return to previous Segment
- Restart current Segment
- Trigger Host Cues
- See notes
- Stop rehearsal

### 24.3 Rehearsal Layout

Recommended:

```text
Large audience preview
Current Segment and next Segment
Notes
Host Cue controls
Previous | Restart | Next
Elapsed and estimated time
```

### 24.4 Rehearsal State

Rehearsal must not modify production definitions.

It may record:

- Actual Segment duration
- Cues triggered
- Validation or playback failures

### 24.5 Rehearsal Report

**OPEN SPECIFICATION — Rehearsal Reporting**

We have not specified timing history, issue logging, notes generated during rehearsal, or readiness promotion.

MVP implementation:

- Show elapsed Episode time.
- Optionally record actual duration per Segment.
- Do not build a detailed report dashboard.

### 24.6 Recovery and Failure Simulation

DEFERRED:

- Device failure simulation
- Missing guest recovery
- Network failure
- Emergency fallback Layout
- Skip media and recover
- Alternate rundown paths

---

## 25. Host Cues UX

### 25.1 Placement

Host Cues are configured inside the Show Segment editor and tested in preview or rehearsal.

They should not dominate the primary Segment editing interface.

### 25.2 Cue List

Each Cue row displays:

- Cue name
- Action summary
- Lifetime
- Completion behavior
- Optional keyboard shortcut

### 25.3 Create Cue Flow

Minimum fields:

- Name
- Action
- Target
- Lifetime
- Completion behavior

### 25.4 MVP Actions

- Activate Layout
- Show or hide Component
- Play sound
- Start, restart, pause, or stop media

### 25.5 Lifetime Controls

- Until dismissed
- Fixed duration
- Until Segment exits

### 25.6 Completion

- Hide or exit target
- Restore prior Layout
- Restore Active default Layout
- Stop media

### 25.7 Multi-Action Cues

**OPEN SPECIFICATION — Multi-Action Cue Builder**

The Architecture PRD permits small ordered multi-action Cues, but the editor behavior and constraints are not fully specified.

MVP implementation:

- Implement single-action Cues first.
- Structure data so multi-action Cues can be added later.
- Do not create a general automation builder.

### 25.8 Cue Palette During Rehearsal

Recommended:

- Large, labeled buttons
- Clear active state
- Remaining lifetime for timed Cues
- Dismiss action when supported

---

## 26. Validation and Readiness

### 26.1 Validation Levels

- Blocking issue
- Warning
- Ready

### 26.2 Storyboard-Level Summary

Display:

- Number of Segments ready
- Number needing content
- Number with warnings

### 26.3 Segment-Level Issues

Selecting an issue navigates to:

- The affected Segment
- The relevant field, Placement, Resource, or Cue

### 26.4 Language

Examples:

```text
The Ranking Reveal Segment needs album artwork.
```

```text
The Host + Video Layout cannot find the Main Host Camera.
```

```text
The Lower Third title is empty.
```

Avoid technical error language.

### 26.5 Ready Status

A Segment is Ready when:

- All required fields have values.
- Required Resources are available.
- Referenced Layouts exist.
- Required Component bindings resolve.
- No blocking validation issue remains.

An Episode is Ready when every required Segment is Ready.

### 26.6 Optional Segments

**OPEN SPECIFICATION — Optional Versus Required Segments**

We have not specified whether an Episode Segment can be marked optional for readiness.

MVP implementation:

- Treat all Storyboard Segments as required.
- The user can remove an unused Segment.

---

## 27. Empty, Loading, Error, and Offline States

### 27.1 Loading

Prefer skeleton cards and stable layout over full-screen spinners.

### 27.2 Empty States

Every Catalog and Storyboard must explain:

- What belongs here
- Why it is useful
- The next action

### 27.3 Recoverable Errors

Show errors near the affected object and in a global issue summary.

### 27.4 Offline

**OPEN SPECIFICATION — Offline and Sync Behavior**

The technical architecture for local-first storage and future cloud synchronization is not specified.

MVP implementation:

- If local-only, do not show cloud sync language.
- If cloud-backed, show Offline and retry status.
- Never claim an edit is saved unless persistence succeeds.

### 27.5 Crashes and Recovery

**OPEN SPECIFICATION — Session Recovery**

Crash recovery, transaction journaling, and restoring active editor state are not specified at UX level.

MVP recommendation:

- Reopen the last Studio and page.
- Restore persisted edits.
- Do not promise recovery of unsaved media imports or in-progress drag operations.

---

## 28. Destructive Actions

### 28.1 Confirmation Required

Confirm:

- Delete Show
- Delete Episode
- Delete referenced Segment
- Delete referenced Layout
- Delete referenced Component
- Remove Resource used in production

### 28.2 Confirmation Not Required

Do not interrupt for:

- Remove Segment placement from Storyboard
- Reorder
- Change field value
- Replace Resource
- Change Layout

These actions are covered by undo.

### 28.3 Reference-Aware Deletion

Before destructive deletion, show where the object is used.

Prefer Archive when references exist.

---

## 29. Search

### 29.1 Required Search

- Shows
- Segment Catalog
- Layout Catalog
- Resources

### 29.2 Search Scope

Search within the current Studio or Show context.

### 29.3 Global Search

DEFERRED:

- Cross-Studio search
- Command palette
- Search across Episode notes and content
- Natural-language search

---

## 30. Accessibility

### 30.1 Required

- Full keyboard access to primary controls
- Visible focus states
- Semantic labels
- Sufficient contrast
- Reduced-motion support
- Text alternatives for thumbnails where relevant
- Non-color validation indicators
- Resizable text without critical clipping

### 30.2 Drag-and-Drop Alternatives

All drag-and-drop actions need menu or keyboard alternatives:

- Move left/right
- Move before/after
- Add to selected position
- Assign Component to Slot

### 30.3 Canvas Editing

**OPEN SPECIFICATION — Accessible Canvas Manipulation**

The complete keyboard and screen-reader UX for moving and resizing Slots is not specified.

MVP implementation:

- Provide numeric position and size controls in the inspector.
- Do not rely solely on pointer dragging.

---

## 31. Responsive Behavior

### 31.1 MVP Platform

Desktop-first.

Recommended minimum comfortable width:

- 1280 pixels

### 31.2 Narrow Desktop

At reduced width:

- Collapse Catalog into drawer.
- Collapse inspector when necessary.
- Preserve central canvas.
- Reduce Storyboard columns.

### 31.3 Mobile Editing

DEFERRED:

- Full Show design
- Full Layout editing
- Complex Segment configuration

### 31.4 Future Mobile Host Mode

A mobile host/control surface has been discussed, including Host + Video monitoring.

**OPEN SPECIFICATION — Mobile Host Mode**

The control layout, connectivity, rehearsal support, confidence monitor, and production safety behavior are not specified.

Do not include it in the Producing MVP.

---

## 32. Onboarding and Guidance

### 32.1 First-Use Guidance

The MVP should use concise empty-state guidance and contextual hints.

Avoid a long mandatory tutorial.

### 32.2 Recommended First Show Path

```text
Create Show
→ Add first Segment
→ Choose or create Layout
→ Add Segment to Blueprint
→ Create first Episode
→ Fill content
→ Preview
```

### 32.3 Setup Checklist

**OPEN SPECIFICATION — Guided Setup Checklist**

A checklist may help new creators, but the steps, persistence, and dismissal behavior are not finalized.

MVP implementation:

- Use inline empty states.
- Do not build a persistent checklist system yet.

### 32.4 Sample Project

**OPEN SPECIFICATION — Demo Show**

A prebuilt sample Show would improve comprehension, but its content and licensing have not been specified.

MVP implementation:

- Do not ship a sample project unless a complete demo package is created separately.

---

## 33. Notifications and Feedback

### 33.1 Inline Feedback

Use inline status for:

- Saved
- Resource imported
- Segment added
- Validation issue
- Device unavailable

### 33.2 Toasts

Use brief toasts for completed background actions:

- Layout duplicated
- Segment archived
- Resource replaced

Do not use toasts for information that needs continued attention.

### 33.3 Progress

Show progress for:

- Large media import
- Thumbnail generation
- Video analysis
- Future project packaging

---

## 34. Visual Design Dependencies

The UX can be implemented structurally before final branding, but the following require a Design System specification:

- Typography scale
- Color tokens
- Spacing
- Card radii
- Elevation
- Icon set
- Button hierarchy
- Panel treatment
- Canvas chrome
- Validation colors
- Motion durations
- Thumbnail styling
- Empty-state illustrations

**OPEN SPECIFICATION — Showflow Design System**

The full visual system and brand expression have not yet been written.

MVP implementation:

- Use neutral, accessible temporary tokens.
- Centralize all tokens.
- Avoid embedding arbitrary colors or spacing throughout components.
- Do not treat temporary visual choices as brand decisions.

---

## 35. Interaction Design Dependencies

The following need a dedicated interaction specification after the functional shell is proven:

- Complete keyboard shortcut map
- Multi-select behavior
- Copy and paste across Storyboards
- Context menus
- Canvas snapping
- Layer selection
- Drag auto-scroll
- Dragging between Catalog and Storyboard
- Focus restoration
- Fine-grained undo grouping
- Command palette
- Touch interaction

**OPEN SPECIFICATION — Interaction Specification**

Until written, use platform conventions and keep interaction logic modular.

---

## 36. Technical UX Dependencies

The following behaviors depend on the Technical Architecture:

- Media playback performance
- Thumbnail rendering
- Local versus cloud saving
- File import behavior
- Camera preview
- Audio playback and monitoring
- Undo persistence
- Background processing
- OBS or renderer preview
- Project portability

Codex should not define product behavior based solely on implementation convenience when it conflicts with this UX specification.

---

## 37. MVP Screen Inventory

### Required Screens

1. Studio creation
2. Studio Home
3. New Show
4. Show Detail
5. Design Show — Blueprint
6. Segment Catalog
7. Show Segment Editor
8. Layout Catalog
9. Layout Editor
10. New Episode
11. Produce Episode — Storyboard
12. Episode Segment Editor
13. Resource picker/browser
14. Validation panel
15. Segment preview
16. Episode rehearsal
17. Basic Show settings
18. Basic Episode settings

### Optional or Deferred Screens

- Component Catalog as a standalone screen
- Full Brand Kit editor
- Episode archive filters
- Rehearsal report
- Mobile Host Mode
- Broadcast workspace
- Device routing
- Analytics
- Collaboration
- Template marketplace

---

## 38. Suggested Implementation Order

### Milestone 1 — Navigation and Storyboards

- Studio Home
- Show Detail
- Design Show Blueprint
- Segment Catalog
- New Episode
- Episode Storyboard
- Reorder, duplicate, remove, insert
- Autosave
- Scope indicators

### Milestone 2 — Segment Content

- Show Segment editor
- Simple data fields
- Episode Segment editor
- Notes
- Validation
- Storyboard thumbnails using placeholders

### Milestone 3 — Layout Composition

- Layout Catalog
- Layout presets
- Slots
- Built-in Components
- Resource assignments
- Canvas preview
- Simple bindings

### Milestone 4 — Production Behavior

- Enter, Active, Exit
- Layout activation
- Animation presets
- Single-action Host Cues
- Segment preview

### Milestone 5 — Rehearsal

- Episode rehearsal
- Segment navigation
- Notes
- Cue controls
- Timing
- Error presentation

Do not begin broadcasting integration before the Producing workflow can be used coherently end to end.

---

## 39. UX Acceptance Criteria

The MVP UX is successful when a first-time creator can, without understanding OBS:

1. Create a Studio.
2. Create a Show.
3. Understand that Design Show defines future Episodes.
4. Create a reusable Opening Segment.
5. Add it to the Show Blueprint.
6. Create a reusable Host Layout.
7. Place a camera, background, logo, and Lower Third in that Layout.
8. Assign fixed Show Resources once.
9. Define Episode-specific Lower Third fields.
10. Create a new Episode from the Blueprint.
11. Understand that Episode changes do not alter the Blueprint.
12. Fill in Episode-specific content.
13. Insert, remove, duplicate, and reorder Segments.
14. Identify which Segments need content.
15. Open a Segment and preview what the audience will see.
16. Configure or trigger a basic Host Cue.
17. Rehearse the Episode from any Segment.
18. Return to the Storyboard without losing location or edits.
19. Complete the workflow without encountering broadcast-engine terminology.
20. Recognize that newly created Segments and Layouts are reusable Show assets.

---

## 40. Consolidated Open Specification Register

The following features are not fully specified and must not be treated as settled product behavior.

| Area | Status | MVP handling |
|---|---|---|
| Full Brand Kit onboarding | Open | Name and optional logo only |
| Starter Show templates | Open | Blank Show |
| Episode status lifecycle | Open | Draft and Ready |
| Design Show Catalog navigation | Open | Tabs plus picker drawer |
| Storyboard zoom levels | Open | One card size |
| Single-click versus double-click open | Open | Single select, double open |
| Catalog tags/folders | Open | Search and simple sort |
| Prepare/Cleanup manual editing | Open | Inferred/read-only summary |
| Structured Segment data | Open | Simple scalar/resource fields |
| Rich notes/teleprompter | Open | Plain or minimal rich text |
| Layout preset library | Open | Four basic presets |
| Aspect-ratio variant linking | Open | One ratio per Layout |
| Custom Component authoring | Open | Built-in templates |
| Graphic styling depth | Open | Presets and limited controls |
| Resource storage model | Open | Defined by technical architecture |
| Device configuration | Open | Simple selector/status |
| Runtime calculation | Open | Sum expected durations |
| Episode override model | Open | Limited explicit overrides |
| Full Blueprint runtime preview | Open | Visual sequence only |
| Audience versus Host preview | Open | Audience only |
| Rehearsal reporting | Open | Basic elapsed timing |
| Multi-action Cue editor | Open | Single-action Cues |
| Optional Segment readiness | Open | All Storyboard Segments required |
| Offline and synchronization | Open | Follow technical architecture |
| Session/crash recovery | Open | Restore persisted last location |
| Accessible canvas manipulation | Open | Numeric inspector controls |
| Mobile Host Mode | Open | Deferred |
| Guided setup checklist | Open | Inline empty states |
| Demo Show | Open | Not included |
| Showflow Design System | Open | Neutral centralized tokens |
| Full interaction specification | Open | Platform conventions |
| Keyboard shortcut map | Open | Standard shortcuts only |

---

## 41. Codex Implementation Rules

When using this document as coding-agent context:

1. Preserve the terminology exactly unless a later specification replaces it.
2. Do not introduce Episode-only Segments, Layouts, or Components.
3. Do not expose scenes, sources, buses, or OBS concepts in primary UX.
4. Do not build a timeline editor.
5. Do not build a general-purpose graphics editor.
6. Do not invent behavior for an **OPEN SPECIFICATION** item.
7. Put open-feature logic behind modular interfaces where practical.
8. Use placeholders or disabled controls only when they clarify the intended future surface.
9. Keep the Show and Episode scope visibly distinct.
10. Reuse the Storyboard and Segment editor shells across Show and Episode contexts.
11. Centralize temporary design tokens.
12. Implement autosave and undo early enough that later workflows rely on them.
13. Use production-language errors.
14. Keep the central Storyboard or canvas visually dominant.
15. Prefer an incomplete but coherent vertical slice over many disconnected controls.

---

## 42. Final UX Summary

Showflow has two closely related but distinct primary workflows.

### Design Show

The creator builds the reusable system:

```text
Show Blueprint
+ Segment Catalog
+ Layout Catalog
+ reusable production behavior
```

The central question is:

> How should this Show usually work?

### Produce Episode

The creator prepares one broadcast:

```text
Episode Storyboard
+ this Episode's content
+ this Episode's order
+ this Episode's notes and limited overrides
```

The central question is:

> What are we producing this time?

Both workflows use a familiar Storyboard and canvas-based editing model. The scope changes, but the interaction language remains consistent.

The product should make creators feel that they are arranging and running a show—not configuring broadcasting software.
