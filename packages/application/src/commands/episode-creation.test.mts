import { describe, expect, test } from "vitest";

import {
  createFixedClock,
  createShowSegment,
  parseEntityId,
  parseUtcTimestamp,
} from "@showflow/domain";
import type {
  BlueprintSegmentPlacement,
  DomainFactoryDependencies,
  EntityId,
  EntityIdKind,
  Episode,
  Show,
  ShowBlueprint,
  ShowSegment,
} from "@showflow/domain";

import {
  mapEpisodeFromBlueprint,
  RepositoryEpisodeFromBlueprintCreator,
} from "./episode-creation.mjs";
import type { EpisodeCreationRepositories } from "./episode-creation.mjs";

const entityId = <TEntity extends EntityIdKind>(
  suffix: number,
): EntityId<TEntity> =>
  parseEntityId<TEntity>(
    `01942c1f-ae8f-7e42-b900-${suffix.toString(16).padStart(12, "0")}`,
  );

const timestamp = parseUtcTimestamp("2026-08-06T10:00:00.000Z");
const metadata = { createdAt: timestamp, updatedAt: timestamp } as const;

const sequentialDependencies = (
  firstSuffix = 100,
): DomainFactoryDependencies => {
  let suffix = firstSuffix;

  return {
    clock: createFixedClock(timestamp),
    createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> => {
      const id = entityId<TEntity>(suffix);
      suffix += 1;
      return id;
    },
  };
};

const fixedDependencies = (suffix: number): DomainFactoryDependencies => ({
  clock: createFixedClock(timestamp),
  createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
    entityId<TEntity>(suffix),
});

const show = {
  id: entityId<"show">(1),
  studioId: entityId<"studio">(2),
  name: "Public Sphere",
  styleDefaults: {},
  ...metadata,
} satisfies Show;

const interview = createShowSegment(
  {
    showId: show.id,
    name: "Interview",
    notesTemplate: "Confirm the guest pronunciation.",
  },
  fixedDependencies(10),
);

const createPlacement = (
  suffix: number,
  position: number,
  defaultData: BlueprintSegmentPlacement["defaultData"],
): BlueprintSegmentPlacement => ({
  id: entityId<"blueprintSegmentPlacement">(suffix),
  showBlueprintId: entityId<"showBlueprint">(20),
  showSegmentId: interview.id,
  position,
  label: position === 0 ? "First interview" : "Second interview",
  defaultData,
  ...(position === 0 ? { defaultDurationMs: 120_000 } : {}),
  ...metadata,
});

const blueprintWith = (
  placements: readonly BlueprintSegmentPlacement[],
): ShowBlueprint => ({
  id: entityId<"showBlueprint">(20),
  showId: show.id,
  placements,
  ...metadata,
});

