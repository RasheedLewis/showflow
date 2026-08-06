import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "./class-names.js";
import styles from "./foundations.module.css";

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  readonly actions?: ReactNode;
  readonly heading?: string;
}

export const Panel = ({
  actions,
  children,
  className,
  heading,
  ...props
}: PanelProps) => (
  <section className={classNames(styles.panel, className)} {...props}>
    {heading || actions ? (
      <header className={styles.panelHeader}>
        {heading ? (
          <h2 className={styles.panelHeading}>{heading}</h2>
        ) : (
          <span />
        )}
        {actions}
      </header>
    ) : null}
    <div className={styles.panelBody}>{children}</div>
  </section>
);

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  readonly orientation?: "horizontal" | "vertical";
}

export const Divider = ({
  className,
  orientation = "horizontal",
  ...props
}: DividerProps) => (
  <div
    aria-orientation={orientation}
    className={classNames(
      styles.divider,
      styles[`divider-${orientation}`],
      className,
    )}
    role="separator"
    {...props}
  />
);
