# Showflow
## Design System Specification
### Version 1.0 — Dark-First Production Workspace

**Document status:** Implementation-oriented first pass  
**Primary audience:** Codex coding agents, software engineers, product designers  
**Companion documents:**
- Showflow Architecture PRD v1.3
- Showflow MVP UX Specification v1.0
- Showflow Technical Specification v1.0

**Primary platform:** Desktop  
**Primary environment:** macOS on Apple Silicon  
**Primary theme:** Dark  
**Typeface:** Geist  
**Density:** Comfortable  
**Visual character:** Precise, modern, calm, production-focused

---

# 1. Purpose

This document defines the visual and interaction language of Showflow.

Showflow should combine:

- The precision and clarity of Linear
- The sequence and tactility of a storyboard
- The canvas focus of Lightroom
- The confidence and state awareness of a professional production console
- The measured organization of a blueprint

It should not look like:

- Gaming software
- A generic SaaS dashboard
- A general-purpose design tool
- A broadcast engineering console
- A whimsical creator app
- A skeuomorphic hardware simulator

The interface should feel like a modern production workspace built for creators who need to prepare, scan, rehearse, and run a show quickly.

---

# 2. Brand Expression

## 2.1 Design Statement

> Showflow is the quiet control room behind a great live production.

The interface should feel:

- Calm
- Precise
- Spacious
- Confident
- Professional
- Contemporary
- Readable at a glance

The interface should not feel:

- Dense
- Decorative
- Technical for its own sake
- Toy-like
- Loud
- Gamified
- Cinematically dramatic
- Visually restless

## 2.2 Core Visual Metaphors

### Blueprint

Blueprint does not mean a literal blue background or drafting-paper texture.

It means:

- Alignment
- Measurement
- Structure
- Clear relationships
- Intentional spacing
- Visible hierarchy
- Predictable geometry

### Storyboard

Storyboard means:

- Production objects appear as cards
- Sequence is visually obvious
- Rearrangement feels physical
- Thumbnails communicate the show at a glance
- The user understands where they are in the production

### Lightroom

Lightroom means:

- The canvas is visually dominant
- Supporting tools recede
- The user looks at the production, not the application
- Panels are calm, dark, and contextual

### Production Console

Production console means:

- Active, next, ready, warning, and failure states are unmistakable
- Controls are large enough to scan and operate quickly
- The interface answers:
  - What is active?
  - What comes next?
  - What needs attention?
- State is communicated without clutter

## 2.3 Product Personality

Showflow is:

- Serious, but not severe
- Creative, but not whimsical
- Technical underneath, but not technical in presentation
- Premium, but not luxurious
- Modern, but not trend-driven
- Minimal, but not empty

---

# 3. Design Principles

## 3.1 The Production Is the Hero

Every screen has one dominant object:

- Studio Home → Shows
- Show Detail → Create New Episode
- Design Show → Show Blueprint
- Produce Episode → Episode Storyboard
- Segment Editor → Audience canvas
- Layout Editor → Layout canvas
- Rehearsal → Current production output

Supporting tools must visually recede.

## 3.2 Large Enough to Scan

Showflow should be readable when the host is:

- Sitting back from the display
- Standing near a desk
- Looking between a camera and the screen
- Glancing quickly during rehearsal
- Operating under time pressure

Small text should be limited to secondary metadata.

## 3.3 Few Ideas Per Screen

A workspace should not expose every available feature at once.

Default to:

- One main object
- One contextual tool area
- One inspector
- One clear primary action

Avoid:

- Dense dashboards
- Multiple competing sidebars
- Deep accordion forests
- Toolbars full of unlabeled icons
- Persistent controls for rare actions

## 3.4 Cards for Production Objects, Panels for Tools

Use cards for:

- Shows
- Episodes
- Segments
- Layouts
- Resources
- Storyboard placements

Use panels for:

- Inspectors
- Catalog drawers
- Settings
- Validation
- Notes
- Tool controls

Cards represent things the producer creates and arranges.

Panels represent tools used to inspect or modify those things.

## 3.5 Gold Means Attention

The brand accent is not decorative.

Gold indicates:

- Selection
- Current state
- Primary focus
- Active production object
- Important focus ring
- Progress through the production

Gold should be rare enough that it always matters.

## 3.6 Dark by Default

The MVP is dark-first and may be dark-only.

Dark screens reduce unnecessary light during showtime and help the audience canvas remain visually dominant.

## 3.7 Motion Explains Relationships

Motion should communicate:

- Where an object came from
- Where it moved
- What became active
- What changed scope
- What is entering or leaving

Motion should not exist only to delight.

## 3.8 Precision Without Fragility

The interface should appear exact and carefully aligned without becoming difficult to use.

Use:

- Large hit areas
- Forgiving drag targets
- Snap guides
- Clear selected states
- Undo
- Visible focus

Do not force pixel-perfect interaction for common tasks.

---

# 4. Theme Strategy

## 4.1 MVP Theme

The MVP uses one primary theme:

