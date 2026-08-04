# Showflow
## Architecture Product Requirements Document
### Version 1.3 — Producing System MVP

**Document status:** Implementation-ready first pass  
**Primary audience:** Codex coding agents, software engineers, product designers  
**Product name:** Showflow  
**Scope:** Show design and episode production architecture. Live broadcasting execution is a later phase.

---

## 1. Executive Summary

Showflow is a production-first application for creators who design, prepare, rehearse, and eventually host recurring live shows.

Traditional broadcasting software asks creators to adopt a technical mental model built around scenes, sources, filters, encoders, and device routing. Showflow instead models the way a producer naturally thinks:

- A **Studio** contains recurring **Shows**.
- A **Show Blueprint** defines the default Storyboard for future Episodes.
- A **Catalog** contains reusable Show Segments.
- An **Episode Storyboard** is one editable production based on that Blueprint.
- A **Segment** defines the production flow for one meaningful part of the show.
- A **Layout** defines a reusable screen composition.
- A **Slot** defines a position or region within a Layout.
- A **Component** defines a reusable visual or media element.
- A **Resource** supplies the actual image, video, audio, camera, text, or data.
- A **Host Cue** is an optional manual action available while a Segment is active.

The central product principle is:

> Design once. Produce many.

The MVP must validate the reusable production model before attempting to replace OBS, Restream, a video editor, or a motion-graphics application.

---

## 2. Product Mission

Showflow enables a solo creator to produce a polished recurring show without needing to think like a broadcast engineer or operate a full production crew.

The software should help the creator:

1. Design the reusable structure and visual language of a Show.
2. Create new Episodes from a default Storyboard.
3. Adapt each Episode without rebuilding the production.
4. Reuse Segments, Layouts, Components, and Resources.
5. Rehearse the same production model that will later drive a live broadcast.
6. Focus attention on hosting, content, pacing, and the audience.

---

## 3. Product Principles

### 3.1 Think Like a Producer

Showflow must use production concepts and familiar creative workflows.

Prefer:

- Show
- Episode
- Storyboard
- Segment
- Layout
- Cue
- Notes
- Rehearse

Avoid exposing technical concepts by default:

- OBS scene
- browser source
- audio bus
- decoder
- source identifier
- encoder setting

### 3.2 Reuse Over One-Offs

Segments, Layouts, and Components are Show-level reusable objects.

The Episode workspace composes and populates reusable production objects. It does not create private Episode-only production primitives.

If a creator needs a new Segment or Layout while producing an Episode, Showflow creates it in the Show Catalog or Layout Catalog and immediately inserts or assigns it in the current Episode.

### 3.3 Design Once, Produce Many

The Show defines reusable production behavior. Episodes provide the current broadcast's content and arrangement.

### 3.4 Storyboard First

The Show Blueprint and Episode Storyboard are the primary visual representations of a production.

### 3.5 Familiar Creative Workspaces

The Storyboard should resemble a physical or film storyboard. The Segment editor should resemble presentation software: large central canvas, editing tools in sidebars, and speaker notes below.

### 3.6 One Primary Focus Per Screen

- Studio Home → Shows
- Show Detail → Create New Episode
- Design Show → Show Blueprint
- Produce Episode → Episode Storyboard
- Segment Editor → Audience canvas

### 3.7 Do Not Recreate Canva, Figma, Premiere, or After Effects

Showflow composes reusable production elements. It is not a general-purpose graphic-design, animation, or video-editing tool.

Graphics and complex animations may be created externally and imported as Resources.

### 3.8 Progressive Disclosure

The common workflow must remain simple. Secondary concepts such as Host Cues, bindings, lifecycle actions, and overrides should appear only in relevant contexts.

### 3.9 Every Object Has One Responsibility

- Segments orchestrate production.
- Layouts compose the screen.
- Slots position content.
- Components render and animate.
- Resources provide content.
- Episodes arrange and populate reusable production objects.

### 3.10 Optimize for the One-Person Studio

A host should be able to prepare and eventually operate the show without a separate producer, graphics operator, technical director, or soundboard operator.

---

## 4. MVP Scope

### 4.1 Included

The Producing MVP includes:

- One or more Studios
- Studio switching
- Shows
- Show Detail
- Show Blueprint
- Segment Catalog
- Layout Catalog
- Component Catalog
- Resource management
- Episode creation
- Episode Storyboard
- Show Segment editing
- Episode Segment editing
- Fixed Segment lifecycle
- Layout activation
- Component enter and exit behavior
- Manual Host Cues
- Cue lifetime and completion behavior
- Preview
- Basic rehearsal
- Autosave
- Undo and redo
- Validation

### 4.2 Explicitly Excluded

The Producing MVP does not include:

- Live streaming
- OBS control
- Restream integration
- Encoding
- Multistreaming
- Cloud collaboration
- Remote guests
- Keyframe animation
- Multitrack timelines
- Arbitrary vector design
- Shape/path editing
- A plugin marketplace
- Advanced conditional automation
- AI-generated production behavior
- Post-production editing
- Social publishing
- Analytics
- Production locking/version snapshots for archived broadcasts

