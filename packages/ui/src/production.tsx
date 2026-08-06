import { useId } from "react";
import type { ChangeEventHandler, HTMLAttributes, ReactNode } from "react";

import { classNames } from "./class-names.js";
import { Badge } from "./feedback.js";
import styles from "./production.module.css";
import { Icon } from "./icon.js";
import type { IconName } from "./icon.js";

export interface ObjectCardProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "title"
> {
  readonly actions?: ReactNode;
  readonly archived?: boolean;
  readonly current?: boolean;
  readonly description?: string;
  readonly disabled?: boolean;
  readonly dragging?: boolean;
  readonly invalid?: boolean;
  readonly metadata?: ReactNode;
  readonly onOpen?: () => void;
  readonly preview?: ReactNode;
  readonly selected?: boolean;
  readonly status?: ReactNode;
  readonly title: string;
}

export const ObjectCard = ({
  actions,
  archived = false,
  className,
  current = false,
  description,
  disabled = false,
  dragging = false,
  invalid = false,
  metadata,
  onClick,
  onOpen,
  preview,
  selected = false,
  status,
  title,
  ...props
}: ObjectCardProps) => {
  const titleId = useId();

  return (
    <article
      {...props}
      aria-current={current ? "true" : undefined}
      aria-disabled={disabled || undefined}
      aria-labelledby={titleId}
      className={classNames(styles.objectCard, className)}
      data-archived={archived || undefined}
      data-current={current || undefined}
      data-dragging={dragging || undefined}
      data-invalid={invalid || undefined}
      data-selected={selected || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || onOpen === undefined) return;
        const target = event.target;
        if (
          target instanceof Element &&
          target.closest(
            "button, a, input, textarea, select, [role='menuitem']",
          )
        ) {
          return;
        }
        onOpen();
      }}
    >
      {preview ? <div className={styles.objectPreview}>{preview}</div> : null}
      <div className={styles.objectContent}>
        <div className={styles.objectHeadingRow}>
          {onOpen ? (
            <button
              className={styles.objectTitleAction}
              disabled={disabled}
              id={titleId}
              onClick={onOpen}
              type="button"
            >
              {title}
            </button>
          ) : (
            <h3 className={styles.objectTitle} id={titleId}>
              {title}
            </h3>
          )}
          {status}
        </div>
        {description ? (
          <p className={styles.objectDescription}>{description}</p>
        ) : null}
        {metadata ? (
          <div className={styles.objectMetadata}>{metadata}</div>
        ) : null}
      </div>
      {actions && !disabled ? (
        <div className={styles.objectActions}>{actions}</div>
      ) : null}
    </article>
  );
};

export type ReadinessStatus =
  "ready" | "needs-content" | "has-warnings" | "blocking-issue";

const READINESS: Record<
  ReadinessStatus,
  {
    readonly icon: IconName;
    readonly label: string;
    readonly tone: "success" | "warning" | "error";
  }
> = {
  "blocking-issue": {
    icon: "alert-circle",
    label: "Blocking issue",
    tone: "error",
  },
  "has-warnings": {
    icon: "alert-circle",
    label: "Has warnings",
    tone: "warning",
  },
  "needs-content": { icon: "info", label: "Needs content", tone: "warning" },
  ready: { icon: "check", label: "Ready", tone: "success" },
};

export interface StatusBadgeProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> {
  readonly status: ReadinessStatus;
}

export const StatusBadge = ({
  className,
  status,
  ...props
}: StatusBadgeProps) => {
  const config = READINESS[status];

  return (
    <Badge
      className={classNames(styles.statusBadge, className)}
      icon={config.icon}
      tone={config.tone}
      {...props}
    >
      {config.label}
    </Badge>
  );
};

export interface StoryboardCardProps extends Omit<
  ObjectCardProps,
  "current" | "description" | "invalid" | "metadata" | "preview" | "status"
> {
  readonly duration: string;
  readonly issueCount?: number;
  readonly placementLabel?: string;
  readonly preview: ReactNode;
  readonly readiness: ReadinessStatus;
  readonly reuseCount?: number;
  readonly sequenceNumber?: number;
  readonly summary?: string;
  readonly timelineState?: "current" | "next";
}

export const StoryboardCard = ({
  className,
  duration,
  issueCount = 0,
  placementLabel,
  preview,
  readiness,
  reuseCount = 1,
  sequenceNumber,
  summary,
  timelineState,
  title,
  ...props
}: StoryboardCardProps) => {
  const description = summary === undefined ? {} : { description: summary };
  const timeline =
    timelineState === undefined ? {} : { "data-timeline-state": timelineState };
  const metadata = (
    <>
      <span className="sf-duration">{duration}</span>
      {reuseCount > 1 ? <span>Used {reuseCount} times</span> : null}
      {issueCount > 0 ? (
        <span>
          {issueCount} {issueCount === 1 ? "issue" : "issues"}
        </span>
      ) : null}
    </>
  );

  return (
    <ObjectCard
      {...props}
      {...description}
      {...timeline}
      className={classNames(styles.storyboardCard, className)}
      current={timelineState === "current"}
      invalid={readiness === "blocking-issue"}
      metadata={metadata}
      preview={
        <div className={styles.storyboardPreview}>
          {sequenceNumber === undefined ? null : (
            <span className={styles.sequenceNumber}>
              <span className={styles.visuallyHidden}>
                Storyboard position{" "}
              </span>
              {sequenceNumber}
            </span>
          )}
          {preview}
          {timelineState ? (
            <span className={styles.timelineLabel}>
              {timelineState === "current" ? "Current" : "Next"}
            </span>
          ) : null}
        </div>
      }
      status={<StatusBadge status={readiness} />}
      title={placementLabel ? `${title} — ${placementLabel}` : title}
    />
  );
};