```text
Showflow Dark
```

A light theme is not required for the first release.

## 4.2 Dark Theme Goals

- Reduce emitted light
- Preserve excellent text contrast
- Avoid pure black across large surfaces
- Keep canvas media visually distinct
- Allow state colors to remain legible
- Avoid the gray-on-gray ambiguity common in dark creative software

## 4.3 Future Themes

**OPEN DESIGN SPECIFICATION — Light Theme**

A light theme may be added for planning and daylight editing, but it has not been designed.

Codex should centralize theme tokens but should not invent a full light palette.

---

# 5. Color System

The following values are the initial canonical MVP tokens.

They may be refined during visual QA, but components must consume semantic tokens rather than hardcoded colors.

## 5.1 Neutral Surfaces

| Token | Value | Use |
|---|---:|---|
| `--sf-bg-canvas` | `#0D0F10` | Application background and deepest workspace chrome |
| `--sf-bg-base` | `#111315` | Primary page background |
| `--sf-bg-panel` | `#171A1D` | Sidebars, inspectors, notes panels |
| `--sf-bg-card` | `#1B1F22` | Cards and raised content objects |
| `--sf-bg-card-hover` | `#21262A` | Hovered cards |
| `--sf-bg-elevated` | `#252B30` | Menus, dialogs, elevated overlays |
| `--sf-bg-input` | `#131619` | Inputs and editable fields |
| `--sf-bg-scrim` | `rgba(0, 0, 0, 0.62)` | Modal backdrop |

Avoid pure black except for media letterboxing or intentional preview framing.

## 5.2 Borders and Dividers

| Token | Value | Use |
|---|---:|---|
| `--sf-border-subtle` | `rgba(255,255,255,0.06)` | Quiet separation |
| `--sf-border-default` | `rgba(255,255,255,0.10)` | Standard component borders |
| `--sf-border-strong` | `rgba(255,255,255,0.18)` | Active structure and emphasized boundaries |
| `--sf-divider` | `rgba(255,255,255,0.08)` | Section dividers |
| `--sf-grid-line` | `rgba(255,255,255,0.045)` | Blueprint-style guides |

Borders should be preferred over heavy shadows.

## 5.3 Text

| Token | Value | Use |
|---|---:|---|
| `--sf-text-primary` | `#F4F3EF` | Main headings and important content |
| `--sf-text-secondary` | `#B9BDC1` | Supporting text |
| `--sf-text-tertiary` | `#81878D` | Metadata and placeholders |
| `--sf-text-disabled` | `#5F656B` | Disabled controls |
| `--sf-text-inverse` | `#111315` | Text on light or gold surfaces |

The primary text is slightly warm rather than blue-white.

## 5.4 Brand Accent

| Token | Value | Use |
|---|---:|---|
| `--sf-accent` | `#D6B24A` | Selection, active state, primary focus |
| `--sf-accent-hover` | `#E1C15E` | Hover on accent surfaces |
| `--sf-accent-pressed` | `#C49D36` | Pressed accent |
| `--sf-accent-muted` | `rgba(214,178,74,0.14)` | Selected card fill |
| `--sf-accent-border` | `rgba(214,178,74,0.62)` | Selected border |
| `--sf-accent-focus` | `rgba(214,178,74,0.38)` | Focus ring |

Gold should not be used for generic decoration.

## 5.5 Semantic Colors

| Meaning | Primary | Muted background |
|---|---:|---:|
| Success / Ready | `#62B589` | `rgba(98,181,137,0.14)` |
| Warning | `#D9A441` | `rgba(217,164,65,0.14)` |
| Error / Blocking | `#D96A6A` | `rgba(217,106,106,0.14)` |
| Information | `#6F9FD8` | `rgba(111,159,216,0.14)` |
| Inactive | `#72787E` | `rgba(114,120,126,0.12)` |

Semantic colors must always be paired with:

- Text
- Icon
- Shape
- Label
- Or another non-color indicator

## 5.6 Production State Colors

Use the following hierarchy:

- Current / Selected → Gold
- Ready → Green
- Needs attention → Amber
- Blocking → Red
- Informational → Blue
- Inactive / Archived → Gray

Do not use green as the general brand accent.

## 5.7 Color Usage Limits

On a typical screen:

- One primary accent state
- One semantic warning or error group if needed
- Mostly neutral surfaces
- No decorative rainbow palettes

Avoid:

- Gradients as primary surfaces
- Neon colors
- Highly saturated gaming colors
- Color-coded categories without labels
- Gold-filled large backgrounds

---

# 6. Typography

## 6.1 Typeface

Use **Geist Sans** throughout the interface.

Use **Geist Mono** only where a monospaced style is semantically helpful:

- Timecode
- Duration
- Technical identifiers in developer tools
- Numeric measurements in the Layout inspector
- Shortcut labels

Do not use a secondary display font.

## 6.2 Weight Scale

Use:

- 400 — Regular
- 500 — Medium
- 600 — Semibold
- 700 — Bold, used sparingly

