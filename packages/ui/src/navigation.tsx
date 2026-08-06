import * as RadixTabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";

import { classNames } from "./class-names.js";
import styles from "./foundations.module.css";

export interface TabItem {
  readonly content: ReactNode;
  readonly disabled?: boolean;
  readonly label: string;
  readonly value: string;
}

export interface TabsProps {
  readonly className?: string;
  readonly defaultValue?: string;
  readonly label: string;
  readonly onValueChange?: (value: string) => void;
  readonly value?: string;
  readonly items: ReadonlyArray<TabItem>;
}

export const Tabs = ({
  className,
  defaultValue,
  items,
  label,
  onValueChange,
  value,
}: TabsProps) => {
  const controlled = value === undefined ? {} : { value };
  const initial = defaultValue === undefined ? {} : { defaultValue };
  const changeHandler = onValueChange === undefined ? {} : { onValueChange };

  return (
    <RadixTabs.Root
      className={classNames(styles.tabs, className)}
      {...controlled}
      {...initial}
      {...changeHandler}
    >
      <RadixTabs.List aria-label={label} className={styles.tabList}>
        {items.map((item) => (
          <RadixTabs.Trigger
            className={styles.tabTrigger}
            disabled={item.disabled}
            key={item.value}
            value={item.value}
          >
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {items.map((item) => (
        <RadixTabs.Content
          className={styles.tabContent}
          key={item.value}
          value={item.value}
        >
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
};
