import {
  assertBlueprintPlacementOwnership,
  createEpisode,
  createEpisodeSegment,
} from "@showflow/domain";
import type {
  DomainFactoryDependencies,
  Episode,
  JsonObject,
  JsonValue,
  ShowBlueprint,
  ShowSegment,
  ShowSegmentId,
  CreateEpisodeInput,
} from "@showflow/domain";

import { requireEntity } from "./command-support.mjs";
import type { TransactionRepositories } from "../repositories/repositories.mjs";

const cloneJsonValue = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map(cloneJsonValue);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneJsonValue(entry)]),
    );
  }

  return value;
};

const cloneJsonObject = (value: JsonObject): JsonObject =>
  Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, cloneJsonValue(entry)]),
  );

export interface EpisodeFromBlueprintMappingInput {
  readonly episode: CreateEpisodeInput;
  readonly blueprint: ShowBlueprint;
  readonly sourceSegments: readonly ShowSegment[];
}

export const mapEpisodeFromBlueprint = (
  input: EpisodeFromBlueprintMappingInput,
  dependencies: DomainFactoryDependencies,
): Episode => {
  const episode = createEpisode(input.episode, dependencies);
  const sourceSegmentsById = new Map<ShowSegmentId, ShowSegment>(
    input.sourceSegments.map((segment) => [segment.id, segment]),
  );
  const segments = input.blueprint.placements.map((placement) => {
    const sourceSegment = requireEntity(
      sourceSegmentsById.get(placement.showSegmentId) ?? null,
      "Show Segment",
    );

    assertBlueprintPlacementOwnership({
      blueprint: input.blueprint,
      placement,
      segment: sourceSegment,
    });

    return createEpisodeSegment(
      {
        episode,
        sourceSegment,
        position: placement.position,
        ...(placement.label === undefined ? {} : { label: placement.label }),
        fieldValues: cloneJsonObject(placement.defaultData),
        notes: sourceSegment.notesTemplate,
        ...(placement.defaultDurationMs === undefined
          ? {}
          : { expectedDurationOverrideMs: placement.defaultDurationMs }),
      },
      dependencies,
    );
  });

  return { ...episode, segments };
};

export interface EpisodeFromBlueprintCreator {
  create(
    input: CreateEpisodeInput,
    repositories: EpisodeCreationRepositories,
    dependencies: DomainFactoryDependencies,
  ): Promise<Episode>;
}

export type EpisodeCreationRepositories = Pick<
  TransactionRepositories,
  "blueprints" | "episodes" | "segments" | "shows"
>;

export class RepositoryEpisodeFromBlueprintCreator implements EpisodeFromBlueprintCreator {
  async create(
    input: CreateEpisodeInput,
    repositories: EpisodeCreationRepositories,
    dependencies: DomainFactoryDependencies,
  ): Promise<Episode> {
    const show = requireEntity(
      await repositories.shows.getById(input.showId),
      "Show",
    );
    const blueprint = requireEntity(
      await repositories.blueprints.getByShowId(show.id),
      "Show Blueprint",
    );
    const sourceSegmentIds = [
      ...new Set(
        blueprint.placements.map((placement) => placement.showSegmentId),
      ),
    ];
    const sourceSegments = await Promise.all(
      sourceSegmentIds.map(async (showSegmentId) =>
        requireEntity(
          await repositories.segments.getById(showSegmentId),
          "Show Segment",
        ),
      ),
    );
    const episode = mapEpisodeFromBlueprint(
      { episode: input, blueprint, sourceSegments },
      dependencies,
    );

    await repositories.episodes.save(episode);
    return episode;
  }
}
