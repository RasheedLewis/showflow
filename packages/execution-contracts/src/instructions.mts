export interface SegmentExecutionTarget {
  readonly id: string;
  readonly name: string;
}

export interface LayoutExecutionTarget {
  readonly id: string;
  readonly name: string;
}

export interface ResourceExecutionTarget {
  readonly category?: string;
  readonly id: string;
  readonly name: string;
}

export const EXECUTION_INSTRUCTION_KINDS = Object.freeze([
  "preloadResource",
  "activateLayout",
  "playResource",
  "stopResource",
  "waitForAnimationCompletion",
  "waitForMediaCompletion",
  "setActiveDefaults",
  "clearTemporaryState",
] as const);

export type ExecutionInstructionKind =
  (typeof EXECUTION_INSTRUCTION_KINDS)[number];

export type ExecutionInstruction =
  | {
      readonly kind: "preloadResource";
      readonly resource: ResourceExecutionTarget;
    }
  | {
      readonly kind: "activateLayout";
      readonly layout: LayoutExecutionTarget;
    }
  | {
      readonly kind: "playResource";
      readonly resource: ResourceExecutionTarget;
    }
  | {
      readonly kind: "stopResource";
      readonly resource: ResourceExecutionTarget;
    }
  | {
      readonly durationMs: number;
      readonly kind: "waitForAnimationCompletion";
      readonly layout?: LayoutExecutionTarget;
    }
  | {
      readonly kind: "waitForMediaCompletion";
      readonly resource?: ResourceExecutionTarget;
    }
  | {
      readonly availableLayouts: readonly LayoutExecutionTarget[];
      readonly defaultLayout?: LayoutExecutionTarget;
      readonly kind: "setActiveDefaults";
    }
  | { readonly kind: "clearTemporaryState" };

export interface SegmentExecutionPlan {
  readonly segment: SegmentExecutionTarget;
  readonly prepare: readonly ExecutionInstruction[];
  readonly enter: readonly ExecutionInstruction[];
  readonly active: readonly ExecutionInstruction[];
  readonly exit: readonly ExecutionInstruction[];
  readonly cleanup: readonly ExecutionInstruction[];
}
