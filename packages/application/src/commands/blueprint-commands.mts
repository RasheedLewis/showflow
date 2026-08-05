import {
  assertBlueprintPlacementOwnership,
  createEntityMetadata,
  updateEntityMetadata,
} from "@showflow/domain";
import type {
  BlueprintSegmentPlacement,
  BlueprintSegmentPlacementId,
  DomainFactoryDependencies,
  JsonObject,
  ShowBlueprint,
  ShowBlueprintId,
  ShowSegmentId,
} from "@showflow/domain";

import {
  DEFAULT_COMMAND_DEPENDENCIES,
  orderEntitiesById,
  requireEntity,
  throwNotFound,
  touchEntity,
} from "./command-support.mjs";
import type { TransactionRepositories } from "../repositories/repositories.mjs";

type BlueprintCommandRepositories = Pick<
  TransactionRepositories,
  "blueprints" | "segments"
>;

const saveBlueprint = async (
  repository: BlueprintCommandRepositories["blueprints"],
  blueprint: ShowBlueprint,
): Promise<ShowBlueprint> => {
  await repository.save(blueprint);
  return blueprint;
};

export interface AddSegmentToBlueprintCommandInput {
  readonly blueprintId: ShowBlueprintId;
  readonly showSegmentId: ShowSegmentId;
  readonly label?: string;
  readonly defaultData?: JsonObject;
  readonly defaultDurationMs?: number;
  readonly placementOverrides?: JsonObject;
}

export class AddSegmentToBlueprintCommand {
  readonly #repositories: BlueprintCommandRepositories;
  readonly #dependencies: DomainFactoryDependencies;

  constructor(
    repositories: BlueprintCommandRepositories,
    dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {
    this.#repositories = repositories;
    this.#dependencies = dependencies;
  }

  async execute(
    input: AddSegmentToBlueprintCommandInput,
  ): Promise<ShowBlueprint> {
    const blueprint = requireEntity(
      await this.#repositories.blueprints.getById(input.blueprintId),
      "Show Blueprint",
    );
    const segment = requireEntity(
      await this.#repositories.segments.getById(input.showSegmentId),
      "Show Segment",
    );
    const placement = {
      id: this.#dependencies.createId("blueprintSegmentPlacement"),
      showBlueprintId: blueprint.id,
      showSegmentId: segment.id,
      position: blueprint.placements.length,
      ...(input.label === undefined ? {} : { label: input.label }),
      defaultData:
        input.defaultData === undefined ? {} : { ...input.defaultData },
      ...(input.defaultDurationMs === undefined
        ? {}
        : { defaultDurationMs: input.defaultDurationMs }),
      ...(input.placementOverrides === undefined
        ? {}
        : { placementOverrides: { ...input.placementOverrides } }),
      ...createEntityMetadata(this.#dependencies.clock),
    } satisfies BlueprintSegmentPlacement;

    assertBlueprintPlacementOwnership({ blueprint, placement, segment });

    return saveBlueprint(
      this.#repositories.blueprints,
      touchEntity(
        { ...blueprint, placements: [...blueprint.placements, placement] },
        this.#dependencies,
      ),
    );
  }
}

export interface ReorderBlueprintPlacementsCommandInput {
  readonly blueprintId: ShowBlueprintId;
  readonly orderedPlacementIds: readonly BlueprintSegmentPlacementId[];
}

export class ReorderBlueprintPlacementsCommand {
  readonly #repository: BlueprintCommandRepositories["blueprints"];
  readonly #dependencies: DomainFactoryDependencies;

  constructor(
    repository: BlueprintCommandRepositories["blueprints"],
    dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {
    this.#repository = repository;
    this.#dependencies = dependencies;
  }

  async execute(
    input: ReorderBlueprintPlacementsCommandInput,
  ): Promise<ShowBlueprint> {
    const blueprint = requireEntity(
      await this.#repository.getById(input.blueprintId),
      "Show Blueprint",
    );
    const ordered = orderEntitiesById(
      blueprint.placements,
      input.orderedPlacementIds,
    ).map((placement, position) => ({
      ...placement,
      position,
      ...updateEntityMetadata(placement, this.#dependencies.clock),
    }));

    return saveBlueprint(
      this.#repository,
      touchEntity({ ...blueprint, placements: ordered }, this.#dependencies),
    );
  }
}

export interface DuplicateBlueprintPlacementCommandInput {
  readonly blueprintId: ShowBlueprintId;
  readonly placementId: BlueprintSegmentPlacementId;
}

export class DuplicateBlueprintPlacementCommand {
  readonly #repository: BlueprintCommandRepositories["blueprints"];
  readonly #dependencies: DomainFactoryDependencies;

  constructor(
    repository: BlueprintCommandRepositories["blueprints"],
    dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {
    this.#repository = repository;
    this.#dependencies = dependencies;
  }

  async execute(
    input: DuplicateBlueprintPlacementCommandInput,
  ): Promise<ShowBlueprint> {
    const blueprint = requireEntity(
      await this.#repository.getById(input.blueprintId),
      "Show Blueprint",
    );
    const sourceIndex = blueprint.placements.findIndex(
      (placement) => placement.id === input.placementId,
    );
    const source = requireEntity(
      blueprint.placements[sourceIndex] ?? null,
      "Blueprint placement",
    );
    const duplicate = {
      ...source,
      id: this.#dependencies.createId("blueprintSegmentPlacement"),
      defaultData: { ...source.defaultData },
      ...(source.placementOverrides === undefined
        ? {}
        : { placementOverrides: { ...source.placementOverrides } }),
      ...createEntityMetadata(this.#dependencies.clock),
    } satisfies BlueprintSegmentPlacement;
    const placements = [...blueprint.placements];
    placements.splice(sourceIndex + 1, 0, duplicate);
    const positioned = placements.map((placement, position) =>
      placement.id === duplicate.id
        ? { ...placement, position }
        : {
            ...placement,
            position,
            ...updateEntityMetadata(placement, this.#dependencies.clock),
          },
    );

    return saveBlueprint(
      this.#repository,
      touchEntity({ ...blueprint, placements: positioned }, this.#dependencies),
    );
  }
}

export interface RemoveBlueprintPlacementCommandInput {
  readonly blueprintId: ShowBlueprintId;
  readonly placementId: BlueprintSegmentPlacementId;
}

export class RemoveBlueprintPlacementCommand {
  readonly #repository: BlueprintCommandRepositories["blueprints"];
  readonly #dependencies: DomainFactoryDependencies;

  constructor(
    repository: BlueprintCommandRepositories["blueprints"],
    dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {
    this.#repository = repository;
    this.#dependencies = dependencies;
  }

  async execute(
    input: RemoveBlueprintPlacementCommandInput,
  ): Promise<ShowBlueprint> {
    const blueprint = requireEntity(
      await this.#repository.getById(input.blueprintId),
      "Show Blueprint",
    );
    const retained = blueprint.placements.filter(
      (placement) => placement.id !== input.placementId,
    );

    if (retained.length === blueprint.placements.length) {
      throwNotFound("Blueprint placement");
    }

    const placements = retained.map((placement, position) => ({
      ...placement,
      position,
      ...updateEntityMetadata(placement, this.#dependencies.clock),
    }));

    return saveBlueprint(
      this.#repository,
      touchEntity({ ...blueprint, placements }, this.#dependencies),
    );
  }
}
