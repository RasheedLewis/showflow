import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactElement, ReactNode } from "react";

import styles from "./foundations.module.css";

export interface TooltipProps {
  readonly children: ReactElement;
  readonly content: ReactNode;
  readonly delayDuration?: number;
}

export const Tooltip = ({
  children,
  content,
  delayDuration = 500,
}: TooltipProps) => (
  <RadixTooltip.Provider delayDuration={delayDuration}>
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content className={styles.tooltip} sideOffset={8}>
          {content}
          <RadixTooltip.Arrow className={styles.tooltipArrow} />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  </RadixTooltip.Provider>
);
