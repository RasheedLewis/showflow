import { describe, expect, test } from "vitest";
import {
  createEpisode,
  createEpisodeSegment,
  createFixedClock,
  createShow,
  createShowSegment,
  createStudio,
  parseEntityId,
  parseUtcTimestamp,
  type DomainFactoryDependencies,
  type EntityId,
  type EntityIdKind,
  type Episode,
  type EpisodeId,
  type Layout,
  type LayoutId,
} from "@showflow/domain";

import { CreateEpisodeLayoutCommand } from "./layout-commands.mjs";

let suffix = 1;
const dependencies: DomainFactoryDependencies = {
  clock: createFixedClock(parseUtcTimestamp("2026-08-08T12:00:00.000Z")),
  createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
    parseEntityId<TEntity>(
      `01942c1f-ae8f-7e42-b900-${(suffix++).toString(16).padStart(12, "0")}`,
    ),
};

describe("Sprint 10 Layout commands", () => {
  test("10.T10 creates at Show scope from Episode context and assigns the origin", async () => {
    const studio = createStudio({ name: "Studio" }, dependencies);
    const show = createShow(
      { studioId: studio.id, name: "Show" },
      dependencies,
    );
    const source = createShowSegment(
      { showId: show.id, name: "Interview" },
      dependencies,
    );
    const baseEpisode = createEpisode(
      { showId: show.id, title: "Episode" },
      dependencies,
    );
    const occurrence = createEpisodeSegment(
      { episode: baseEpisode, sourceSegment: source, position: 0 },
      dependencies,
    );
    const episodes = new Map<EpisodeId, Episode>([
      [baseEpisode.id, { ...baseEpisode, segments: [occurrence] }],
    ]);
    const layouts = new Map<LayoutId, Layout>();
    const repositories = {
      episodes: {
        getById: async (id: EpisodeId) => episodes.get(id) ?? null,
        listByShowId: async () => [...episodes.values()],
        save: async (episode: Episode) => {
          episodes.set(episode.id, episode);
        },
      },
      creation: {
        create: async (layout: Layout, episode: Episode) => {
          layouts.set(layout.id, layout);
          episodes.set(episode.id, episode);
        },
      },
    };
    const layout = await new CreateEpisodeLayoutCommand(
      repositories,
      dependencies,
    ).execute({
      episodeId: baseEpisode.id,
      episodeSegmentId: occurrence.id,
      expectedShowId: show.id,
      name: "Episode interview",
      presetId: "host",
      aspectRatio: "16:9",
    });
    expect(layout.showId).toBe(show.id);
    expect(
      episodes.get(baseEpisode.id)?.segments[0]?.defaultLayoutOverrideId,
    ).toBe(layout.id);
  });
});