export type EditingScope =
  "show" | "episode" | "show-segment" | "episode-segment";

const SCOPE_COPY: Record<
  EditingScope,
  { readonly description: string; readonly label: string }
> = {
  episode: {
    description: "Changes apply only to this Episode.",
    label: "Produce Episode",
  },
  "episode-segment": {
    description: "Changes apply only to this Episode.",
    label: "Episode Segment",
  },
  show: {
    description: "Changes become the default for future Episodes.",
    label: "Design Show",
  },
  "show-segment": {
    description: "Changes affect future uses of this Segment.",
    label: "Show Segment",
  },
};

export interface ScopeLabelProps extends HTMLAttributes<HTMLDivElement> {
  readonly scope: EditingScope;
}

export const ScopeLabel = ({ className, scope, ...props }: ScopeLabelProps) => {
  const copy = SCOPE_COPY[scope];

  return (
    <div className={classNames(styles.scopeLabel, className)} {...props}>
      <Icon name="info" size={16} />
      <span>
        <strong>{copy.label}</strong>
        <span>{copy.description}</span>
      </span>
    </div>
  );
};

export interface InspectorSectionProps extends HTMLAttributes<HTMLElement> {
  readonly actions?: ReactNode;
  readonly description?: string;
  readonly heading: string;
}

export const InspectorSection = ({
  actions,
  children,
  className,
  description,
  heading,
  ...props
}: InspectorSectionProps) => {
  const headingId = useId();

  return (
    <section
      {...props}
      aria-labelledby={headingId}
      className={classNames(styles.inspectorSection, className)}
    >
      <header className={styles.inspectorHeader}>
        <div>
          <h3 className={styles.inspectorHeading} id={headingId}>
            {heading}
          </h3>
          {description ? (
            <p className={styles.inspectorDescription}>{description}</p>
          ) : null}
        </div>
        {actions}
      </header>
      <div className={styles.inspectorBody}>{children}</div>
    </section>
  );
};

export interface PropertyRowProps extends HTMLAttributes<HTMLDivElement> {
  readonly control: ReactNode;
  readonly description?: string;
  readonly label: string;
  readonly overridden?: boolean;
  readonly resetAction?: ReactNode;
  readonly source?: string;
}

export const PropertyRow = ({
  className,
  control,
  description,
  label,
  overridden = false,
  resetAction,
  source,
  ...props
}: PropertyRowProps) => (
  <div className={classNames(styles.propertyRow, className)} {...props}>
    <div className={styles.propertyCopy}>
      <span className={styles.propertyLabel}>{label}</span>
      {description ? (
        <span className={styles.propertyDescription}>{description}</span>
      ) : null}
      {source || overridden ? (
        <span className={styles.propertySourceRow}>
          {source ? <Badge tone="neutral">{source}</Badge> : null}
          {overridden ? <Badge tone="accent">Episode override</Badge> : null}
          {overridden ? resetAction : null}
        </span>
      ) : null}
    </div>
    <div className={styles.propertyControl}>{control}</div>
  </div>
);

export interface NotesPanelProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "onChange"
> {
  readonly actions?: ReactNode;
  readonly disabled?: boolean;
  readonly heading?: string;
  readonly onChange?: ChangeEventHandler<HTMLTextAreaElement>;
  readonly placeholder?: string;
  readonly prompt?: string;
  readonly readOnly?: boolean;
  readonly value: string;
}

export const NotesPanel = ({
  actions,
  className,
  disabled,
  heading = "Notes",
  onChange,
  placeholder,
  prompt,
  readOnly,
  value,
  ...props
}: NotesPanelProps) => {
  const headingId = useId();
  const notesId = useId();

  return (
    <section
      {...props}
      aria-labelledby={headingId}
      className={classNames(styles.notesPanel, className)}
    >
      <header className={styles.notesHeader}>
        <div>
          <h2 className={styles.notesHeading} id={headingId}>
            {heading}
          </h2>
          {prompt ? <p className={styles.notesPrompt}>{prompt}</p> : null}
        </div>
        {actions}
      </header>
      <label className={styles.visuallyHidden} htmlFor={notesId}>
        {heading}
      </label>
      <textarea
        className={styles.notesEditor}
        disabled={disabled}
        id={notesId}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly ?? onChange === undefined}
        value={value}
      />
    </section>
  );
};

export type ValidationSeverity = "blocking" | "warning";

export interface ValidationItemProps extends HTMLAttributes<HTMLElement> {
  readonly action: ReactNode;
  readonly affectedObject: string;
  readonly message: string;
  readonly severity: ValidationSeverity;
}

export const ValidationItem = ({
  action,
  affectedObject,
  className,
  message,
  severity,
  ...props
}: ValidationItemProps) => (
  <article
    className={classNames(
      styles.validationItem,
      styles[`validation-${severity}`],
      className,
    )}
    {...props}
  >
    <Icon name="alert-circle" size={20} />
    <div className={styles.validationCopy}>
      <span className={styles.validationSeverity}>
        {severity === "blocking" ? "Blocking issue" : "Warning"}
      </span>
      <strong>{message}</strong>
      <span>
        <span className={styles.visuallyHidden}>Affected object: </span>
        {affectedObject}
      </span>
    </div>
    <div className={styles.validationAction}>{action}</div>
  </article>
);