Avoid ultra-light weights on dark backgrounds.

## 6.3 Type Scale

| Token | Size / Line Height | Weight | Use |
|---|---:|---:|---|
| `display-xl` | 48 / 56 | 600 | Major empty states and rare product-level hero text |
| `display-lg` | 40 / 48 | 600 | Studio or Show hero heading |
| `heading-xl` | 32 / 40 | 600 | Workspace title |
| `heading-lg` | 28 / 36 | 600 | Major section title |
| `heading-md` | 24 / 32 | 600 | Panel or editor section title |
| `heading-sm` | 20 / 28 | 600 | Card title and primary control label |
| `body-lg` | 18 / 28 | 400 | Host-facing content and important instructions |
| `body-md` | 16 / 24 | 400 | Default body and form text |
| `body-sm` | 14 / 20 | 400 | Secondary metadata |
| `label-md` | 14 / 20 | 500 | Field labels and tabs |
| `label-sm` | 12 / 16 | 600 | Small uppercase metadata, used sparingly |
| `timecode` | 16 / 20 | 500 mono | Runtime and duration |

## 6.4 Minimum Sizes

- Primary operational controls: 16 px minimum
- Host Cue controls: 18 px minimum
- Storyboard card title: 18–20 px
- Inspector field values: 16 px
- Metadata: 14 px
- Labels smaller than 12 px are prohibited

## 6.5 Text Hierarchy

A screen should use no more than four visible levels of hierarchy at once.

Example:

1. Workspace title
2. Section title
3. Card title
4. Metadata

## 6.6 Capitalization

Use sentence case for:

- Buttons
- Menus
- Headings
- Field labels
- Empty-state copy

Use uppercase only for:

- Very small status labels
- Timecode
- Technical measurement abbreviations
- Rare production state tags

Do not use all caps for large headings.

## 6.7 Numbers

Use tabular numerals for:

- Time
- Duration
- Episode numbers
- Counts
- Measurements
- Progress

---

# 7. Spacing and Density

## 7.1 Density

The default and only MVP density is:

```text
Comfortable
```

Do not add a compact mode until the main workflows are validated.

## 7.2 Base Spacing Unit

Use a 4 px base grid.

Canonical spacing tokens:

| Token | Value |
|---|---:|
| `space-1` | 4 px |
| `space-2` | 8 px |
| `space-3` | 12 px |
| `space-4` | 16 px |
| `space-5` | 20 px |
| `space-6` | 24 px |
| `space-8` | 32 px |
| `space-10` | 40 px |
| `space-12` | 48 px |
| `space-16` | 64 px |
| `space-20` | 80 px |

## 7.3 Default Component Padding

- Small control: 8 × 12 px
- Standard control: 12 × 16 px
- Large button: 14 × 20 px
- Card body: 20–24 px
- Main panel: 24–32 px
- Workspace outer padding: 32–48 px

## 7.4 Content Width

Avoid stretching text across very wide panels.

Recommended text measure:

- 55–75 characters for body copy
- 36–56 characters for instructional empty states

## 7.5 Screen Complexity Rule

A standard desktop workspace should expose no more than:

- One main canvas or Storyboard
- One left support surface
- One right inspector
- One bottom notes surface

Only one support surface should demand attention at a time.

---

# 8. Layout and Grid

## 8.1 Desktop Shell

Recommended dimensions:

- Top application bar: 64 px
- Compact secondary toolbar: 48–56 px
- Left rail: 72 px when icon-only
- Left Catalog panel: 280–320 px
- Right inspector: 320–360 px
- Notes panel: 180–260 px height
- Minimum comfortable application width: 1280 px

## 8.2 Main Workspace

The central production object should receive approximately 65–80% of visual attention.

Panels should feel attached to the workspace, not like independent floating windows.

## 8.3 Blueprint Grid Language

Use subtle drafting cues:

- Thin alignment guides
- Measured spacing
- Crosshair or anchor indicators in editing contexts
- Faint grid lines only when useful
- Numeric dimensions in inspectors
- Consistent baseline alignment

Do not use:

- Blueprint paper texture
- Cyan-on-blue coloring
- Decorative graph paper
- Faux technical labels everywhere

## 8.4 Responsive Desktop Behavior

At narrower widths:

1. Collapse Catalog to a drawer.
2. Allow inspector to close.
3. Preserve the central canvas.
4. Reduce Storyboard columns.
5. Keep the current scope and primary action visible.

---

# 9. Shape Language

## 9.1 Corner Radius

| Token | Value | Use |
|---|---:|---|
| `radius-sm` | 6 px | Small chips, focusable metadata |
| `radius-md` | 8 px | Inputs and compact controls |
| `radius-lg` | 12 px | Cards and panels |
| `radius-xl` | 16 px | Dialogs and major elevated surfaces |
| `radius-round` | 999 px | Status dots and pills only |

Use moderate radii.

Avoid:

- Pill-shaped primary buttons
- Excessively rounded cards
- Sharp industrial corners everywhere

