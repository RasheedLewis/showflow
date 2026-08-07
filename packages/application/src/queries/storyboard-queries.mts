import {
  assertBlueprintPlacementOwnership,
  assertEpisodeSegmentOwnership,
  calculateEpisodeSegmentReadiness,
  deriveEpisodeSegmentSummary,
  validateEpisodeSegmentContent,
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
} from "@showflow/domain";

import { loadEntitiesById, requireQueryEntity } from "./query-support.mjs";
import type {
  EpisodeRepository,
  ShowBlueprintRepository,
  ShowRepository,
  ShowSegmentRepository,
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
  readonly shows: ShowRepository;
  readonly segments: ShowSegmentRepository;
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
    const items = episode.segments.map((episodeSegment) => {
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
      return {
        episodeSegment,
        readiness: calculateEpisodeSegmentReadiness(
          episodeSegment,
          sourceSegment,
        ),
        sourceSegment,
        ...(summary === undefined ? {} : { summary }),
        validationIssues: validateEpisodeSegmentContent(
          episodeSegment,
          sourceSegment,
        ),
      };
    });

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
