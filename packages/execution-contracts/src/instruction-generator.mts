import {
  getAnimationCompletionMs,
  resolvePlacementAnimation,
  type AnimationComponentSource,
  type AnimationPlacementSource,
} from "./animation-registry.mjs";
import type {
  ExecutionInstruction,
  LayoutExecutionTarget,
  ResourceExecutionTarget,
  SegmentExecutionPlan,
} from "./instructions.mjs";

export type LifecycleActionSource =
  | { readonly kind: "preloadResource"; readonly resourceId: string }
  | { readonly kind: "activateLayout"; readonly layoutId: string }
  | { readonly kind: "playSound"; readonly resourceId: string }
  | { readonly kind: "startMedia"; readonly resourceId: string }
  | { readonly kind: "stopMedia"; readonly resourceId: string }
  | { readonly kind: "waitForAnimationCompletion" }
  | {
      readonly kind: "waitForMediaCompletion";
      readonly resourceId?: string | undefined;
    }
  | { readonly kind: "setActiveDefaults"; readonly layoutId: string }
  | { readonly kind: "clearTemporaryState" };

export interface InstructionComponentSource extends AnimationComponentSource {
  readonly id: string;
}

export interface InstructionPlacementSource extends AnimationPlacementSource {
  readonly bindings: Readonly<
    Record<string, { readonly kind: string; readonly resourceId?: string }>
  >;
  readonly componentId: string;
}

export interface InstructionLayoutSource {
  readonly componentPlacements: readonly InstructionPlacementSource[];
  readonly id: string;
  readonly name: string;
}

export interface InstructionResourceSource {
  readonly category: string;
  readonly displayName: string;
  readonly id: string;
}

export interface InstructionSegmentSource {
  readonly id: string;
  readonly layoutIds: readonly string[];
  readonly lifecycle: {
    readonly active: {
      readonly availableLayoutIds: readonly string[];
      readonly defaultLayoutId?: string | null | undefined;
    };
    readonly cleanup: readonly LifecycleActionSource[];
    readonly enter: readonly LifecycleActionSource[];
    readonly exit: readonly LifecycleActionSource[];
    readonly prepare: readonly LifecycleActionSource[];
  };
  readonly name: string;
}

export interface SegmentInstructionSource {
  readonly components: readonly InstructionComponentSource[];
  readonly layouts: readonly InstructionLayoutSource[];
  readonly resources: readonly InstructionResourceSource[];
  readonly segment: InstructionSegmentSource;
}

const unavailableLayout = (id: string): LayoutExecutionTarget => ({
  id,
  name: "Unavailable Layout",
});
const unavailableResource = (id: string): ResourceExecutionTarget => ({
  id,
  name: "Unavailable Resource",
});

