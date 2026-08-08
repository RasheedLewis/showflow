import { Icon } from "@showflow/ui";
import type { MouseEventHandler } from "react";
import { Link } from "react-router-dom";

import styles from "./parent-navigation.module.css";

export interface ParentNavigationProps {
  readonly accessibleLabel: string;
  readonly disabled?: boolean;
  readonly label: string;
  readonly onClick?: MouseEventHandler<HTMLAnchorElement>;
  readonly to: string;
}

export const ParentNavigation = ({
  accessibleLabel,
  disabled = false,
  label,
  onClick,
  to,
}: ParentNavigationProps) => (
  <Link
    aria-disabled={disabled || undefined}
    aria-label={accessibleLabel}
    className={styles.link}
    onClick={(event) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    }}
    tabIndex={disabled ? -1 : undefined}
    to={to}
  >
    <Icon name="arrow-left" size={16} />
    <span className={styles.label}>{label}</span>
  </Link>
);
