import {
  assertBlueprintPlacementOwnership,
  assertEpisodeSegmentOwnership,
} from "@showflow/domain";
import type {
  BlueprintSegmentPlacement,
  Episode,
  EpisodeId,
  EpisodeSegment,
  Show,
  ShowBlueprint,
  ShowId,
  ShowSegment,
} from "@showflow/domain";

import { loadEntitiesById, requireQueryEntity } from "./query-support.mjs";
import type {
  EpisodeRepository,
  ShowBlueprintRepository,
  ShowRepository,
  ShowSegmentRepository,
} from "../repositories/repositories.mjs";

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
  readonly sourceSegment: ShowSegment;
}

export interface EpisodeStoryboard {
  readonly episode: Episode;
  readonly show: Show;
  readonly items: readonly EpisodeStoryboardItem[];
}

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
      return { episodeSegment, sourceSegment };
    });

    return { episode, show, items };
  }
}