The domain model must remain compatible with future broadcast execution, but the MVP should not implement it.

---

## 5. Canonical Terminology

These names are canonical and should be used consistently in code, UI copy, documentation, and tests.

| Term | Meaning |
|---|---|
| **Studio** | The top-level workspace for one creator, brand, or organization. |
| **Show** | A recurring production with multiple Episodes. |
| **Show Blueprint** | The default Storyboard used to initialize new Episodes. |
| **Catalog** | The Show's reusable collection of Show Segments. |
| **Show Segment** | A reusable definition of a production segment. |
| **Episode** | One specific production instance of a Show. |
| **Episode Storyboard** | The ordered Segments for one Episode. |
| **Episode Segment** | One editable Segment instance in an Episode. |
| **Layout** | A reusable screen composition. |
| **Slot** | A named region or anchor within a Layout. |
| **Component** | A reusable visual, media, or input element. |
| **Component Placement** | A Component instance assigned to a Slot in a Layout. |
| **Resource** | An image, video, audio file, camera input, font, text source, or structured data source. |
| **Host Cue** | An optional manual production action available while a Segment is active. |
| **Lifecycle** | The fixed Prepare, Enter, Active, Exit, and Cleanup phases of every Segment. |
| **Format** | An architectural synonym for the Show Blueprint. The user-facing term should normally be **Show Blueprint** or **default Storyboard**. |

Do not use **Moment** as a domain term in v1.3. The canonical term is **Segment**.

---

## 6. High-Level Object Model

```text
Studio
├── Brand Kit
├── Shared Resource Catalog
└── Shows
    └── Show
        ├── Show Blueprint
        │   └── Blueprint Segment Placements
        ├── Segment Catalog
        │   └── Show Segments
        ├── Layout Catalog
        │   └── Layouts
        ├── Component Catalog
        │   └── Components
        ├── Show Resource Catalog
        └── Episodes
            └── Episode
                ├── Metadata
                ├── Episode Resources
                └── Episode Storyboard
                    └── Episode Segments
```

Secondary supporting objects:

```text
Show Segment
├── Data Schema
├── Lifecycle
│   ├── Prepare Actions
│   ├── Enter Actions
│   ├── Active Configuration
│   ├── Exit Actions
│   └── Cleanup Actions
├── Layout Uses
├── Host Cue Set
├── Expected Duration
└── Notes Template

Layout
├── Slots
└── Component Placements
    ├── Component Reference
    ├── Slot Reference
    ├── Resource/Data Bindings
    ├── Property Overrides
    └── Enter/Exit Overrides
```

---

## 7. Definition Versus Instance

Showflow must distinguish reusable definitions from Episode-specific instances.

| Reusable definition | Episode-specific instance |
|---|---|
| Show Segment | Episode Segment |
| Show Blueprint placement | Episode Storyboard placement |
| Component | Component Placement |
| Resource | Resource usage or binding |

### 7.1 Show-Level Creation Rule

The following objects are created only at Show scope:

- Show Segments
- Layouts
- Components

There are no Episode-only Segments, Layouts, or Components in the MVP.

### 7.2 Creating From an Episode

The Episode workspace may expose actions such as **Create New Segment** or **Create New Layout** to preserve creative flow.

Internally, those actions must:

1. Create the reusable object in the Show's corresponding Catalog.
2. Save it at Show scope.
3. Insert or assign it in the current Episode.
4. Avoid asking the user to choose a scope.

### 7.3 Episode Independence

Creating an Episode copies the current Blueprint ordering into a new Episode Storyboard.

The Episode Storyboard is then structurally independent. The user may:

- Reorder Segments
- Duplicate Segments
- Remove Segments
- Insert Segments from the Catalog
- Add optional Segments not present in the Blueprint

Editing an Episode Storyboard must not modify the Show Blueprint.

---

## 8. Studio

### 8.1 Definition

A Studio is the top-level workspace for one creator, brand, production company, or organization.

### 8.2 Responsibilities

A Studio owns:

- Studio identity
- Brand Kit
- Shows
- Shared Resources
- Studio settings
- Future user and collaboration settings

### 8.3 UX Requirement

Opening Showflow enters a Studio.

Switching Studios should feel similar to switching accounts in a social application, not changing folders in a file browser.

### 8.4 Studio Isolation

Objects from one Studio must not appear in another Studio unless explicitly copied or imported.

---

## 9. Show

### 9.1 Definition

A Show is a recurring production with multiple Episodes.

Examples:

- Top 10 Music Videos
- Artist Interviews
- Weekly Commentary
- Live Sessions

### 9.2 Responsibilities

A Show owns:

- Show metadata
- Show Blueprint
- Segment Catalog
- Layout Catalog
- Component Catalog
- Show Resources
- Episodes
- Show-level style defaults
- Future broadcast settings

### 9.3 Show Detail Information Hierarchy

The Show Detail screen must prioritize:

1. **Create New Episode**
2. **Design Show**
3. **Recent Episodes**