export const generateSegmentInstructions = ({
  components,
  layouts,
  resources,
  segment,
}: SegmentInstructionSource): SegmentExecutionPlan => {
  const layoutsById = new Map(layouts.map((layout) => [layout.id, layout]));
  const componentsById = new Map(
    components.map((component) => [component.id, component]),
  );
  const resourcesById = new Map(
    resources.map((resource) => [resource.id, resource]),
  );
  const layoutTarget = (id: string): LayoutExecutionTarget => {
    const layout = layoutsById.get(id);
    return layout === undefined
      ? unavailableLayout(id)
      : { id: layout.id, name: layout.name };
  };
  const resourceTarget = (id: string): ResourceExecutionTarget => {
    const resource = resourcesById.get(id);
    return resource === undefined
      ? unavailableResource(id)
      : {
          category: resource.category,
          id: resource.id,
          name: resource.displayName,
        };
  };
  const layoutAnimationMs = (
    id: string | undefined,
    phase: "enter" | "exit",
  ): number => {
    const layout = id === undefined ? undefined : layoutsById.get(id);
    if (layout === undefined) return 0;
    return layout.componentPlacements.reduce((maximum, placement) => {
      const component = componentsById.get(placement.componentId);
      if (component === undefined) return maximum;
      return Math.max(
        maximum,
        getAnimationCompletionMs(
          resolvePlacementAnimation(component, placement, phase),
          false,
        ),
      );
    }, 0);
  };
  const normalizeActions = (
    actions: readonly LifecycleActionSource[],
  ): readonly ExecutionInstruction[] => {
    let currentLayoutId: string | undefined;
    return actions.flatMap((action): readonly ExecutionInstruction[] => {
      switch (action.kind) {
        case "preloadResource":
          return [
            {
              kind: "preloadResource",
              resource: resourceTarget(action.resourceId),
            },
          ];
        case "activateLayout":
          currentLayoutId = action.layoutId;
          return [
            { kind: "activateLayout", layout: layoutTarget(action.layoutId) },
          ];
        case "playSound":
        case "startMedia":
          return [
            {
              kind: "playResource",
              resource: resourceTarget(action.resourceId),
            },
          ];
        case "stopMedia":
          return [
            {
              kind: "stopResource",
              resource: resourceTarget(action.resourceId),
            },
          ];
        case "waitForAnimationCompletion":
          return [
            {
              durationMs: layoutAnimationMs(currentLayoutId, "enter"),
              kind: "waitForAnimationCompletion",
              ...(currentLayoutId === undefined
                ? {}
                : { layout: layoutTarget(currentLayoutId) }),
            },
          ];
        case "waitForMediaCompletion":
          return [
            {
              kind: "waitForMediaCompletion",
              ...(action.resourceId === undefined
                ? {}
                : { resource: resourceTarget(action.resourceId) }),
            },
          ];
        case "setActiveDefaults":
          return [
            {
              availableLayouts:
                segment.lifecycle.active.availableLayoutIds.map(layoutTarget),
              defaultLayout: layoutTarget(action.layoutId),
              kind: "setActiveDefaults",
            },
          ];
        case "clearTemporaryState":
          return [{ kind: "clearTemporaryState" }];
      }
    });
  };

  const referencedResources = new Map<string, ResourceExecutionTarget>();
  for (const layoutId of segment.layoutIds) {
    const layout = layoutsById.get(layoutId);
    for (const placement of layout?.componentPlacements ?? []) {
      for (const binding of Object.values(placement.bindings)) {
        if (binding.kind === "resource" && binding.resourceId !== undefined) {
          referencedResources.set(
            binding.resourceId,
            resourceTarget(binding.resourceId),
          );
        }
      }
    }
  }
  const allActions = [
    ...segment.lifecycle.prepare,
    ...segment.lifecycle.enter,
    ...segment.lifecycle.exit,
    ...segment.lifecycle.cleanup,
  ];
  for (const action of allActions) {
    if (
      action.kind === "preloadResource" ||
      action.kind === "playSound" ||
      action.kind === "startMedia" ||
      action.kind === "stopMedia"
    ) {
      referencedResources.set(
        action.resourceId,
        resourceTarget(action.resourceId),
      );
    } else if (
      action.kind === "waitForMediaCompletion" &&
      action.resourceId !== undefined
    ) {
      referencedResources.set(
        action.resourceId,
        resourceTarget(action.resourceId),
      );
    }
  }

  const explicitPrepare = normalizeActions(segment.lifecycle.prepare).filter(
    ({ kind }) => kind !== "preloadResource",
  );
  const defaultLayoutId = segment.lifecycle.active.defaultLayoutId;
  const defaultLayout =
    defaultLayoutId === undefined || defaultLayoutId === null
      ? undefined
      : layoutTarget(defaultLayoutId);
  const lastEnterLayoutId = [...segment.lifecycle.enter]
    .reverse()
    .find((action) => action.kind === "activateLayout")?.layoutId;
  const playedResourceIds = new Set(
    [
      ...normalizeActions(segment.lifecycle.enter),
      ...normalizeActions(segment.lifecycle.exit),
    ].flatMap((instruction) =>
      instruction.kind === "playResource" ? [instruction.resource.id] : [],
    ),
  );
  const explicitCleanup = normalizeActions(segment.lifecycle.cleanup);
  const explicitlyStopped = new Set(
    explicitCleanup.flatMap((instruction) =>
      instruction.kind === "stopResource" ? [instruction.resource.id] : [],
    ),
  );
  const inferredStops: ExecutionInstruction[] = [...playedResourceIds]
    .filter((id) => !explicitlyStopped.has(id))
    .map((id) => ({ kind: "stopResource", resource: resourceTarget(id) }));
  const cleanupWithoutClear = explicitCleanup.filter(
    ({ kind }) => kind !== "clearTemporaryState",
  );
  const activeInstructions = [
    {
      availableLayouts:
        segment.lifecycle.active.availableLayoutIds.map(layoutTarget),
      ...(defaultLayout === undefined ? {} : { defaultLayout }),
      kind: "setActiveDefaults",
    },
    ...(defaultLayout === undefined || lastEnterLayoutId === defaultLayout.id
      ? []
      : ([
          { kind: "activateLayout", layout: defaultLayout },
          {
            durationMs: layoutAnimationMs(defaultLayout.id, "enter"),
            kind: "waitForAnimationCompletion",
            layout: defaultLayout,
          },
        ] satisfies readonly ExecutionInstruction[])),
  ] satisfies readonly ExecutionInstruction[];
  const cleanupInstructions = [
    ...cleanupWithoutClear,
    ...inferredStops,
    { kind: "clearTemporaryState" },
  ] satisfies readonly ExecutionInstruction[];

  return Object.freeze({
    segment: Object.freeze({ id: segment.id, name: segment.name }),
    prepare: Object.freeze([
      ...[...referencedResources.values()].map(
        (resource): ExecutionInstruction => ({
          kind: "preloadResource",
          resource,
        }),
      ),
      ...explicitPrepare,
    ]),
    enter: Object.freeze([...normalizeActions(segment.lifecycle.enter)]),
    active: Object.freeze(activeInstructions),
    exit: Object.freeze([...normalizeActions(segment.lifecycle.exit)]),
    cleanup: Object.freeze(cleanupInstructions),
  });
};
