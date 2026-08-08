import {
  assertBlueprintPlacementOwnership,
  assertEpisodeSegmentOwnership,
  calculateEpisodeSegmentReadinessFromIssues,
  deriveEpisodeSegmentSummary,
  validateEpisodeSegmentContent,
  parseEntityId,
} from "@showflow/domain";
import type {
  BlueprintSegmentPlacement,
  Episode,
  EpisodeId,
  EpisodeSegment,
  EpisodeSegmentContentIssue,
  EpisodeSegmentReadiness,
  Show,
  ShowBlueprint,
  ShowId,
  ShowSegment,
  StudioId,
  Resource,
} from "@showflow/domain";

import { loadEntitiesById, requireQueryEntity } from "./query-support.mjs";
import type {
  EpisodeRepository,
  ShowBlueprintRepository,
  ShowRepository,
  ShowSegmentRepository,
  ResourceRepository,
} from "../repositories/repositories.mjs";
import { ApplicationError } from "../errors/application-error.mjs";

export interface BlueprintPlacementDetail {
  readonly placement: BlueprintSegmentPlacement;
  readonly segment: ShowSegment;
}

export interface BlueprintDetail {
  readonly blueprint: ShowBlueprint;
  readonly placements: readonly BlueprintPlacementDetail[];
}

type BlueprintRepositories = {
  readonly blueprints: ShowBlueprintRepository;
  readonly segments: ShowSegmentRepository;
};

export class GetBlueprintQuery {
  readonly #repositories: BlueprintRepositories;

  constructor(repositories: BlueprintRepositories) {
    this.#repositories = repositories;
  }

  async execute(showId: ShowId): Promise<BlueprintDetail> {
    const blueprint = requireQueryEntity(
      await this.#repositories.blueprints.getByShowId(showId),
      "Show Blueprint",
    );
    const segmentsById = await loadEntitiesById(
      blueprint.placements.map((placement) => placement.showSegmentId),
      (showSegmentId) => this.#repositories.segments.getById(showSegmentId),
      "Show Segment",
    );
    const placements = blueprint.placements.map((placement) => {
      const segment = requireQueryEntity(
        segmentsById.get(placement.showSegmentId) ?? null,
        "Show Segment",
      );
      assertBlueprintPlacementOwnership({ blueprint, placement, segment });
      return { placement, segment };
    });

    return { blueprint, placements };
  }
}

export interface EpisodeStoryboardItem {
  readonly episodeSegment: EpisodeSegment;
  readonly readiness: EpisodeSegmentReadiness;
  readonly sourceSegment: ShowSegment;
  readonly summary?: string;
  readonly validationIssues: readonly EpisodeSegmentContentIssue[];
}

export interface EpisodeStoryboard {
  readonly episode: Episode;
  readonly show: Show;
  readonly items: readonly EpisodeStoryboardItem[];
}

export interface EpisodeProgress {
  readonly estimatedRuntimeMs: number;
  readonly needsContentCount: number;
  readonly readyCount: number;
  readonly segmentCount: number;
}

export const calculateEpisodeProgress = (
  items: readonly EpisodeStoryboardItem[],
): EpisodeProgress => {
  const readyCount = items.filter(
    ({ readiness }) => readiness === "ready",
  ).length;
  return {
    estimatedRuntimeMs: items.reduce(
      (total, { episodeSegment, sourceSegment }) =>
        total +
        (episodeSegment.expectedDurationOverrideMs ??
          sourceSegment.expectedDurationMs ??
          0),
      0,
    ),
    needsContentCount: items.filter(
      ({ readiness }) => readiness === "needs-content",
    ).length,
    readyCount,
    segmentCount: items.length,
  };
};

type EpisodeStoryboardRepositories = {
  readonly episodes: EpisodeRepository;
  readonly resources?: ResourceRepository;
  readonly shows: ShowRepository;
  readonly segments: ShowSegmentRepository;
};

const expectedResourceCategory = (
  type: string,
): Resource["category"] | undefined => {
  if (type === "imageResource") return "image";
  if (type === "videoResource") return "video";
  if (type === "audioResource") return "audio";
  return undefined;
};

const resourceIsVisible = (
  resource: Resource,
  episode: Episode,
  show: Show,
): boolean => {
  switch (resource.owner.scope) {
    case "studio":
      return resource.owner.studioId === show.studioId;
    case "show":
      return resource.owner.showId === show.id;
    case "episode":
      return resource.owner.episodeId === episode.id;
  }
};

