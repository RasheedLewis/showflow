import {
  assertEpisodeOwnedByShow,
  assertLayoutOwnedByShow,
  assertShowSegmentOwnedByShow,
} from "@showflow/domain";
import type {
  Episode,
  Layout,
  Show,
  ShowBlueprint,
  ShowId,
  ShowSegment,
} from "@showflow/domain";

import { requireQueryEntity } from "./query-support.mjs";
import type {
  EpisodeRepository,
  LayoutRepository,
  ShowBlueprintRepository,
  ShowRepository,
  ShowSegmentRepository,
} from "../repositories/repositories.mjs";

export interface ShowDetail {
  readonly show: Show;
  readonly blueprint: ShowBlueprint;
  readonly segments: readonly ShowSegment[];
  readonly layouts: readonly Layout[];
  readonly episodes: readonly Episode[];
}

type ShowDetailRepositories = {
  readonly shows: ShowRepository;
  readonly blueprints: ShowBlueprintRepository;
  readonly segments: ShowSegmentRepository;
  readonly layouts: LayoutRepository;
  readonly episodes: EpisodeRepository;
};

export class GetShowDetailQuery {
  readonly #repositories: ShowDetailRepositories;

  constructor(repositories: ShowDetailRepositories) {
    this.#repositories = repositories;
  }

  async execute(showId: ShowId): Promise<ShowDetail> {
    const show = requireQueryEntity(
      await this.#repositories.shows.getById(showId),
      "Show",
    );
    const [storedBlueprint, segments, layouts, episodes] = await Promise.all([
      this.#repositories.blueprints.getByShowId(show.id),
      this.#repositories.segments.listByShowId(show.id),
      this.#repositories.layouts.listByShowId(show.id),
      this.#repositories.episodes.listByShowId(show.id),
    ]);
    const blueprint = requireQueryEntity(storedBlueprint, "Show Blueprint");

    for (const segment of segments) {
      assertShowSegmentOwnedByShow(segment, show.id);
    }
    for (const layout of layouts) {
      assertLayoutOwnedByShow(layout, show.id);
    }
    for (const episode of episodes) {
      assertEpisodeOwnedByShow(episode, show.id);
    }

    return { show, blueprint, segments, layouts, episodes };
  }
}

type SegmentCatalogRepositories = {
  readonly shows: ShowRepository;
  readonly segments: ShowSegmentRepository;
};

export class ListSegmentCatalogQuery {
  readonly #repositories: SegmentCatalogRepositories;

  constructor(repositories: SegmentCatalogRepositories) {
    this.#repositories = repositories;
  }

  async execute(showId: ShowId): Promise<readonly ShowSegment[]> {
    const show = requireQueryEntity(
      await this.#repositories.shows.getById(showId),
      "Show",
    );
    const segments = await this.#repositories.segments.listByShowId(show.id);

    for (const segment of segments) {
      assertShowSegmentOwnedByShow(segment, show.id);
    }

    return segments;
  }
}