The Episode archive belongs on a separate or expanded view. It should not dominate the Show Detail screen.

---

## 10. Show Blueprint

### 10.1 Definition

The Show Blueprint is the default Storyboard for future Episodes.

It represents the recommended recurring order of Show Segments.

### 10.2 Structure

The Blueprint contains an ordered list of **Blueprint Segment Placements**.

A Blueprint Segment Placement references:

- A Show Segment
- A display label
- Optional default data
- Optional default duration
- Optional placement-specific overrides
- Its order within the Blueprint

The same Show Segment may appear multiple times.

Example:

```text
Opening
Interview
Interview
Closing
```

Both Interview cards may reference the same reusable Interview Show Segment.

### 10.3 Behavior

Creating a new Episode:

1. Reads the current Blueprint.
2. Creates one Episode Segment for each Blueprint placement.
3. Copies placement order and default data.
4. Links each Episode Segment to its source Show Segment.
5. Creates an independently editable Episode Storyboard.

### 10.4 Blueprint Editing

The user may:

- Add Segments from the Catalog
- Create new reusable Segments
- Reorder placements
- Duplicate placements
- Remove placements
- Edit default placement data
- Open a referenced Show Segment
- Preview the default production flow

Blueprint changes affect only Episodes created afterward unless an explicit synchronization feature is added in a later release.

---

## 11. Segment Catalog

### 11.1 Definition

The Catalog is the Show's reusable collection of Show Segments.

### 11.2 Responsibilities

The Catalog must support:

- Browsing
- Search
- Categories or tags
- Preview thumbnails
- Adding a Segment to a Blueprint
- Adding a Segment to an Episode
- Creating a new Show Segment
- Duplicating a Show Segment
- Archiving a Show Segment
- Showing where a Show Segment is used

### 11.3 No One-Off Segments

Every newly created Segment becomes part of the Catalog, even if it is initially created to satisfy the needs of one Episode.

The product philosophy is:

> If it is worth creating, it is worth making reusable.

---

## 12. Show Segment

### 12.1 Definition

A Show Segment is a reusable definition of one meaningful part of a production.

Examples:

- Opening
- Interview
- Ranking Reveal
- Video Playback
- Discussion
- Sponsor Read
- Who's the Winner?
- Closing

### 12.2 Responsibilities

A Show Segment defines:

- Segment name
- Purpose or description
- Data schema
- Default values
- Fixed lifecycle
- Lifecycle actions
- Active configuration
- Layouts used during the Segment
- Host Cues
- Expected duration
- Notes template
- Validation requirements

A Show Segment orchestrates production behavior. It does not directly define low-level rendering or arbitrary visual design.

### 12.3 Data Schema

A Show Segment declares the Episode-specific fields it expects.

Example:

```json
{
  "rank": "number",
  "artistName": "string",
  "songTitle": "string",
  "artwork": "resource:image",
  "musicVideo": "resource:video",
  "lowerThirdTitle": "string",
  "lowerThirdSubtitle": "string"
}
```

An Episode Segment stores values conforming to this schema.

### 12.4 Segment Lifecycle

Every Segment has exactly five phases:

```text
Prepare → Enter → Active → Exit → Cleanup
```

Users cannot add, delete, rename, or reorder lifecycle phases.

This fixed structure prevents Showflow from becoming a nested video editor or arbitrary state-machine builder.

---

## 13. Segment Lifecycle

### 13.1 Prepare

Prepare occurs before the Segment is visible.

Typical actions:

- Preload referenced media
- Initialize video playback
- Resolve Resource bindings
- Verify camera availability
- Cache images and fonts
- Prepare Layouts used by Enter, Active, and Exit
- Validate required Episode data

Prepare should normally be invisible.

### 13.2 Enter

Enter is an ordered list of high-level production actions that run as the Segment begins.

Example:

```text
1. Activate Layout: Winner Title Card
2. Wait for active Layout's entrance animations to finish
3. Activate Layout: Host + Video
4. Continue to Active
```

Enter may contain multiple Layout activations.

This supports animated title cards and other opening choreography without introducing arbitrary Stages or a nested timeline.

### 13.3 Active

Active is the host-facing portion of the Segment.

Active defines:

- Default Layout
- Available alternate Layouts
- Default camera or Shot, if applicable
- Host Cues
- Expected duration
- Notes template
- Optional media controls
- The stable state to restore after temporary Cue behavior

The Segment remains Active until the host or future execution layer advances to the next Segment.

### 13.4 Exit

Exit is an ordered list of actions that run when the user advances away from the Segment.

Example:

```text
1. Activate Layout: Winner Outro
2. Wait for entrance animation to finish
3. Continue to Cleanup
```

Exit supports an outro composition without requiring a separate Episode Segment.

### 13.5 Cleanup

Cleanup occurs after the Segment is no longer visible.

Typical actions:

- Stop temporary media
- Clear temporary overlays
- Release large media Resources
- Reset Cue state
- Record timing and Cue usage
- Restore audio defaults

Cleanup should normally be invisible.

---

## 14. Lifecycle Action Model

Lifecycle phases contain ordered high-level actions.

