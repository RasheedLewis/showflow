export const COMPONENT_GALLERY_ROUTE = "/_development/components";

export const GALLERY_COMPONENTS = [
  "ApplicationShell",
  "Badge",
  "Button",
  "Checkbox",
  "Dialog",
  "Divider",
  "Drawer",
  "EmptyState",
  "Icon",
  "IconButton",
  "InspectorSection",
  "Menu",
  "NotesPanel",
  "ObjectCard",
  "Panel",
  "PropertyRow",
  "SaveStateIndicator",
  "ScopeLabel",
  "Select",
  "Skeleton",
  "StatusBadge",
  "StoryboardCard",
  "Tabs",
  "TextArea",
  "TextInput",
  "Toggle",
  "Tooltip",
  "ValidationItem",
] as const;

export type GalleryComponentName = (typeof GALLERY_COMPONENTS)[number];