export class GetEpisodeStoryboardQuery {
  readonly #repositories: EpisodeStoryboardRepositories;

  constructor(repositories: EpisodeStoryboardRepositories) {
    this.#repositories = repositories;
  }

  async execute(episodeId: EpisodeId): Promise<EpisodeStoryboard> {
    const episode = requireQueryEntity(
      await this.#repositories.episodes.getById(episodeId),
      "Episode",
    );
    const [show, sourceSegmentsById] = await Promise.all([
      this.#repositories.shows
        .getById(episode.showId)
        .then((storedShow) => requireQueryEntity(storedShow, "Show")),
      loadEntitiesById(
        episode.segments.map((segment) => segment.sourceShowSegmentId),
        (showSegmentId) => this.#repositories.segments.getById(showSegmentId),
        "Show Segment",
      ),
    ]);
    const items = await Promise.all(
      episode.segments.map(async (episodeSegment) => {
        const sourceSegment = requireQueryEntity(
          sourceSegmentsById.get(episodeSegment.sourceShowSegmentId) ?? null,
          "Show Segment",
        );
        assertEpisodeSegmentOwnership({
          episode,
          episodeSegment,
          sourceSegment,
        });
        const summary = deriveEpisodeSegmentSummary(
          episodeSegment,
          sourceSegment,
        );
        const validationIssues = [
          ...validateEpisodeSegmentContent(episodeSegment, sourceSegment),
        ];
        for (const field of sourceSegment.dataFields) {
          const expectedCategory = expectedResourceCategory(field.type);
          const value = episodeSegment.fieldValues[field.key];
          if (expectedCategory === undefined || typeof value !== "string")
            continue;
          if (this.#repositories.resources === undefined) continue;
          let resource: Resource | null;
          try {
            resource = await this.#repositories.resources.getById(
              parseEntityId<"resource">(value),
            );
          } catch {
            continue;
          }
          if (
            resource === null ||
            resource.availability === "missing" ||
            resource.availability === "unavailable"
          ) {
            validationIssues.push({
              code: "EPISODE_RESOURCE_MISSING",
              fieldKey: field.key,
              message: `The ${sourceSegment.name} Segment cannot find ${field.label}. Locate it or choose a replacement.`,
              severity: "blocking",
            });
          } else if (resource.availability === "unsupported") {
            validationIssues.push({
              code: "EPISODE_RESOURCE_UNSUPPORTED",
              fieldKey: field.key,
              message: `${field.label} in the ${sourceSegment.name} Segment cannot be played by Showflow. Replace it with a supported file.`,
              severity: "blocking",
            });
          } else if (resource.category !== expectedCategory) {
            validationIssues.push({
              code: "EPISODE_RESOURCE_WRONG_TYPE",
              fieldKey: field.key,
              message: `${field.label} in the ${sourceSegment.name} Segment needs a ${expectedCategory} Resource. Choose a compatible file.`,
              severity: "blocking",
            });
          } else if (!resourceIsVisible(resource, episode, show)) {
            validationIssues.push({
              code: "EPISODE_RESOURCE_OUT_OF_SCOPE",
              fieldKey: field.key,
              message: `${field.label} is not available to this Episode. Import it into this Episode or its Show.`,
              severity: "blocking",
            });
          }
        }
        return {
          episodeSegment,
          readiness:
            calculateEpisodeSegmentReadinessFromIssues(validationIssues),
          sourceSegment,
          ...(summary === undefined ? {} : { summary }),
          validationIssues,
        };
      }),
    );

    return { episode, show, items };
  }
}

type EpisodeListRepositories = {
  readonly episodes: EpisodeRepository;
  readonly shows: ShowRepository;
};

export class ListEpisodesQuery {
  constructor(readonly repositories: EpisodeListRepositories) {}

  async execute(
    studioId: StudioId,
    showId: ShowId,
  ): Promise<readonly Episode[]> {
    const show = requireQueryEntity(
      await this.repositories.shows.getById(showId),
      "Show",
    );
    if (show.studioId !== studioId) {
      throw new ApplicationError("NOT_FOUND", "Show was not found.");
    }
    const episodes = await this.repositories.episodes.listByShowId(show.id);
    for (const episode of episodes) {
      if (episode.showId !== show.id) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "Episode belongs to another Show.",
        );
      }
    }
    return episodes;
  }
}
