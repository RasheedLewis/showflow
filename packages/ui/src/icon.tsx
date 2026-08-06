import {
  AlertCircle,
  Check,
  ChevronDown,
  Circle,
  Info,
  Menu,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  Plus,
  Redo2,
  Save,
  Search,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import type { LucideIcon, LucideProps } from "lucide-react";

const icons = {
  "alert-circle": AlertCircle,
  check: Check,
  "chevron-down": ChevronDown,
  circle: Circle,
  info: Info,
  menu: Menu,
  more: MoreHorizontal,
  "panel-left": PanelLeft,
  "panel-right": PanelRight,
  plus: Plus,
  redo: Redo2,
  save: Save,
  search: Search,
  trash: Trash2,
  undo: Undo2,
  close: X,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

export interface IconProps extends Omit<LucideProps, "aria-label" | "name"> {
  readonly label?: string;
  readonly name: IconName;
}

/** The only product-facing boundary around the selected icon library. */
export const Icon = ({
  label,
  name,
  size = 20,
  strokeWidth = 1.75,
  ...props
}: IconProps) => {
  const Glyph = icons[name];

  return (
    <Glyph
      aria-hidden={label ? undefined : true}
      aria-label={label}
      focusable="false"
      role={label ? "img" : undefined}
      size={size}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
};
