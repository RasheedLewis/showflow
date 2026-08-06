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

Dialogs, drawers, menus, tabs, and tooltips may be controlled or uncontrolled.
Always provide production-language titles and descriptions. Destructive actions
belong in a separated destructive `MenuItem` or an explicit confirmation flow;
do not make routine editing modal.

All component values live in `tokens.css` and `foundations.module.css`. Feature
styles must not override these components with raw color, type, spacing, radius,
motion, or stacking values.
