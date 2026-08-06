# `@showflow/ui`

Showflow's shared renderer foundation. Import the dark design tokens once at the
renderer entry point, then import components from the package root.

```tsx
import { Button, EmptyState, TextInput } from "@showflow/ui";
import "@showflow/ui/tokens.css";
```

Feature code must use the exported `Icon` and `IconName` adapter instead of
importing Lucide directly. This keeps icon names, sizes, stroke weight, and
accessibility behavior consistent.

## Foundational components

| Component            | Contract                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| `Button`             | Primary, secondary, ghost, and destructive variants; small, standard, and large sizes.         |
| `IconButton`         | Requires an accessible `label` and pointer/focus `tooltip`; never a primary action.            |
| `TextInput`          | Labelled 44 px field with optional help text, required state, and actionable error copy.       |
| `TextArea`           | Labelled multiline field with the same help and validation contract as `TextInput`.            |
| `Select`             | Labelled native select for short textual option lists; visual production pickers use a drawer. |
| `Checkbox`           | Native checkbox with a 44 px labelled target.                                                  |
| `Toggle`             | Button-backed ARIA switch with controlled checked state.                                       |
| `Tabs`               | Radix-backed workspace tabs with arrow-key navigation and a selected underline.                |
| `Badge`              | Compact labelled status with optional icon and neutral, accent, or semantic tone.              |
| `Tooltip`            | Radix-backed contextual label shown from pointer or keyboard focus.                            |
| `Menu`               | Radix-backed action menu; use `MenuItem` and `MenuSeparator` for its contents.                 |
| `Dialog`             | Blocking decision surface with title, description, focus trap, Escape close, and restoration.  |
| `Drawer`             | Side overlay for catalogs and contextual selection with the same keyboard contract as Dialog.  |
| `Panel`              | Quiet supporting surface with optional heading and actions.                                    |
| `Divider`            | Semantic horizontal or vertical separator.                                                     |
| `Skeleton`           | Labelled loading placeholder; animation stops under reduced motion.                            |
| `EmptyState`         | Heading, short explanation, one required primary action, and optional secondary action.        |
| `SaveStateIndicator` | Polite live status for `saving`, `saved`, `unsaved`, and `error` states.                       |

## Examples

```tsx
<TextInput
  error={nameError}
  label="Segment name"
  onChange={(event) => setName(event.currentTarget.value)}
  value={name}
/>

<EmptyState
  action={<Button variant="primary">Add First Segment</Button>}
  description="Add reusable Segments in the order they usually occur."
  heading="Design your Show's default Storyboard"
  icon="plus"
/>
```

## Production object primitives

| Component          | Contract                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `ObjectCard`       | Production-object anatomy with preview, title, summary, metadata, status, actions, and card state. |
| `StoryboardCard`   | 16:9 Segment card with placement, duration, reuse, issue count, readiness, and Current/Next state. |
| `StatusBadge`      | Restricts readiness copy to Ready, Needs content, Has warnings, or Blocking issue.                 |
| `ScopeLabel`       | Persistent canonical scope copy for Show, Episode, Show Segment, and Episode Segment editing.      |
| `InspectorSection` | Quiet, labelled grouping for related inspector properties without unnecessary disclosure.          |
| `PropertyRow`      | Property label, description, control, source, limited Episode override, and reset action.          |
| `NotesPanel`       | Controlled plain-text production notebook with 18/28 typography and optional prompt/actions.       |
| `ValidationItem`   | Plain-language warning or blocking issue with affected object and direct resolution action.        |

```tsx
<StoryboardCard
  duration="01:30"
  issueCount={1}
  preview={<SegmentPreview />}
  readiness="needs-content"
  sequenceNumber={3}
  summary='Guest: Jane Doe'
  title="Interview"
/>

<ScopeLabel scope="episode" />

<ValidationItem
  action={<Button size="small">Add artwork</Button>}
  affectedObject="Ranking Reveal · Album artwork"
  message="The Ranking Reveal Segment needs album artwork."
  severity="blocking"
/>
```

`ObjectCard` state flags are visual shell state only; domain readiness and
selection remain owned by the application. `NotesPanel` is intentionally plain
text because rich notes and teleprompter behavior remain open specifications.
`PropertyRow` supports only the documented MVP override vocabulary and does not
imply arbitrary Segment behavior overrides.

## Application shell

`ApplicationShell` owns the persistent 64 px top bar and arranges the current
workspace around one main focus region. Its slots cover the Studio switcher,
short breadcrumb, title, save state, history controls, primary action, menu,
scope line, optional Catalog, optional inspector, and optional notes surface.

```tsx
<ApplicationShell
  catalog={<SegmentCatalog />}
  catalogLabel="Segment Catalog"
  inspector={<SegmentInspector />}
  notes={
    <NotesPanel
      onChange={(event) => setNotes(event.currentTarget.value)}
      value={notes}
    />
  }
  primaryAction={<Button variant="primary">Add Segment</Button>}
  saveState={<SaveStateIndicator state="saved" />}
  scope={<ScopeLabel scope="show" />}
  studioSwitcher={<StudioSwitcher />}
  title="Show Blueprint"
>
  <Storyboard />
</ApplicationShell>
```

Below the 1280 px comfortable desktop boundary, the Catalog and inspector
collapse and may be reopened as overlays. Opening one support surface closes the
other; Escape, the close control, or the scrim restores focus to its opener. The
main workspace, scope, and primary action remain mounted throughout. This is
basic desktop panel collapse, not a mobile editing system.

Dialogs, drawers, menus, tabs, and tooltips may be controlled or uncontrolled.
Always provide production-language titles and descriptions. Destructive actions
belong in a separated destructive `MenuItem` or an explicit confirmation flow;
do not make routine editing modal.

## Focus and keyboard contract

Every interactive foundation exposes a visible 2 px accent focus ring without
removing its semantic role. Standard controls and inputs are at least 44 px in
both target dimensions; nominal 36 px compact buttons and 40 px menu rows expand
to the same accessible target minimum. Icon-only controls require both a label
and tooltip, and menus inherit the accessible name of their required trigger.

Radix-backed menus, tabs, dialogs, and drawers retain their standard arrow-key,
Tab, Shift+Tab, Enter, Space, and Escape behavior. Dialogs and drawers trap focus
while open, and overlays return focus to the control that opened them. Application
support panels follow the same Escape and focus-return contract. Do not add custom
global shortcuts until the open shortcut vocabulary is approved.

All component values live in `tokens.css` and `foundations.module.css`. Feature
styles must not override these components with raw color, type, spacing, radius,
motion, or stacking values.
