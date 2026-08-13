import {
  getLayoutAnimationCompletionMs,
  type InstructionComponentSource,
  type InstructionLayoutSource,
  type LifecycleActionSource,
} from "./instruction-generator.mjs";

export interface LifecycleActionTiming {
  readonly actionIndex: number;
  readonly durationMs: number | null;
  readonly kind: LifecycleActionSource["kind"];
  readonly warning?: string;
}

export interface LifecycleTimingSummary {
  readonly actions: readonly LifecycleActionTiming[];
  readonly indeterminateActionIndex: number | null;
  readonly totalDurationMs: number | null;
}

export const calculateLifecycleTiming = ({
  actions,
  components,
  layouts,
}: {
  readonly actions: readonly LifecycleActionSource[];
  readonly components: readonly InstructionComponentSource[];
  readonly layouts: readonly InstructionLayoutSource[];
}): LifecycleTimingSummary => {
  const layoutsById = new Map(layouts.map((layout) => [layout.id, layout]));
  let currentLayoutId: string | undefined;
  let indeterminateActionIndex: number | null = null;
  let totalDurationMs = 0;
  const timings = actions.map((action, actionIndex): LifecycleActionTiming => {
    if (action.kind === "activateLayout") {
      currentLayoutId = action.layoutId;
      return { actionIndex, durationMs: 0, kind: action.kind };
    }
    if (action.kind === "waitForDuration") {
      const valid =
        Number.isFinite(action.durationMs) &&
        Number.isInteger(action.durationMs) &&
        action.durationMs > 0;
      if (!valid) {
        indeterminateActionIndex ??= actionIndex;
        return {
          actionIndex,
          durationMs: null,
          kind: action.kind,
          warning: "Enter a hold duration greater than zero seconds.",
        };
      }
      totalDurationMs += action.durationMs;
      return { actionIndex, durationMs: action.durationMs, kind: action.kind };
    }
    if (action.kind === "waitForAnimationCompletion") {
      const layout =
        currentLayoutId === undefined
          ? undefined
          : layoutsById.get(currentLayoutId);
      if (layout === undefined) {
        indeterminateActionIndex ??= actionIndex;
        return {
          actionIndex,
          durationMs: null,
          kind: action.kind,
          warning:
            "Choose a Layout in an earlier action so Showflow can calculate this animation wait.",
        };
      }
      const durationMs = getLayoutAnimationCompletionMs(
        layout,
        components,
        "enter",
      );
      totalDurationMs += durationMs;
      return {
        actionIndex,
        durationMs,
        kind: action.kind,
        ...(durationMs === 0
          ? {
              warning:
                "This animation wait resolves to zero and completes immediately.",
            }
          : {}),
      };
    }
    if (action.kind === "waitForMediaCompletion") {
      indeterminateActionIndex ??= actionIndex;
      return {
        actionIndex,
        durationMs: null,
        kind: action.kind,
        warning: "Media completion does not have a fixed duration.",
      };
    }
    return { actionIndex, durationMs: 0, kind: action.kind };
  });

  return Object.freeze({
    actions: Object.freeze(timings),
    indeterminateActionIndex,
    totalDurationMs: indeterminateActionIndex === null ? totalDurationMs : null,
  });
};