## 9.2 Borders

Standard components use 1 px borders.

Selected production objects may use:

- 1 px accent border
- Subtle accent background
- Small leading indicator
- Focus ring when keyboard-focused

Avoid thick colored outlines except in emergency or showtime states.

## 9.3 Shadows

Dark UI should use shadows sparingly.

Recommended:

```text
elevation-1:
0 1px 2px rgba(0,0,0,0.24)

elevation-2:
0 8px 24px rgba(0,0,0,0.28)

elevation-3:
0 20px 48px rgba(0,0,0,0.38)
```

Use:

- Border and surface contrast for cards
- Shadows for menus, dialogs, and temporary overlays

---

# 10. Iconography

## 10.1 Style

Use one consistent icon family with:

- Simple outlined geometry
- 1.5–2 px stroke
- Rounded joins
- Clear silhouettes
- Minimal internal detail

## 10.2 Sizes

- 16 px — Metadata and compact controls
- 20 px — Standard controls
- 24 px — Primary toolbar actions
- 28–32 px — Empty states or large production controls

## 10.3 Labels

Icon-only controls are acceptable only when:

- The meaning is universally understood
- A tooltip exists
- An accessible label exists
- The control is not the primary action

Primary actions should include text.

## 10.4 Prohibited Icon Use

Avoid:

- Decorative icons beside every label
- Multiple icon styles
- Filled and outlined icons mixed arbitrarily
- Gaming or broadcast-hardware metaphors when simpler symbols exist

**OPEN DESIGN SPECIFICATION — Exact Icon Library**

The visual style is specified, but the exact icon package has not been formally selected.

---

# 11. Buttons

## 11.1 Sizes

| Size | Height | Horizontal Padding | Text |
|---|---:|---:|---:|
| Small | 36 px | 12 px | 14 px |
| Standard | 44 px | 16 px | 16 px |
| Large | 52 px | 20 px | 18 px |
| Showtime | 56–64 px | 24 px | 18–20 px |

Primary production actions should use Standard or Large.

## 11.2 Variants

### Primary

Use for one main action per screen.

- Accent background
- Dark inverse text
- Strong hover and pressed states

Examples:

- Create New Episode
- Add First Segment
- Start Rehearsal

### Secondary

Use for important supporting actions.

- Neutral raised surface
- Default border
- Primary text

### Ghost

Use for low-emphasis toolbar actions.

- Transparent background
- Subtle hover fill

### Destructive

- Red-muted background or border
- Red text/icon
- Never visually compete with the primary action until confirmation is needed

### Production Toggle

Use for host-facing active controls.

Must clearly communicate:

- Available
- Hover
- Pressed
- Active
- Disabled

## 11.3 Button Rules

- One filled Primary button per immediate context
- Avoid rows of equal-emphasis buttons
- Use verbs
- Keep labels short and specific
- Do not use novelty language
- Do not use icon-only buttons for critical production actions

---

# 12. Inputs and Form Controls

## 12.1 Input Height

Standard input height:

```text
44 px
```

Large content input:

```text
48–52 px
```

## 12.2 Field Anatomy

Each field may include:

- Label
- Input
- Optional help text
- Validation state
- Optional source or scope indicator

## 12.3 Input States

- Default
- Hover
- Focused
- Filled
- Disabled
- Warning
- Error
- Read-only
- Inherited
- Overridden

## 12.4 Focus

Use:

- Accent border
- 2 px outer focus ring
- No glow-heavy neon effect

## 12.5 Inheritance and Override Styling

Reusable versus Episode-specific values should be visually clear.

Recommended:

- `Show default` label for inherited values
- Accent marker for local override
- `Reset to Show default` action
- Read-only source description where useful

## 12.6 Selects and Pickers

Resource, Segment, and Layout pickers should prioritize:

- Search
- Thumbnail
- Name
- Scope
- Usage or status

Avoid long plain dropdowns for visual production objects.

---

# 13. Cards

## 13.1 Card Principle

Cards represent production objects.

They should feel tangible, ordered, and easy to scan.

## 13.2 Card Anatomy

A standard object card may contain:

- Visual preview
- Primary name
- Short contextual summary
- One or two metadata items
- State indicator
- Overflow menu

Do not overload cards with every available property.

## 13.3 Card States

- Default
- Hover
- Selected
- Keyboard focused
- Dragging
- Disabled
- Invalid
- Archived
- Current

## 13.4 Selected Card

Selected card uses:

- Accent border
- Very subtle accent-muted fill
- Optional leading accent bar
- No dramatic glow

## 13.5 Dragging Card

Dragging uses:

- Elevated shadow
- Slight scale increase, maximum 1.02
- Clear insertion indicator
- Reduced opacity at original position

## 13.6 Card Menus

Overflow actions should remain hidden until hover, selection, or keyboard focus where possible.

---

# 14. Storyboard Cards

Storyboard cards are a signature Showflow component.

## 14.1 Purpose

A Storyboard card must answer quickly:

