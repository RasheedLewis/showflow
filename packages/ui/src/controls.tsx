import { useId } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { classNames } from "./class-names.js";
import { Icon } from "./icon.js";
import type { IconName } from "./icon.js";
import styles from "./foundations.module.css";
import { Tooltip } from "./tooltip.js";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ControlSize = "small" | "standard" | "large";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly leadingIcon?: IconName;
  readonly size?: ControlSize;
  readonly trailingIcon?: IconName;
  readonly variant?: ButtonVariant;
}

export const Button = ({
  children,
  className,
  leadingIcon,
  size = "standard",
  trailingIcon,
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) => (
  <button
    className={classNames(
      styles.control,
      styles[`button-${variant}`],
      styles[`control-${size}`],
      className,
    )}
    type={type}
    {...props}
  >
    {leadingIcon ? (
      <Icon name={leadingIcon} size={size === "small" ? 16 : 20} />
    ) : null}
    <span>{children}</span>
    {trailingIcon ? (
      <Icon name={trailingIcon} size={size === "small" ? 16 : 20} />
    ) : null}
  </button>
);

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "children" | "title"
> {
  readonly icon: IconName;
  readonly label: string;
  readonly size?: ControlSize;
  readonly tooltip: string;
  readonly variant?: ButtonVariant;
}

export const IconButton = ({
  className,
  icon,
  label,
  size = "standard",
  tooltip,
  type = "button",
  variant = "ghost",
  ...props
}: IconButtonProps) => (
  <Tooltip content={tooltip}>
    <button
      aria-label={label}
      className={classNames(
        styles.control,
        styles.iconButton,
        styles[`button-${variant}`],
        styles[`control-${size}`],
        className,
      )}
      type={type}
      {...props}
    >
      <Icon
        name={icon}
        size={size === "small" ? 16 : size === "large" ? 24 : 20}
      />
    </button>
  </Tooltip>
);

interface FieldChromeProps {
  readonly children: ReactNode;
  readonly error?: string | undefined;
  readonly helpText?: string | undefined;
  readonly id: string;
  readonly label: string;
  readonly required?: boolean | undefined;
}

const FieldChrome = ({
  children,
  error,
  helpText,
  id,
  label,
  required,
}: FieldChromeProps) => {
  const message = error ?? helpText;

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {message ? (
        <span
          className={classNames(
            styles.fieldMessage,
            error && styles.fieldError,
          )}
          id={`${id}-message`}
        >
          {message}
        </span>
      ) : null}
    </div>
  );
};

export interface TextInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  readonly error?: string;
  readonly helpText?: string;
  readonly label: string;
}

export const TextInput = ({
  className,
  error,
  helpText,
  id: suppliedId,
  label,
  required,
  ...props
}: TextInputProps) => {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const describedBy = error || helpText ? `${id}-message` : undefined;

  return (
    <FieldChrome
      error={error}
      helpText={helpText}
      id={id}
      label={label}
      required={required}
    >
      <input
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={classNames(
          styles.input,
          error && styles.inputError,
          className,
        )}
        id={id}
        required={required}
        {...props}
      />
    </FieldChrome>
  );
};

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  readonly error?: string;
  readonly helpText?: string;
  readonly label: string;
}

export const TextArea = ({
  className,
  error,
  helpText,
  id: suppliedId,
  label,
  required,
  ...props
}: TextAreaProps) => {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const describedBy = error || helpText ? `${id}-message` : undefined;

  return (
    <FieldChrome
      error={error}
      helpText={helpText}
      id={id}
      label={label}
      required={required}
    >
      <textarea
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={classNames(
          styles.input,
          styles.textArea,
          error && styles.inputError,
          className,
        )}
        id={id}
        required={required}
        {...props}
      />
    </FieldChrome>
  );
};

export interface SelectOption {
  readonly disabled?: boolean;
  readonly label: string;
  readonly value: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly error?: string;
  readonly helpText?: string;
  readonly label: string;
  readonly options: ReadonlyArray<SelectOption>;
  readonly placeholder?: string;
}

export const Select = ({
  className,
  error,
  helpText,
  id: suppliedId,
  label,
  options,
  placeholder,
  required,
  ...props
}: SelectProps) => {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const describedBy = error || helpText ? `${id}-message` : undefined;

  return (
    <FieldChrome
      error={error}
      helpText={helpText}
      id={id}
      label={label}
      required={required}
    >
      <span className={styles.selectWrap}>
        <select
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={classNames(
            styles.input,
            styles.select,
            error && styles.inputError,
            className,
          )}
          id={id}
          required={required}
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option
              disabled={option.disabled}
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
        <Icon className={styles.selectIcon} name="chevron-down" size={16} />
      </span>
    </FieldChrome>
  );
};

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  readonly label: string;
}

export const Checkbox = ({
  className,
  id: suppliedId,
  label,
  ...props
}: CheckboxProps) => {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;

  return (
    <label className={classNames(styles.checkControl, className)} htmlFor={id}>
      <input className={styles.checkbox} id={id} type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
};

export interface ToggleProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-checked" | "children" | "role"
> {
  readonly checked: boolean;
  readonly label: string;
  readonly onCheckedChange?: (checked: boolean) => void;
}

export const Toggle = ({
  checked,
  className,
  label,
  onCheckedChange,
  onClick,
  type = "button",
  ...props
}: ToggleProps) => (
  <button
    aria-checked={checked}
    className={classNames(styles.toggleControl, className)}
    onClick={(event) => {
      onClick?.(event);
      if (!event.defaultPrevented) onCheckedChange?.(!checked);
    }}
    role="switch"
    type={type}
    {...props}
  >
    <span aria-hidden="true" className={styles.toggleTrack}>
      <span className={styles.toggleThumb} />
    </span>
    <span>{label}</span>
  </button>
);
