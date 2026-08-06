import * as RadixDialog from "@radix-ui/react-dialog";
import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import type { ReactElement, ReactNode } from "react";

import { classNames } from "./class-names.js";
import styles from "./foundations.module.css";
import { Icon } from "./icon.js";

export interface MenuProps {
  readonly children: ReactNode;
  readonly trigger: ReactElement;
}

export const Menu = ({ children, trigger }: MenuProps) => (
  <RadixMenu.Root>
    <RadixMenu.Trigger asChild>{trigger}</RadixMenu.Trigger>
    <RadixMenu.Portal>
      <RadixMenu.Content className={styles.menu} sideOffset={8}>
        {children}
      </RadixMenu.Content>
    </RadixMenu.Portal>
  </RadixMenu.Root>
);

export interface MenuItemProps {
  readonly children: ReactNode;
  readonly destructive?: boolean;
  readonly disabled?: boolean;
  readonly onSelect?: () => void;
  readonly shortcut?: string;
}

export interface MenuLabelProps {
  readonly children: ReactNode;
}

export const MenuLabel = ({ children }: MenuLabelProps) => (
  <RadixMenu.Label className={styles.menuLabel}>{children}</RadixMenu.Label>
);

export const MenuItem = ({
  children,
  destructive = false,
  disabled,
  onSelect,
  shortcut,
}: MenuItemProps) => (
  <RadixMenu.Item
    className={classNames(
      styles.menuItem,
      destructive && styles.menuItemDestructive,
    )}
    disabled={disabled ?? false}
    {...(onSelect === undefined ? {} : { onSelect })}
  >
    <span>{children}</span>
    {shortcut ? (
      <>
        {" "}
        <span className={classNames(styles.menuShortcut, "sf-shortcut")}>
          {shortcut}
        </span>
      </>
    ) : null}
  </RadixMenu.Item>
);

export const MenuSeparator = () => (
  <RadixMenu.Separator className={styles.menuSeparator} />
);

interface ModalShellProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly defaultOpen?: boolean;
  readonly description: string;
  readonly footer?: ReactNode;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly title: string;
  readonly trigger?: ReactElement;
  readonly type: "dialog" | "drawer";
}

const ModalShell = ({
  children,
  className,
  defaultOpen,
  description,
  footer,
  onOpenChange,
  open,
  title,
  trigger,
  type,
}: ModalShellProps) => {
  const controlled = open === undefined ? {} : { open };
  const initial = defaultOpen === undefined ? {} : { defaultOpen };
  const changeHandler = onOpenChange === undefined ? {} : { onOpenChange };

  return (
    <RadixDialog.Root {...controlled} {...initial} {...changeHandler}>
      {trigger ? (
        <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>
      ) : null}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.scrim} />
        <RadixDialog.Content
          className={classNames(styles.modal, styles[type], className)}
          data-kind={type}
        >
          <div className={styles.modalHeader}>
            <div>
              <RadixDialog.Title className={styles.modalTitle}>
                {title}
              </RadixDialog.Title>
              <RadixDialog.Description className={styles.modalDescription}>
                {description}
              </RadixDialog.Description>
            </div>
            <RadixDialog.Close asChild>
              <button
                aria-label={`Close ${title}`}
                className={classNames(
                  styles.control,
                  styles.iconButton,
                  styles["button-ghost"],
                  styles["control-standard"],
                )}
                title="Close"
                type="button"
              >
                <Icon name="close" />
              </button>
            </RadixDialog.Close>
          </div>
          <div className={styles.modalBody}>{children}</div>
          {footer ? <div className={styles.modalFooter}>{footer}</div> : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};

export type DialogProps = Omit<ModalShellProps, "type">;

export const Dialog = (props: DialogProps) => (
  <ModalShell {...props} type="dialog" />
);

export type DrawerProps = Omit<ModalShellProps, "type">;

export const Drawer = (props: DrawerProps) => (
  <ModalShell {...props} type="drawer" />
);