The MVP should support a limited, extensible action set.

### 14.1 MVP Actions

- `preloadResource`
- `activateLayout`
- `playSound`
- `startMedia`
- `stopMedia`
- `waitForAnimationCompletion`
- `waitForMediaCompletion`
- `setActiveDefaults`
- `clearTemporaryState`

### 14.2 Constraints

The MVP must not expose:

- Keyframes
- Arbitrary time tracks
- Nested timelines
- General-purpose scripting
- Complex branching
- User-defined state graphs

### 14.3 Sequencing

Actions execute in list order.

An action may declare one of these completion policies:

- Continue immediately
- Continue after animation completion
- Continue after media completion
- Stop at Active and wait for the host

The UI should use plain-language production instructions rather than exposing implementation-level action names.

---

## 15. Episode

### 15.1 Definition

An Episode is one specific production instance of a Show.

### 15.2 Responsibilities

An Episode owns:

- Episode metadata
- Episode Storyboard
- Episode Segment data
- Episode Resources
- Notes
- Local Segment overrides
- Validation state
- Rehearsal sessions
- Future broadcast status

### 15.3 Episode Metadata

The MVP should support:

- Title
- Subtitle
- Episode number
- Description
- Planned date
- Status
- Guest names
- Sponsor information
- Internal notes

---

## 16. Episode Storyboard

### 16.1 Definition

The Episode Storyboard is the ordered visual sequence of Episode Segments for one broadcast.

### 16.2 Creation

The Episode Storyboard is initialized by copying the Show Blueprint.

### 16.3 Editing

The user may:

- Reorder Episode Segments
- Duplicate Episode Segments
- Remove Episode Segments
- Insert Segments from the Catalog
- Create a new reusable Show Segment and insert it
- Edit Episode-specific data
- Edit notes
- Apply local overrides
- Preview from any Segment
- Rehearse from any Segment

### 16.4 Storyboard UI

The Storyboard is a two- or three-column grid of visual Segment cards.

Each card should display:

- Rendered or representative thumbnail
- Segment title
- Optional Episode-specific label
- Expected duration
- Readiness state
- Validation state

The Storyboard is not a multitrack timeline.

---

## 17. Episode Segment

### 17.1 Definition

An Episode Segment is one editable occurrence of a Show Segment inside an Episode.

### 17.2 Responsibilities

An Episode Segment stores:

- Source Show Segment ID
- Episode-specific field values
- Notes
- Expected duration override
- Optional lifecycle override
- Optional Layout binding override
- Optional Cue override
- Position in the Episode Storyboard

### 17.3 Source Relationship

An Episode Segment is created from a Show Segment but belongs to the Episode.

For MVP:

- Episode-specific data is independent.
- Storyboard order is independent.
- Local overrides do not alter the Show Segment.
- Show-level Layout and Component references remain reusable references.
- Automatic synchronization from edited Show Segments into existing Episodes is out of scope.

A later release may add explicit **Update From Show** and production-version locking.

---

## 18. Layout Catalog

### 18.1 Definition

The Layout Catalog contains reusable screen compositions owned by the Show.

### 18.2 Responsibilities

The Layout Catalog supports:

- Browse
- Search
- Preview
- Create from preset
- Duplicate
- Rename
- Archive
- Show usage locations
- Assign to a Segment lifecycle action
- Assign as an Active Layout

### 18.3 Creation Scope

Layouts are always Show-level reusable objects.

There are no Episode-only Layouts in the MVP.

---

## 19. Layout

### 19.1 Definition

A Layout is a reusable screen composition.

It answers:

> What should the audience see when this Layout is active?

Examples:

- Host
- Host + Video
- Fullscreen Video
- Split Screen
- Winner Title Card
- Outro

### 19.2 Responsibilities

A Layout owns:

- Canvas dimensions and aspect ratio
- Slots
- Component Placements
- Default Resource assignments
- Placement-specific property overrides
- Placement-specific enter/exit overrides

A Layout is passive. It does not define the Segment's production flow.

### 19.3 Layout Reuse

The same Layout may be used by multiple Show Segments and multiple lifecycle phases.

Example:

The reusable **Host Layout** may be used by:

- Opening
- Discussion
- Interview
- Closing
- Who's the Winner?

### 19.4 Constrained Layout Editor

The MVP Layout editor must not become a general-purpose design tool.

It may support:

- Starting from preset compositions
- Adding rectangular Slots
- Moving and resizing Slots
- Assigning semantic Slot roles
- Assigning Components to Slots
- Setting layer order
- Setting safe margins
- Selecting fixed Resources
- Previewing the composition

It must not support:

- Vector drawing
- Arbitrary shapes
- Pen tools
- Path editing
- Rotation-heavy design
- Freeform grouping systems
- Keyframe animation
- Complex responsive constraint systems

---

## 20. Slot

### 20.1 Definition

A Slot is a named region or anchor within a Layout.

### 20.2 Examples

Structural Slots:

- Background
- Host Camera
- Guest Camera
- Main Video
- Picture-in-Picture
- Logo
- Lower Third
- Banner
- Chat