describe("Episode creation mapping", () => {
  test("2.T9 creates an Episode with an empty Storyboard", () => {
    const episode = mapEpisodeFromBlueprint(
      {
        episode: { showId: show.id, title: "Episode 1" },
        blueprint: blueprintWith([]),
        sourceSegments: [],
      },
      sequentialDependencies(),
    );

    expect(episode).toMatchObject({
      id: entityId<"episode">(100),
      showId: show.id,
      title: "Episode 1",
      status: "draft",
      segments: [],
    });
  });

  test("2.T10 and 2.T11 copy ordered defaults into independent duplicate-source Segments", () => {
    const firstDefaults = {
      lowerThird: { title: "Ada Lovelace", tags: ["guest", "live"] },
    } as const;
    const secondDefaults = { lowerThird: { title: "Grace Hopper" } } as const;
    const blueprint = blueprintWith([
      createPlacement(21, 0, firstDefaults),
      createPlacement(22, 1, secondDefaults),
    ]);
    const episode = mapEpisodeFromBlueprint(
      {
        episode: { showId: show.id, title: "Episode 2" },
        blueprint,
        sourceSegments: [interview],
      },
      sequentialDependencies(),
    );

    expect(episode.segments).toEqual([
      expect.objectContaining({
        id: entityId<"episodeSegment">(101),
        episodeId: episode.id,
        sourceShowSegmentId: interview.id,
        position: 0,
        label: "First interview",
        fieldValues: firstDefaults,
        notes: "Confirm the guest pronunciation.",
        expectedDurationOverrideMs: 120_000,
      }),
      expect.objectContaining({
        id: entityId<"episodeSegment">(102),
        episodeId: episode.id,
        sourceShowSegmentId: interview.id,
        position: 1,
        label: "Second interview",
        fieldValues: secondDefaults,
        notes: "Confirm the guest pronunciation.",
      }),
    ]);
    expect(episode.segments[0]?.id).not.toBe(episode.segments[1]?.id);
    expect(episode.segments[0]?.fieldValues).not.toBe(firstDefaults);
    expect(episode.segments[0]?.fieldValues["lowerThird"]).not.toBe(
      firstDefaults.lowerThird,
    );
  });

  test("2.T12 does not save a partial Episode when Segment mapping fails", async () => {
    const blueprint = blueprintWith([
      createPlacement(21, 0, {}),
      createPlacement(22, 1, {}),
    ]);
    const savedEpisodes: Episode[] = [];
    const repositories = {
      shows: {
        getById: async () => show,
        listByStudioId: async () => [show],
        save: async () => undefined,
      },
      blueprints: {
        getById: async () => blueprint,
        getByShowId: async () => blueprint,
        save: async () => undefined,
      },
      segments: {
        getById: async () => interview,
        listByShowId: async () => [interview],
        save: async () => undefined,
      },
      episodes: {
        getById: async () => null,
        listByShowId: async () => savedEpisodes,
        save: async (episode: Episode) => {
          savedEpisodes.push(episode);
        },
      },
    } satisfies EpisodeCreationRepositories;
    let idCallCount = 0;
    const failingDependencies: DomainFactoryDependencies = {
      clock: createFixedClock(timestamp),
      createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> => {
        idCallCount += 1;
        if (idCallCount === 3) {
          throw new Error("Episode Segment creation failed.");
        }
        return entityId<TEntity>(100 + idCallCount);
      },
    };

    await expect(
      new RepositoryEpisodeFromBlueprintCreator().create(
        { showId: show.id, title: "Episode 3" },
        repositories,
        failingDependencies,
      ),
    ).rejects.toThrow("Episode Segment creation failed.");
    expect(savedEpisodes).toEqual([]);
  });

  test("loads a duplicate source Segment once and saves the complete aggregate once", async () => {
    const blueprint = blueprintWith([
      createPlacement(21, 0, { title: "First" }),
      createPlacement(22, 1, { title: "Second" }),
    ]);
    const savedEpisodes: Episode[] = [];
    let sourceReadCount = 0;
    const repositories = {
      shows: {
        getById: async () => show,
        listByStudioId: async () => [show],
        save: async () => undefined,
      },
      blueprints: {
        getById: async () => blueprint,
        getByShowId: async () => blueprint,
        save: async () => undefined,
      },
      segments: {
        getById: async (): Promise<ShowSegment> => {
          sourceReadCount += 1;
          return interview;
        },
        listByShowId: async () => [interview],
        save: async () => undefined,
      },
      episodes: {
        getById: async () => null,
        listByShowId: async () => savedEpisodes,
        save: async (episode: Episode) => {
          savedEpisodes.push(episode);
        },
      },
    } satisfies EpisodeCreationRepositories;

    const created = await new RepositoryEpisodeFromBlueprintCreator().create(
      { showId: show.id, title: "Episode 4" },
      repositories,
      sequentialDependencies(),
    );

    expect(sourceReadCount).toBe(1);
    expect(savedEpisodes).toEqual([created]);
    expect(savedEpisodes[0]?.segments).toHaveLength(2);
  });
});
