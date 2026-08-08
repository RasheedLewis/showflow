import {
  assertLayoutOwnedByShow,
  assertShowSegmentOwnedByShow,
  type Layout,
  type LayoutId,
  type ShowId,
  type StudioId,
} from "@showflow/domain";

import { requireQueryEntity } from "./query-support.mjs";
import { ApplicationError } from "../errors/application-error.mjs";
import type {
  LayoutRepository,
  EpisodeRepository,
  ShowRepository,
  ShowSegmentRepository,
} from "../repositories/repositories.mjs";

type LayoutQueryRepositories = {
  readonly layouts: LayoutRepository;
  readonly shows: ShowRepository;
};

export interface LayoutCatalogItem {
  readonly layout: Layout;
  readonly usageCount: number;
}

export class ListLayoutCatalogQuery {
  constructor(
    readonly repositories: LayoutQueryRepositories & {
      readonly episodes: EpisodeRepository;
      readonly segments: ShowSegmentRepository;
    },
  ) {}

  async execute(
    studioId: StudioId,
    showId: ShowId,
  ): Promise<readonly LayoutCatalogItem[]> {
    const show = requireQueryEntity(
      await this.repositories.shows.getById(showId),
      "Show",
    );
    if (show.studioId !== studioId) {
      throw new ApplicationError("NOT_FOUND", "Show was not found.");
    }
    const [layouts, segments, episodes] = await Promise.all([
      this.repositories.layouts.listByShowId(showId),
      this.repositories.segments.listByShowId(showId),
      this.repositories.episodes.listByShowId(showId),
    ]);
    for (const layout of layouts) assertLayoutOwnedByShow(layout, showId);
    for (const segment of segments)
      assertShowSegmentOwnedByShow(segment, showId);
    return layouts.map((layout) => ({
      layout,
      usageCount:
        segments.reduce(
          (count, segment) =>
            count + segment.layoutIds.filter((id) => id === layout.id).length,
          0,
        ) +
        episodes.reduce(
          (count, episode) =>
            count +
            episode.segments.filter(
              ({ defaultLayoutOverrideId }) =>
                defaultLayoutOverrideId === layout.id,
            ).length,
          0,
        ),
    }));
  }
}

export class GetLayoutEditorQuery {
  constructor(readonly repositories: LayoutQueryRepositories) {}

  async execute(
    studioId: StudioId,
    showId: ShowId,
    layoutId: LayoutId,
  ): Promise<Layout> {
    const show = requireQueryEntity(
      await this.repositories.shows.getById(showId),
      "Show",
    );
    if (show.studioId !== studioId) {
      throw new ApplicationError("NOT_FOUND", "Show was not found.");
    }
    const layout = requireQueryEntity(
      await this.repositories.layouts.getById(layoutId),
      "Layout",
    );
    assertLayoutOwnedByShow(layout, showId);
    return layout;
  }
}