Anchor Slots:

- Center
- Top Center
- Bottom Center
- Upper Left
- Upper Right
- Lower Left
- Lower Right

### 20.3 Responsibilities

A Slot defines:

- ID
- Name
- Semantic role
- Position
- Size
- Alignment
- Safe margins
- Layer order
- Clipping behavior
- Allowed Component categories

A Slot does not define the content placed inside it.

---

## 21. Component Catalog

### 21.1 Definition

The Component Catalog contains reusable visual and media primitives owned by the Show.

Components are secondary to Segments and Layouts in the main UX, but they remain first-class architecture objects.

### 21.2 MVP Built-In Component Categories

- Camera
- Video
- Image
- Text
- Graphic
- Logo
- Background
- Lower Third
- Timer
- Countdown
- Audio indicator

### 21.3 Lower Third Rule

A Lower Third is not a privileged architectural object.

It is a built-in Component type or template with:

- Conventional text fields
- A conventional lower-screen placement
- Default enter and exit animations
- Optional image or logo
- Sensible accessibility defaults

Architecturally, it behaves like any other Component.

---

## 22. Component

### 22.1 Definition

A Component is a reusable visual, media, or input element.

### 22.2 Responsibilities

A Component declares:

- Component type
- Editable property schema
- Expected data inputs
- Default values
- Default appearance
- Default enter behavior
- Default exit behavior
- Supported Slot roles
- Validation rules

A Component definition does not define where it appears. Position is determined by the Layout's Slot and Component Placement.

### 22.3 Examples

A Lower Third Component may declare:

```json
{
  "type": "lowerThird",
  "inputs": {
    "title": "string",
    "subtitle": "string",
    "image": "resource:image?"
  },
  "defaultEnter": {
    "preset": "slideUp",
    "durationMs": 300
  },
  "defaultExit": {
    "preset": "slideDown",
    "durationMs": 250
  }
}
```

---

## 23. Component Placement

### 23.1 Definition

A Component Placement is one use of a Component inside a Layout.

### 23.2 Responsibilities

A Component Placement references:

- Component ID
- Slot ID
- Fixed property values
- Resource assignments
- Segment-data bindings
- Visibility default
- Layer override
- Enter-animation override
- Exit-animation override

### 23.3 Default Resources

Layouts may assign fixed Resources once and reuse them everywhere.

Example: **Host Layout**

```text
Background Slot
→ Background Component
→ Public Sphere background image

Host Camera Slot
→ Camera Component
→ Main Host camera input

Logo Slot
→ Logo Component
→ Public Sphere logo

Lower Third Slot
→ Lower Third Component
→ title bound to Segment data
→ subtitle bound to Segment data
```

Every Segment using the Host Layout receives the same background, camera, logo, and lower-third behavior without reconfiguration.

---

## 24. Binding Model

### 24.1 Purpose

Bindings connect reusable Layout and Component definitions to the data of the current Episode Segment.

### 24.2 Binding Sources

A Component Placement property may be bound to:

- A fixed literal value
- A fixed Resource
- A Show-level Resource
- An Episode Segment field
- An Episode metadata field
- A Show metadata field

### 24.3 Canonical Ownership

The Component declares what inputs it accepts.

The Component Placement stores the default binding for those inputs.

The Show Segment declares the data fields that an Episode Segment must provide.

An Episode Segment provides the actual values.

### 24.4 Example

```text
Show Segment data schema:
- lowerThirdTitle
- lowerThirdSubtitle

Host Layout placement:
Lower Third.title → segment.lowerThirdTitle
Lower Third.subtitle → segment.lowerThirdSubtitle

Episode Segment values:
lowerThirdTitle = "SZA"
lowerThirdSubtitle = "Saturn"
```

### 24.5 Compatibility Validation

When a Show Segment uses a Layout, Showflow must validate that required Layout bindings can be satisfied by:

- The Segment's data schema
- A fixed Resource
- A fixed value
- Show or Episode metadata

---

## 25. Component Enter and Exit Behavior

### 25.1 Canonical Rule

Animation behavior belongs to the Component, with optional overrides on the Component Placement.

The Layout itself does not have a lifecycle.

### 25.2 Activation

When a Layout becomes active:

1. The renderer resolves every Component Placement.
2. Fixed Resources and data bindings are resolved.
3. Components become visible.
4. Each Component runs its configured enter behavior.

### 25.3 Deactivation

When a Layout is replaced or the Segment ends:

1. Each active Component runs its configured exit behavior.
2. Components are removed or hidden after exit completion.
3. Temporary state is cleared.

### 25.4 Static Components

Most Components may use:

```text
Enter: None
Exit: None
```

Examples:

- Background
- Camera
- Static frame

Only selected Components need animation.

Examples:

- Lower Third
- Title graphic
- Ranking card
- Logo reveal

---

## 26. Animation Presets

### 26.1 Goal

Provide useful motion without building an animation editor.

### 26.2 MVP Presets

The MVP may support:

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

Each preset may expose:

- Duration
- Delay
- Easing
- Direction, when applicable

### 26.3 External Animated Resources

Creators may import externally designed animated graphics or videos.

A Component may play the Resource as media instead of recreating the animation in Showflow.

### 26.4 Non-Goals

The MVP does not support:

- Keyframes
- Motion paths
- Per-property animation timelines
- Expression systems
- Animation graphs
- Nested compositions

---

## 27. Layout Activation Within a Segment

### 27.1 Multiple Layouts

A Show Segment may reference several Layouts.

Example: **Who's the Winner?**

```text
Prepare
- Preload Winner Title Layout resources
- Preload Host + Video resources
- Preload Winner Outro resources

Enter
1. Activate Winner Title Layout
2. Wait for entrance animation completion
3. Activate Host + Video Layout
4. Continue to Active

Active
- Default Layout: Host + Video
- Available Layouts: Host, Host + Video, Fullscreen Video

Exit
1. Activate Winner Outro Layout
2. Wait for media or animation completion

Cleanup
- Clear temporary media and Cue state
```

### 27.2 Segment Responsibility

The Segment decides:

- Which Layout is active
- When the Layout changes
- Which Layouts the host may select
- When to advance to the next lifecycle phase

The Segment does not define the animation of each individual Component.

---

## 28. Host Cues

### 28.1 Definition

A Host Cue is a manually triggered production action available while a Segment is Active.

Host Cues are secondary to Segments, Layouts, and Storyboards in the UX.

### 28.2 Examples

- Switch to Host Close Layout
- Play applause
- Show ranking graphic
- Show quote
- Start a video
- Display poll
- Return to default Layout

### 28.3 Manual Trigger Rule

All MVP Host Cues begin manually.

Timed or conditional triggering is not part of the core Cue model.

### 28.4 Cue Lifetime

After manual activation, a Cue may remain active:

- Until manually dismissed
- For a fixed duration
- Until the Segment exits

### 28.5 Completion Behavior

A Cue may complete by:

- Running the target Component's exit behavior
- Hiding the Component immediately
- Restoring the prior Layout
- Restoring the Active default Layout
- Stopping media
- Restoring audio level

### 28.6 Re-Trigger Behavior

A Cue may:

- Restart its lifetime
- Dismiss immediately
- Ignore additional presses
- Restart playback
- Allow another instance as an advanced option

### 28.7 Cue Actions

The MVP should support:

- Activate Layout
- Show or hide Component
- Play sound
- Start, pause, restart, or stop media
- Start or reset timer
- Execute a small ordered multi-action Cue

---

## 29. Resources

### 29.1 Definition

A Resource provides content or input used by a Component.

### 29.2 Categories

- Image
- Video
- Audio
- Font
- Camera input
- Microphone input
- Screen or capture input
- Text document
- Structured data
- Animated graphic

### 29.3 Scopes

Resources may exist at:

- Studio scope
- Show scope
- Episode scope

### 29.4 Requirements

The Resource system should support:

- Import
- Search
- Preview
- Tags
- Collections
- Usage references
- Replacement
- Missing-file detection
- Duplicate detection
- Compatibility validation

### 29.5 File-System Principle

The creator should not need to repeatedly browse operating-system folders after importing Resources.

---

## 30. Workspace Architecture

### 30.1 Studio Home

Primary content:

- Show cards
- New Show

No Episode lists should be expanded on Studio Home.

### 30.2 Show Detail

Priority order:

1. Create New Episode
2. Design Show
3. Recent Episodes

### 30.3 Design Show Workspace

The hero is the Show Blueprint.

Supporting tools:

- Segment Catalog
- Layout Catalog

Segments and Layouts may be opened for focused editing.

Cues, Components, Resources, and bindings are secondary and appear contextually.

### 30.4 Produce Episode Workspace

The hero is the Episode Storyboard.

Supporting tool:

- Segment Catalog

The user spends most of their time here.

### 30.5 Shared Storyboard Shell

Design Show and Produce Episode should reuse the same Storyboard interaction system.

The difference is always visible:

- **Show Blueprint:** “Changes become the default for future Episodes.”
- **Episode Storyboard:** “Changes apply only to this Episode.”

### 30.6 Segment Expansion

Opening a Segment should visually expand the Storyboard card into the Segment workspace.

Returning should collapse it back to its Storyboard position.

This preserves spatial continuity.

### 30.7 Segment Workspace

The Segment editor resembles presentation software:

```text
Top navigation
Left sidebar | Large central canvas | Right inspector
Notes at bottom
```

Left sidebar:

- Components
- Resources
- Assets available for drag-and-drop

Right inspector:

- Selected Component Placement properties
- Layout selection
- Binding configuration
- Lifecycle
- Host Cues
- Expected duration
- Validation

The central canvas is always the focal point.

---

## 31. Show Segment Editor Versus Episode Segment Editor

### 31.1 Show Segment Editor

Edits reusable production behavior:

- Data schema
- Lifecycle actions
- Active Layouts
- Host Cues
- Expected duration
- Notes template
- Layout bindings and overrides

### 31.2 Episode Segment Editor