- What Segment is this?
- What will the audience see?
- What content is specific to this Episode?
- Is it ready?
- How long is it expected to last?

## 14.2 Recommended Anatomy

```text
┌────────────────────────────────┐
│                                │
│       16:9 visual preview      │
│                                │
├────────────────────────────────┤
│ Segment title                  │
│ Episode-specific summary       │
│                                │
│ 01:30              Ready       │
└────────────────────────────────┘
```

## 14.3 Dimensions

Recommended medium desktop card:

- Width: 300–360 px
- Preview ratio: 16:9
- Metadata region: 88–112 px
- Total radius: 12 px

## 14.4 Typography

- Segment title: 18–20 px semibold
- Summary: 14–16 px
- Duration: 14–16 px tabular
- Status: 12–14 px medium

## 14.5 Status

Display state through:

- Small labeled badge
- Icon
- Optional card border indicator

Do not cover the thumbnail with large state overlays unless blocking.

## 14.6 Sequence Indicators

The Storyboard may display:

- Position number
- Connecting line
- Insertion marker
- Current Segment indicator during rehearsal

Sequence styling should remain subtle during editing and become clearer during rehearsal.

## 14.7 Current Segment

During rehearsal:

- Gold border
- `Current` label
- Stronger elevation
- Optional progress indicator

Next Segment:

- Neutral highlighted border
- `Next` label
- Lower emphasis than Current

---

# 15. Panels and Inspectors

## 15.1 Panel Principle

Panels are tools, not destinations.

They should be visually quieter than the content they support.

## 15.2 Panel Anatomy

- Optional title
- Optional close or collapse control
- Grouped sections
- Consistent 24 px internal padding
- Subtle dividers
- Sticky header only when necessary

## 15.3 Inspector Width

Recommended:

```text
320–360 px
```

Do not reduce below 288 px in normal desktop use.

## 15.4 Inspector Sections

Use clear section titles and spacing.

Avoid more than two levels of nested disclosure.

Preferred:

```text
Layout
Component
Content
Animation
Validation
```

Avoid one accordion for every individual field.

## 15.5 Left Tool Panels

Catalog and Component panels may be slightly wider than inspectors to support thumbnails:

```text
280–340 px
```

---

# 16. Canvas and Preview Frame

## 16.1 Canvas Principle

The canvas is the most visually important object in Segment and Layout editing.

## 16.2 Canvas Surround

Use:

- Deepest neutral background
- Generous outer padding
- No distracting decoration
- Centered presentation
- Clear but restrained frame edge

## 16.3 Audience Frame

The audience frame should:

- Preserve target aspect ratio
- Use pure or near-pure black letterboxing where needed
- Hide all editor chrome in Preview
- Display subtle frame label outside the content area

## 16.4 Edit Mode

Edit mode may show:

- Slot outlines
- Safe-area guides
- Alignment guides
- Selection handles
- Slot labels
- Measurement readouts

Use gold only for active selection.

Use neutral or blue-gray for passive guides.

## 16.5 Canvas Toolbar

Keep short:

- Zoom
- Fit
- Safe areas
- Preview
- Aspect ratio label

Do not expose unrelated settings in the canvas toolbar.

---

# 17. Blueprint and Drafting Details

## 17.1 Grid

Blueprint-style grids are contextual, not global.

Use them in:

- Layout editor
- Alignment mode
- Measurement surfaces
- Empty Blueprint illustration

Do not cover Storyboard cards or general pages with grids.

## 17.2 Measurements

Use Geist Mono and tabular numerals for:

- X / Y
- Width / height
- Duration
- Position
- Aspect ratio
- Safe-area percentages

## 17.3 Guides

Guides should be:

- Thin
- Low contrast
- Temporary
- Snapping-aware
- Hidden in Preview and Rehearsal

## 17.4 Technical Restraint

Blueprint cues should suggest precision without making the interface feel like CAD software.

---

# 18. Navigation

## 18.1 Top Bar

Recommended height:

```text
64 px
```

Contains:

- Studio switcher
- Breadcrumb or Back
- Workspace title
- Save state
- Undo / redo
- Primary action
- More menu

## 18.2 Breadcrumbs

Use short production paths:

```text
Top 10 Music Videos / Design Show
```

or:

```text
Top 10 Music Videos / Week 32 / Ranking Reveal
```

Avoid deep technical paths.

## 18.3 Tabs

Tabs use:

- 44–48 px height
- Medium-weight labels
- Accent underline or selected surface
- No pill-tab treatment for primary workspace navigation

## 18.4 Scope Banner

Show and Episode editing should include a persistent but quiet scope line.

Examples:

```text
Changes become the default for future Episodes.
```

```text
Changes apply only to this Episode.
```

Use secondary text and optional scope icon.

Do not make scope a warning unless the action is risky.

---

# 19. Status and Validation

## 19.1 Status Badges

Badges should be compact but readable.

Recommended minimum height:

```text
24 px
```

Use:

- Label
- Optional icon
- Muted semantic background
- Semantic foreground

