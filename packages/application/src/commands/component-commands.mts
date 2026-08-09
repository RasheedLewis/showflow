import {
  assertComponentSlotCompatibility,
  createBuiltInComponent,
  createEntityMetadata,
  isBuiltInComponentType,
  type Binding,
  type AnimationConfig,
  type BuiltInComponentType,
  type ComponentPlacement,
  type ComponentPlacementId,
  type DomainFactoryDependencies,
  type JsonObject,
  type Layout,
  type LayoutId,
  type ShowId,
  type SlotId,
  type UtcTimestamp,
} from "@showflow/domain";

import {
  DEFAULT_COMMAND_DEPENDENCIES,
  requireEntity,
  touchEntity,
} from "./command-support.mjs";
import { ApplicationError } from "../errors/application-error.mjs";
import type {
  ComponentPlacementAssignmentRepository,
  ComponentRepository,
  LayoutRepository,
} from "../repositories/repositories.mjs";

type ComponentCommandRepositories = {
  readonly components: ComponentRepository;
  readonly layouts: LayoutRepository;
  readonly assignments: ComponentPlacementAssignmentRepository;
};

interface LayoutMutationScope {
  readonly showId: ShowId;
  readonly layoutId: LayoutId;
  readonly expectedUpdatedAt: UtcTimestamp;
}

const requireLayout = async (
  repositories: Pick<ComponentCommandRepositories, "layouts">,
  input: LayoutMutationScope,
): Promise<Layout> => {
  const layout = requireEntity(
    await repositories.layouts.getById(input.layoutId),
    "Layout",
  );
  if (layout.showId !== input.showId)
    throw new ApplicationError("NOT_FOUND", "Layout was not found.");
  if (layout.updatedAt !== input.expectedUpdatedAt)
    throw new ApplicationError(
      "CONFLICT",
      "This Layout changed while you were editing. Review the saved version and try again.",
    );
  return layout;
};

export interface AssignComponentPlacementCommandInput extends LayoutMutationScope {
  readonly slotId: SlotId;
  readonly componentType: BuiltInComponentType;
}

export class AssignComponentPlacementCommand {
  constructor(
    readonly repositories: ComponentCommandRepositories,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(input: AssignComponentPlacementCommandInput): Promise<Layout> {
    const layout = await requireLayout(this.repositories, input);
    if (!isBuiltInComponentType(input.componentType))
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Choose a built-in Component.",
      );
    const slot = requireEntity(
      layout.slots.find(({ id }) => id === input.slotId) ?? null,
      "Slot",
    );
    const stored = (
      await this.repositories.components.listByShowId(input.showId)
    ).find(
      ({ type, archivedAt }) =>
        type === input.componentType && archivedAt === undefined,
    );
    const component =
      stored ??
      createBuiltInComponent(
        input.showId,
        input.componentType,
        this.dependencies,
      );
    try {
      assertComponentSlotCompatibility(component, slot);
    } catch (error) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        `The ${component.name} Component cannot be placed in the ${slot.name} Slot. Choose a compatible Component.`,
        { cause: error },
      );
    }
    const existing = layout.componentPlacements.find(
      ({ slotId }) => slotId === slot.id,
    );
    const placement: ComponentPlacement =
      existing === undefined
        ? {
            id: this.dependencies.createId("componentPlacement"),
            layoutId: layout.id,
            componentId: component.id,
            slotId: slot.id,
            fixedProperties: {},
            bindings: {},
            visibleByDefault: true,
            ...createEntityMetadata(this.dependencies.clock),
          }
        : touchEntity(
            {
              ...existing,
              componentId: component.id,
              fixedProperties: {},
              bindings: {},
            },
            this.dependencies,
          );
    const updated = touchEntity(
      {
        ...layout,
        componentPlacements: [
          ...layout.componentPlacements.filter(
            ({ slotId }) => slotId !== slot.id,
          ),
          placement,
        ],
      },
      this.dependencies,
    );
    await this.repositories.assignments.saveComponentAndLayout(
      component,
      updated,
    );
    return updated;
  }
}

export interface UpdateComponentPlacementCommandInput extends LayoutMutationScope {
  readonly placementId: ComponentPlacementId;
  readonly bindings: Readonly<Record<string, Binding>>;
  readonly fixedProperties: JsonObject;
  readonly visibleByDefault: boolean;
  readonly enterAnimationOverride?: AnimationConfig | null;
  readonly exitAnimationOverride?: AnimationConfig | null;
}

export class UpdateComponentPlacementCommand {
  constructor(
    readonly repositories: Pick<
      ComponentCommandRepositories,
      "components" | "layouts"
    >,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(input: UpdateComponentPlacementCommandInput): Promise<Layout> {
    const layout = await requireLayout(this.repositories, input);
    const placement = requireEntity(
      layout.componentPlacements.find(({ id }) => id === input.placementId) ??
        null,
      "Component Placement",
    );
    const component = requireEntity(
      await this.repositories.components.getById(placement.componentId),
      "Component",
    );
    const allowedKeys = new Set(component.propertySchema.map(({ key }) => key));
    const suppliedKeys = [
      ...Object.keys(input.bindings),
      ...Object.keys(input.fixedProperties),
    ];
    if (suppliedKeys.some((key) => !allowedKeys.has(key)))
      throw new ApplicationError(
        "VALIDATION_ERROR",
        `One ${component.name} property is not available. Review the Placement and try again.`,
      );
    const {
      enterAnimationOverride: currentEnterAnimationOverride,
      exitAnimationOverride: currentExitAnimationOverride,
      ...placementWithoutAnimationOverrides
    } = placement;
    const enterAnimationOverride =
      input.enterAnimationOverride === undefined
        ? currentEnterAnimationOverride
        : (input.enterAnimationOverride ?? undefined);
    const exitAnimationOverride =
      input.exitAnimationOverride === undefined
        ? currentExitAnimationOverride
        : (input.exitAnimationOverride ?? undefined);
    const updatedPlacement = touchEntity(
      {
        ...placementWithoutAnimationOverrides,
        bindings: { ...input.bindings },
        fixedProperties: { ...input.fixedProperties },
        visibleByDefault: input.visibleByDefault,
        ...(enterAnimationOverride === undefined
          ? {}
          : { enterAnimationOverride }),
        ...(exitAnimationOverride === undefined
          ? {}
          : { exitAnimationOverride }),
      },
      this.dependencies,
    );
    const updated = touchEntity(
      {
        ...layout,
        componentPlacements: layout.componentPlacements.map((candidate) =>
          candidate.id === placement.id ? updatedPlacement : candidate,
        ),
      },
      this.dependencies,
    );
    await this.repositories.layouts.save(updated);
    return updated;
  }
}

export interface RemoveComponentPlacementCommandInput extends LayoutMutationScope {
  readonly placementId: ComponentPlacementId;
}

export class RemoveComponentPlacementCommand {
  constructor(
    readonly repositories: Pick<ComponentCommandRepositories, "layouts">,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(input: RemoveComponentPlacementCommandInput): Promise<Layout> {
    const layout = await requireLayout(this.repositories, input);
    requireEntity(
      layout.componentPlacements.find(({ id }) => id === input.placementId) ??
        null,
      "Component Placement",
    );
    const updated = touchEntity(
      {
        ...layout,
        componentPlacements: layout.componentPlacements.filter(
          ({ id }) => id !== input.placementId,
        ),
      },
      this.dependencies,
    );
    await this.repositories.layouts.save(updated);
    return updated;
  }
}