Edits the current Episode instance:

- Field values
- Episode Resources
- Notes
- Duration override
- Optional local behavior overrides
- Optional Cue overrides

The workspace shell may be shared, but the scope and editing emphasis must be unmistakable.

---

## 32. Validation

The system should produce production-language validation messages.

### 32.1 Required Validation

- Missing required Segment data
- Missing Resource
- Deleted Component reference
- Deleted Layout reference
- Invalid Slot assignment
- Unsupported Component in Slot
- Unsatisfied data binding
- Duplicate Cue shortcut
- Cue with invalid target
- Missing camera input
- Media format unsupported
- Fixed-duration Cue without completion behavior
- Lifecycle action referencing unavailable Layout
- Blueprint placement referencing archived Segment

### 32.2 Language

Avoid:

> Binding resolution failed.

Prefer:

> The Ranking Reveal Segment is missing artwork for the Album Art component.

Every issue should identify:

- What is wrong
- Where it occurs
- Whether it blocks preview, rehearsal, or future broadcast
- How to fix it

---

## 33. Preview and Rehearsal

### 33.1 Preview

The creator should be able to preview:

- A Component
- A Component's enter and exit behavior
- A Layout
- A Layout activation
- A Host Cue
- A Segment lifecycle
- A sequence of Segments
- The full Episode

### 33.2 Rehearsal

Rehearsal executes:

- Segment lifecycle
- Layout changes
- Component enter and exit behavior
- Manual Host Cues
- Cue lifetime and completion
- Media playback
- Notes
- Timing

Rehearsal does not broadcast.

### 33.3 Rehearsal Controls

- Start from beginning
- Start from selected Segment
- Previous Segment
- Next Segment
- Restart Segment
- Pause
- Test Cue
- Stop rehearsal

---

## 34. Persistence and Identity

### 34.1 Stable IDs

All domain objects must use stable unique identifiers.

Display names must never be used as primary references.

### 34.2 Serialization

The domain model should be serializable and execution-engine agnostic.

### 34.3 Autosave

All edits should autosave.

### 34.4 Undo and Redo

The MVP should support undo and redo for:

- Storyboard edits
- Segment edits
- Layout edits
- Component Placement edits
- Resource assignments
- Cue edits

### 34.5 Production Versioning

Full production snapshots and archived Episode immutability are deferred, but the architecture should not prevent them.

---

## 35. Execution-Engine Independence

The Producing domain must not depend on OBS-specific types.

Future execution adapters may map Showflow actions to:

- OBS WebSocket commands
- A native renderer
- Another broadcast engine
- A recording-only renderer
- Remote production infrastructure

A future adapter should consume normalized instructions such as:

```text
Activate Layout
Show Component
Play Resource
Set Camera Input
Run Component Enter
Run Component Exit
```

The core domain model must remain stable if the execution engine changes.

---

## 36. Suggested Domain Entities

The exact implementation may vary, but the following entities should remain conceptually distinct.

```text
Studio
BrandKit
Show
ShowBlueprint
BlueprintSegmentPlacement
ShowSegment
SegmentDataField
SegmentLifecycle
LifecycleAction
ActiveSegmentConfiguration
Episode
EpisodeStoryboard
EpisodeSegment
Layout
Slot
Component
ComponentPlacement
Binding
Resource
HostCue
CueAction
CueLifetime
CueCompletionBehavior
CueRetriggerBehavior
ValidationIssue
RehearsalSession
```

Recommended junction/configuration entities:

```text
SegmentLayoutUse
SegmentCueConfiguration
ResourceUsage
```

`SegmentLayoutUse` is internal and need not be exposed as a user-facing term. It may store:

- Segment ID
- Layout ID
- Lifecycle role
- Binding overrides
- Placement overrides
- Availability during Active
- Default/alternate status

---

## 37. Architectural Invariants

Codex and human engineers must preserve these rules.

1. A Studio contains Shows.
2. A Show owns its Blueprint, Segment Catalog, Layout Catalog, Component Catalog, and Episodes.
3. A Show Blueprint is an ordered list of placements referencing Show Segments.
4. A new Episode copies the Blueprint ordering into an independent Episode Storyboard.
5. A Segment is created at Show scope only.
6. A Layout is created at Show scope only.
7. A Component is created at Show scope only.
8. Episode Storyboards may reorder, duplicate, remove, and insert reusable Segments.
9. Every Segment has exactly five lifecycle phases.
10. Segments orchestrate Layout activation and high-level production actions.
11. Layouts define reusable compositions.
12. Layouts own Slots and Component Placements.
13. Slots define position and accepted content roles.
14. Components define visual/media behavior and default enter/exit animation.
15. Component Placements bind Components to Slots, Resources, and Segment data.
16. Layouts do not have a lifecycle.
17. A Lower Third is a built-in Component type, not a separate architectural layer.
18. Host Cues are manually triggered.
19. Cue lifetime and completion behavior do not make a Cue automatically triggered.
20. The MVP must not introduce arbitrary Stages, nested Storyboards, keyframes, or general-purpose automation.
21. The domain model must not depend on OBS.
22. The UI should expose production language and hide implementation language.