## 19.2 Readiness

Canonical readiness labels:

- Ready
- Needs content
- Has warnings
- Blocking issue

Avoid vague labels such as:

- Incomplete
- Invalid
- Error state

unless technically necessary.

## 19.3 Validation Panels

Validation should show:

- Plain-language issue
- Affected object
- Severity
- Action to resolve
- Direct navigation when possible

## 19.4 Errors

Error presentation should be calm and actionable.

Avoid:

- Full-screen red states for recoverable issues
- Alarming animation
- Repeated toasts
- Raw stack traces in production UI

---

# 20. Menus, Dialogs, and Drawers

## 20.1 Menus

- 40–44 px row height
- 14–16 px text
- Clear grouping
- Destructive items separated
- Shortcut shown at right when available

## 20.2 Dialogs

Recommended widths:

- Small confirmation: 400–480 px
- Standard form: 520–640 px
- Visual picker: 720–960 px

Use dialogs only when the user must make a decision before continuing.

## 20.3 Drawers

Use drawers for:

- Catalog pickers
- Resource browsers
- Contextual selection

Drawers should preserve the underlying Storyboard or canvas.

## 20.4 Modality Rule

Prefer:

1. Inline editing
2. Side panel
3. Drawer
4. Dialog

in that order.

Avoid modal workflows for routine production tasks.

---

# 21. Notes and Host-Facing Text

## 21.1 Notes Panel

Notes should feel like a production notebook.

Use:

- Large body text
- Comfortable line height
- Minimal formatting chrome
- Clear scroll position
- Optional section prompts

## 21.2 Default Notes Typography

- 18 px
- 28 px line height
- Maximum readable width
- High contrast
- No tiny editor toolbar

## 21.3 Rehearsal Notes

During rehearsal:

- 20 px minimum
- Strong contrast
- Current note position preserved
- Controls remain visually separate

## 21.4 Teleprompter

**OPEN DESIGN SPECIFICATION — Teleprompter Mode**

A dedicated teleprompter presentation, scrolling behavior, and remote synchronization have not been designed.

Do not invent a teleprompter UI in the MVP.

---

# 22. Host Cues and Showtime Controls

## 22.1 Cue Buttons

Host Cue controls should be:

- Large
- Labeled
- High contrast
- Easy to distinguish
- Safe against accidental activation

Recommended:

- 56 px minimum height
- 18 px label
- Optional icon
- Secondary action summary
- Clear active indicator

## 22.2 Cue States

- Ready
- Hover
- Pressed
- Active
- Completing
- Disabled
- Failed

Timed Cues may display:

- Remaining time
- Progress ring or bar
- Dismiss action

## 22.3 Showtime Emphasis

During rehearsal or future Show Mode:

- Increase type and target sizes
- Reduce editing chrome
- Emphasize Current, Next, Notes, and Cues
- Hide secondary configuration

## 22.4 Accidental Activation

**OPEN DESIGN SPECIFICATION — Safety Controls**

Confirmation, hold-to-trigger, or double-action behavior for destructive or high-risk Cues has not been specified.

MVP Cues should be reversible or non-destructive where possible.

---

# 23. Empty States

## 23.1 Structure

An empty state contains:

- Clear heading
- One short explanation
- One primary action
- Optional secondary text link

## 23.2 Tone

Direct and professional.

Example:

```text
Design your Show's default Storyboard

Add reusable Segments in the order they usually occur. Every new Episode will begin here.

[Add First Segment]
```

## 23.3 Illustration

Use:

- Minimal geometric diagrams
- Storyboard outlines
- Subtle blueprint lines
- Neutral monochrome
- One restrained accent detail

Avoid whimsical mascots and cartoons.

**OPEN DESIGN SPECIFICATION — Illustration Style**

The exact illustration system has not been designed.

---

# 24. Motion

## 24.1 Motion Personality

Motion should be:

- Fast
- Controlled
- Precise
- Spatially meaningful
- Quiet

## 24.2 Duration Tokens

| Token | Duration | Use |
|---|---:|---|
| `motion-instant` | 80 ms | Press feedback |
| `motion-fast` | 140 ms | Hover and small state change |
| `motion-standard` | 220 ms | Panels, menus, selection |
| `motion-slow` | 320 ms | Card expansion and workspace transition |
| `motion-emphasis` | 420 ms | Rare major spatial transition |

## 24.3 Easing

Recommended:

```text
standard: cubic-bezier(0.2, 0, 0, 1)
enter: cubic-bezier(0, 0, 0.2, 1)
exit: cubic-bezier(0.4, 0, 1, 1)
```

Avoid excessive spring motion.

## 24.4 Signature Transition

Storyboard card → Segment editor:

- Card elevates
- Surrounding content recedes
- Card expands toward canvas position
- Editor chrome resolves around it
- Back reverses the relationship

This transition is a brand-level motion pattern, but functional navigation must work without it.

## 24.5 Reduced Motion

When reduced motion is enabled:

- Replace spatial transforms with fade or instant transition
- Preserve focus and context
- Do not break lifecycle completion logic

---

# 25. Accessibility

## 25.1 Contrast

Meet WCAG AA minimum contrast.

Prefer higher contrast for:

- Host notes
- Cue labels
- Current Segment
- Validation
- Main headings

## 25.2 Focus

All interactive elements require visible focus.

Use:

- 2 px accent focus ring
- 2 px offset when needed
- Never remove focus outline without replacement

## 25.3 Hit Targets

Minimum target:

```text
44 × 44 px
```

Showtime controls:

```text
52 × 52 px or larger
```

## 25.4 Non-Color Communication

Selection, status, and validation require a second indicator.

## 25.5 Keyboard

All drag operations need menu or keyboard alternatives.

## 25.6 Screen Readers

Use semantic:

- Buttons
- Headings
- Lists
- Tabs
- Dialogs
- Status regions

Storyboard order should be represented as an ordered list.

---

# 26. Component Inventory

The initial design system should provide these foundational components:

## 26.1 Foundations

- App shell
- Top bar
- Breadcrumb
- Page title
- Scope label
- Divider
- Scroll area
- Split panel
- Resizable panel

## 26.2 Actions

- Button
- Icon button
- Split button
- Production toggle
- Cue button
- Menu item

## 26.3 Inputs

- Text input
- Text area
- Number input
- Select
- Search field
- Checkbox
- Radio group
- Toggle
- Segmented control
- Resource picker
- Object picker

## 26.4 Navigation

- Tabs
- Side rail
- Breadcrumb
- Back button
- Step control
- Pagination only where necessary

## 26.5 Content

- Show card
- Episode card
- Storyboard card
- Segment Catalog card
- Layout card
- Resource card
- Component tile
- Metadata row
- Empty state

## 26.6 Feedback

- Status badge
- Validation badge
- Inline error
- Toast
- Progress bar
- Spinner
- Skeleton
- Save-state indicator

## 26.7 Overlays

- Tooltip
- Popover
- Menu
- Dialog
- Drawer
- Confirmation dialog

## 26.8 Editing

- Inspector section
- Property row
- Binding field
- Override indicator
- Canvas toolbar
- Slot selection
- Resize handle
- Guide
- Notes panel
- Lifecycle step control
- Cue row

---

# 27. Design Tokens

Tokens must be centralized and consumed semantically.

Recommended CSS structure:

```css
:root {
  /* Color */
  --sf-bg-canvas: #0d0f10;
  --sf-bg-base: #111315;
  --sf-bg-panel: #171a1d;
  --sf-bg-card: #1b1f22;
  --sf-bg-card-hover: #21262a;
  --sf-bg-elevated: #252b30;
  --sf-bg-input: #131619;

  --sf-text-primary: #f4f3ef;
  --sf-text-secondary: #b9bdc1;
  --sf-text-tertiary: #81878d;
  --sf-text-disabled: #5f656b;

  --sf-border-subtle: rgba(255, 255, 255, 0.06);
  --sf-border-default: rgba(255, 255, 255, 0.10);
  --sf-border-strong: rgba(255, 255, 255, 0.18);

  --sf-accent: #d6b24a;
  --sf-accent-hover: #e1c15e;
  --sf-accent-pressed: #c49d36;
  --sf-accent-muted: rgba(214, 178, 74, 0.14);
  --sf-accent-border: rgba(214, 178, 74, 0.62);

  --sf-success: #62b589;
  --sf-warning: #d9a441;
  --sf-error: #d96a6a;
  --sf-info: #6f9fd8;

  /* Typography */
  --sf-font-sans: "Geist", system-ui, sans-serif;
  --sf-font-mono: "Geist Mono", ui-monospace, monospace;

  /* Radius */
  --sf-radius-sm: 6px;
  --sf-radius-md: 8px;
  --sf-radius-lg: 12px;
  --sf-radius-xl: 16px;

  /* Spacing */
  --sf-space-1: 4px;
  --sf-space-2: 8px;
  --sf-space-3: 12px;
  --sf-space-4: 16px;
  --sf-space-5: 20px;
  --sf-space-6: 24px;
  --sf-space-8: 32px;
  --sf-space-10: 40px;
  --sf-space-12: 48px;
  --sf-space-16: 64px;

  /* Motion */
  --sf-motion-fast: 140ms;
  --sf-motion-standard: 220ms;
  --sf-motion-slow: 320ms;
  --sf-ease-standard: cubic-bezier(0.2, 0, 0, 1);
}
```

## 27.1 Token Naming

Tokens should describe semantic purpose rather than literal appearance.

Prefer:

```text
--sf-text-secondary
```

over:

```text
--gray-400
```

Primitive palette tokens may exist internally, but application components should use semantic tokens.

---

# 28. Content and Voice

## 28.1 Voice

Showflow copy should be:

- Clear
- Calm
- Direct
- Production-aware
- Nonjudgmental
- Brief

## 28.2 Buttons

Use explicit verbs:

- Create Episode
- Add Segment
- Choose Layout
- Start Rehearsal
- Replace Resource
- Return to Storyboard

Avoid:

- Continue
- Submit
- Execute
- Configure
- Proceed

when a more specific production verb exists.

## 28.3 Error Copy

Prefer:

```text
The Ranking Reveal Segment needs album artwork.
```

Avoid:

```text
Required binding is unresolved.
```

## 28.4 Empty Copy

Explain the production benefit, not just the data structure.

---

# 29. Prohibited Visual Patterns

Do not use:

- Glassmorphism
- Neumorphism
- Gamer RGB
- Neon glow
- Decorative gradients
- Faux hardware knobs
- Fake LED panels
- Heavy skeuomorphism
- Excessive pill shapes
- Dense data tables as primary production views
- Tiny 12 px body copy
- Icon-only primary actions
- Floating tool windows
- Multiple saturated accents
- Blue blueprint paper
- Whimsical mascots
- Decorative animation
- Generic admin-dashboard layouts

---

# 30. Open Design Specification Register

These areas are not fully specified.

| Area | Current MVP handling |
|---|---|
| Final logo and wordmark | Use text wordmark placeholder |
| Exact gold calibration against brand assets | Use provisional accent tokens |
| Light theme | Dark only |
| Exact icon library | Follow specified outlined style |
| Illustration system | Minimal geometric placeholders |
| Full Brand Kit editor | Basic structure only |
| Typography controls inside Components | Restrained presets |
| Custom Component visual authoring | Built-in templates only |
| Teleprompter Mode | Deferred |
| Showtime safety patterns | Reversible actions only |
| Mobile and tablet design system | Deferred |
| Full responsive behavior below desktop | Basic panel collapse |
| Data visualization system | Not required for MVP |
| Final motion prototypes | Use duration/easing tokens |
| Sound design and haptics | Deferred |
| Public marketing-site alignment | Product UI takes priority |
| Theme customization by Studio | Deferred |
| Density modes | Comfortable only |

Codex must not silently create permanent patterns for these areas.

---

# 31. Codex Implementation Rules

1. Use Geist throughout.
2. Use the dark theme as the canonical MVP theme.
3. Centralize all design tokens.
4. Do not hardcode colors, spacing, or radii inside feature components.
5. Keep type larger than a conventional desktop productivity app.
6. Use cards for production objects and panels for tools.
7. Keep the Storyboard or canvas visually dominant.
8. Use gold only for selection, current state, primary focus, and key progress.
9. Use semantic colors only for semantic meaning.
10. Do not use color as the only status indicator.
11. Use one clear Primary action in each context.
12. Avoid dense toolbars and unlabeled icon rows.
13. Preserve comfortable spacing.
14. Prefer borders and surface contrast over heavy shadows.
15. Do not introduce gradients, glass, neon, or gamer styling.
16. Keep motion short, spatial, and functional.
17. Respect reduced-motion settings.
18. Build accessible keyboard and focus states with each component.
19. Treat temporary visual decisions as tokens, not one-off values.
20. When an area is marked Open, create a minimal neutral implementation and document it.

---

# 32. Design Acceptance Criteria

The design system is successfully applied when:

1. The interface is readable from farther away than a typical productivity app.
2. The current production object is obvious within one glance.
3. No standard workspace feels like a dense dashboard.
4. The Storyboard reads as an ordered visual production.
5. The canvas dominates Segment and Layout editing.
6. Tools recede into quiet dark panels.
7. Gold appears rarely and always communicates importance.
8. Ready, warning, and blocking states are instantly distinguishable.
9. Buttons and Cue controls are large enough for quick operation.
10. A user can identify whether they are editing the Show or Episode scope.
11. Cards feel like tangible production objects.
12. Panels feel like precise tools.
13. Layout editing evokes blueprint precision without looking like CAD.
14. Preview evokes Lightroom-style visual focus.
15. Rehearsal evokes production-console confidence without hardware skeuomorphism.
16. The UI feels precise and modern rather than whimsical or technical.
17. All core controls are keyboard accessible.
18. Reduced-motion users retain context and functionality.
19. No feature component invents its own color, radius, or type hierarchy.
20. The visual system remains coherent across macOS, Windows, and Linux.

---

# 33. Final Design Summary

Showflow's visual system is built from four complementary ideas:

```text
Blueprint
→ precision and structure

Storyboard
→ sequence and tangible production objects

Lightroom
→ visual focus and quiet supporting tools

Production console
→ state awareness and operational confidence
```

The resulting interface should feel:

```text
Dark
Spacious
Large
Precise
Calm
Readable
Production-first
```

Its signature visual language is:

- Warm charcoal surfaces
- Warm white typography
- Restrained gold attention states
- Geist at a large, comfortable scale
- Storyboard cards as primary production objects
- Quiet panels as supporting tools
- A canvas that always receives visual priority
- Motion that preserves spatial relationships

Showflow should make a creator feel prepared and in control before the show begins.
