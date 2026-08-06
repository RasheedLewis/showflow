import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "./class-names.js";
import { Icon } from "./icon.js";
import type { IconName } from "./icon.js";
import styles from "./foundations.module.css";

export type BadgeTone =
  "neutral" | "accent" | "success" | "warning" | "error" | "info";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly icon?: IconName;
  readonly tone?: BadgeTone;
}

export const Badge = ({
  children,
  className,
  icon,
  tone = "neutral",
  ...props
}: BadgeProps) => (
  <span
    className={classNames(styles.badge, styles[`badge-${tone}`], className)}
    {...props}
  >
    {icon ? <Icon name={icon} size={14} /> : null}
    {children}
  </span>
);

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  readonly label?: string;
}

export const Skeleton = ({
  className,
  label = "Loading",
  ...props
}: SkeletonProps) => (
  <div
    aria-label={label}
    className={classNames(styles.skeleton, className)}
    role="progressbar"
    {...props}
  />
);

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  readonly action: ReactNode;
  readonly description: string;
  readonly heading: string;
  readonly icon?: IconName;
  readonly secondaryAction?: ReactNode;
}

export const EmptyState = ({
  action,
  className,
  description,
  heading,
  icon,
  secondaryAction,
  ...props
}: EmptyStateProps) => (
  <div className={classNames(styles.emptyState, className)} {...props}>
    {icon ? (
      <span aria-hidden="true" className={styles.emptyStateIcon}>
        <Icon name={icon} size={32} />
      </span>
    ) : null}
    <h2 className={styles.emptyStateHeading}>{heading}</h2>
    <p className={styles.emptyStateDescription}>{description}</p>
    <div className={styles.emptyStateActions}>
      {action}
      {secondaryAction}
    </div>
  </div>
);

export type SaveState = "saving" | "saved" | "unsaved" | "error";

const SAVE_STATE_COPY: Record<SaveState, string> = {
  error: "Could not save",
  saved: "Saved",
  saving: "Saving…",
  unsaved: "Unsaved changes",
};

export interface SaveStateIndicatorProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> {
  readonly state: SaveState;
}

export const SaveStateIndicator = ({
  className,
  state,
  ...props
}: SaveStateIndicatorProps) => (
  <span
    aria-live="polite"
    className={classNames(
      styles.saveState,
      styles[`saveState-${state}`],
      className,
    )}
    {...props}
  >
    <span aria-hidden="true" className={styles.saveStateMark} />
    {SAVE_STATE_COPY[state]}
  </span>
);