---

## 38. Example End-to-End Model

### 38.1 Reusable Show Objects

```text
Show: Top 10 Music Videos

Segment Catalog:
- Opening
- Ranking Reveal
- Video Playback
- Discussion
- Who's the Winner?
- Closing

Layout Catalog:
- Title Card
- Host
- Host + Video
- Fullscreen Video
- Winner Outro

Component Catalog:
- Camera
- Background
- Logo
- Lower Third
- Ranking Card
- Video Player
- Animated Title Graphic
```

### 38.2 Host Layout

```text
Layout: Host

Background Slot
- Background Component
- Resource: Public Sphere Background
- Enter: None
- Exit: None

Host Slot
- Camera Component
- Resource: Main Host Camera
- Enter: None
- Exit: None

Logo Slot
- Logo Component
- Resource: Public Sphere Logo
- Enter: Fade
- Exit: Fade

Lower Third Slot
- Lower Third Component
- title → segment.lowerThirdTitle
- subtitle → segment.lowerThirdSubtitle
- Enter: Slide Up
- Exit: Slide Down
```

### 38.3 Who's the Winner? Show Segment

```text
Data fields:
- lowerThirdTitle
- lowerThirdSubtitle
- comparisonVideo
- winnerName

Prepare:
- Preload Title Card resources
- Preload Host + Video resources
- Preload Winner Outro resources

Enter:
1. Activate Title Card Layout
2. Wait for animation completion
3. Activate Host + Video Layout
4. Continue to Active

Active:
- Default Layout: Host + Video
- Available Layouts:
  - Host
  - Host + Video
  - Fullscreen Video
- Host Cues:
  - Show Winner Graphic
  - Play Applause
  - Return to Host
- Notes template:
  - Introduce the comparison
  - Discuss each option
  - Ask the audience for their choice

Exit:
1. Activate Winner Outro Layout
2. Wait for media completion

Cleanup:
- Stop comparison video
- Clear Cue state
```

### 38.4 Episode Segment

```text
Episode: Week 32
Episode Segment: Who's the Winner?

lowerThirdTitle = "Who's the Winner?"
lowerThirdSubtitle = "SZA vs. Victoria Monét"
comparisonVideo = week32-comparison.mp4
winnerName = "Victoria Monét"

Notes:
- Mention the lighting in the second video.
- Read poll results before advancing.
```

---

## 39. MVP Acceptance Criteria

The Producing MVP is successful when a creator can:

1. Enter a Studio and see its Shows.
2. Open a Show and create a new Episode.
3. Design a default Show Blueprint.
4. Create reusable Show Segments.
5. Create reusable Layouts from constrained presets.
6. Place Components into Layout Slots.
7. Assign fixed background, logo, and camera Resources once in a Layout.
8. Configure a Lower Third once and reuse it wherever that Layout is used.
9. Configure Component enter and exit animation from a preset list.
10. Configure a Segment with Prepare, Enter, Active, Exit, and Cleanup.
11. Use multiple Layouts inside one Segment without creating nested Stages.
12. Create an Episode from the Blueprint.
13. Reorder, duplicate, remove, and insert Segments in the Episode Storyboard.
14. Enter Episode-specific Segment data.
15. Preview a Layout and Segment.
16. Manually trigger a Host Cue and have it complete automatically after a configured lifetime.
17. Rehearse an Episode without broadcasting.
18. Receive clear validation messages for missing production inputs.
19. Complete the common workflow without encountering OBS-specific or broadcast-engine terminology.

---

## 40. Deferred Decisions

The following require separate technical or UX specifications and should not be invented silently by the coding agent:

- Desktop framework
- Frontend framework
- Local database or file format
- Rendering technology
- OBS adapter design
- Video and audio pipeline
- Cloud synchronization
- Collaboration model
- Hardware control integration
- Version-locking strategy
- Pricing and permissions
- Final visual design tokens
- Exact keyboard shortcut map

When implementation reaches one of these boundaries, the agent should preserve the domain model in this document and request or consult a dedicated specification rather than introducing a conflicting architecture.

---

## 41. Final Architecture Summary

Showflow is built around a reusable production hierarchy:

```text
Studio
→ Show
→ Show Blueprint
→ Episode Storyboard
→ Segment lifecycle
→ Layout activation
→ Component Placement
→ Resource
```

The core responsibility split is:

- **Show Blueprint:** the recommended ordering for future Episodes.
- **Catalog:** the reusable vocabulary of the Show.
- **Episode Storyboard:** the editable ordering for one broadcast.
- **Segment:** what happens and how the production flows.
- **Layout:** what is composed on screen.
- **Slot:** where an element belongs.
- **Component:** what the element is and how it enters or exits.
- **Component Placement:** how a Component is used in one Layout.
- **Resource:** the actual content or input.
- **Host Cue:** an optional manual action during the Active phase.

This architecture must remain production-first, reusable, constrained, and understandable to creators who want to design and host a show without first becoming broadcast engineers.
