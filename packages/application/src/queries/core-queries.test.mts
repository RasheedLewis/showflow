import { describe, expect, test } from "vitest";

import {
  createEpisode,
  createFixedClock,
  createLayout,
  createSegmentDataField,
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
  EpisodeId,
  EpisodeSegment,
  Layout,
  LayoutId,
  Show,
  ShowBlueprint,
  ShowBlueprintId,
  ShowId,
  ShowSegment,
  ShowSegmentId,
  Studio,
  StudioId,
} from "@showflow/domain";

import {
  GetBlueprintQuery,
  GetEpisodeStoryboardQuery,
  GetShowDetailQuery,
  GetStudioQuery,
  GetStudioHomeQuery,
  ListStudioShowsQuery,
  ListSegmentCatalogQuery,
  ListStudiosQuery,
  calculateEpisodeProgress,
} from "./index.mjs";
import type {
  EpisodeRepository,
  LayoutRepository,
  ShowBlueprintRepository,
  ShowRepository,
  ShowSegmentRepository,
  StudioRepository,
} from "../repositories/repositories.mjs";

const entityId = <TEntity extends EntityIdKind>(
  suffix: number,
): EntityId<TEntity> =>
  parseEntityId<TEntity>(
    `01942c1f-ae8f-7e42-b900-${suffix.toString(16).padStart(12, "0")}`,
  );

const timestamp = parseUtcTimestamp("2026-08-05T15:42:03.125Z");
const metadata = { createdAt: timestamp, updatedAt: timestamp } as const;

const factoryDependencies = (suffix: number): DomainFactoryDependencies => ({
  clock: createFixedClock(timestamp),
  createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
    entityId<TEntity>(suffix),
});

interface QueryTestData {
  readonly studio: Studio;
  readonly firstShow: Show;
  readonly secondShow: Show;
  readonly blueprint: ShowBlueprint;
  readonly firstSegment: ShowSegment;
  readonly secondSegment: ShowSegment;
  readonly layout: Layout;
  readonly firstEpisode: Episode;
  readonly secondEpisode: Episode;
}

const createQueryTestData = (): QueryTestData => {
  const studio = {
    id: entityId<"studio">(1),
    name: "Public Sphere",
    ...metadata,
  } satisfies Studio;
  const firstShow = {
    id: entityId<"show">(2),
    studioId: studio.id,
    name: "Top 10 Music Videos",
    styleDefaults: {},
    ...metadata,
  } satisfies Show;
  const secondShow = {
    id: entityId<"show">(3),
    studioId: studio.id,
    name: "Artist Interviews",
    styleDefaults: {},
    ...metadata,
  } satisfies Show;
  const firstSegmentBase = createShowSegment(
    { showId: firstShow.id, name: "Opening" },
    factoryDependencies(10),
  );
  const firstSegment = {
    ...firstSegmentBase,
    dataFields: [
      createSegmentDataField(
        {
          label: "Title",
          position: 0,
          showSegmentId: firstSegmentBase.id,
          type: "shortText",
        },
        factoryDependencies(12),
      ),
    ],
  };
  const secondSegment = createShowSegment(
    { showId: firstShow.id, name: "Interview" },
    factoryDependencies(11),
  );
  const blueprintId = entityId<"showBlueprint">(20);
  const firstPlacement = {
    id: entityId<"blueprintSegmentPlacement">(21),
    showBlueprintId: blueprintId,
    showSegmentId: firstSegment.id,
    position: 0,
    defaultData: {},
    ...metadata,
  } satisfies BlueprintSegmentPlacement;
  const duplicatePlacement = {
    id: entityId<"blueprintSegmentPlacement">(22),
    showBlueprintId: blueprintId,
    showSegmentId: firstSegment.id,
    position: 1,
    label: "Encore",
    defaultData: { title: "One more" },
    ...metadata,
  } satisfies BlueprintSegmentPlacement;
  const blueprint = {
    id: blueprintId,
    showId: firstShow.id,
    placements: [firstPlacement, duplicatePlacement],
    ...metadata,
  } satisfies ShowBlueprint;
  const layout = createLayout(
    { showId: firstShow.id, name: "Host" },
    factoryDependencies(30),
  );
  const firstEpisodeBase = createEpisode(
    { showId: firstShow.id, title: "Episode 1" },
    factoryDependencies(40),
  );
  const firstEpisodeSegment = {
    id: entityId<"episodeSegment">(41),
    episodeId: firstEpisodeBase.id,
    sourceShowSegmentId: firstSegment.id,
    position: 0,
    fieldValues: { title: "Opening" },
    notes: "",
    fixedResourceReplacements: [],
    ...metadata,
  } satisfies EpisodeSegment;
  const duplicateEpisodeSegment = {
    id: entityId<"episodeSegment">(42),
    episodeId: firstEpisodeBase.id,
    sourceShowSegmentId: firstSegment.id,
    position: 1,
    fieldValues: { title: "Encore" },
    notes: "Close the Show.",
    fixedResourceReplacements: [],
    ...metadata,
  } satisfies EpisodeSegment;
  const firstEpisode = {
    ...firstEpisodeBase,
    segments: [firstEpisodeSegment, duplicateEpisodeSegment],
  } satisfies Episode;
  const secondEpisode = createEpisode(
    { showId: secondShow.id, title: "Episode A" },
    factoryDependencies(43),
  );

  return {
    studio,
    firstShow,
    secondShow,
    blueprint,
    firstSegment,
    secondSegment,
    layout,
    firstEpisode,
    secondEpisode,
  };
};

const unexpectedSave = async (): Promise<void> => {
  throw new Error("A read-only query attempted to save an entity.");
};

const studioRepository = (studios: readonly Studio[]): StudioRepository => {
  const byId = new Map(studios.map((studio) => [studio.id, studio]));
  return {
    getById: async (studioId: StudioId) => byId.get(studioId) ?? null,
    list: async () => studios,
    save: unexpectedSave,
  };
};

const showRepository = (shows: readonly Show[]): ShowRepository => {
  const byId = new Map(shows.map((show) => [show.id, show]));
  return {
    getById: async (showId: ShowId) => byId.get(showId) ?? null,
    listByStudioId: async (studioId: StudioId) =>
      shows.filter((show) => show.studioId === studioId),
    save: unexpectedSave,
  };
};

const blueprintRepository = (
  blueprints: readonly ShowBlueprint[],
): ShowBlueprintRepository => {
  const byId = new Map(
    blueprints.map((blueprint) => [blueprint.id, blueprint]),
  );
  return {
    getById: async (blueprintId: ShowBlueprintId) =>
      byId.get(blueprintId) ?? null,
    getByShowId: async (showId: ShowId) =>
      blueprints.find((blueprint) => blueprint.showId === showId) ?? null,
    save: unexpectedSave,
  };
};

const segmentRepository = (
  segments: readonly ShowSegment[],
  onGetById: () => void = () => undefined,
): ShowSegmentRepository => {
  const byId = new Map(segments.map((segment) => [segment.id, segment]));
  return {
    getById: async (showSegmentId: ShowSegmentId) => {
      onGetById();
      return byId.get(showSegmentId) ?? null;
    },
    listByShowId: async (showId: ShowId) =>
      segments.filter((segment) => segment.showId === showId),
    save: unexpectedSave,
  };
};

const layoutRepository = (layouts: readonly Layout[]): LayoutRepository => {
  const byId = new Map(layouts.map((layout) => [layout.id, layout]));
  return {
    getById: async (layoutId: LayoutId) => byId.get(layoutId) ?? null,
    listByShowId: async (showId: ShowId) =>
      layouts.filter((layout) => layout.showId === showId),
    save: unexpectedSave,
  };
};

const episodeRepository = (episodes: readonly Episode[]): EpisodeRepository => {
  const byId = new Map(episodes.map((episode) => [episode.id, episode]));
  return {
    getById: async (episodeId: EpisodeId) => byId.get(episodeId) ?? null,
    listByShowId: async (showId: ShowId) =>
      episodes.filter((episode) => episode.showId === showId),
    save: unexpectedSave,
  };
};

describe("Studio queries", () => {
  test("gets one Studio and returns a stable not-found error", async () => {
    const data = createQueryTestData();
    const query = new GetStudioQuery(studioRepository([data.studio]));

    await expect(query.execute(data.studio.id)).resolves.toEqual(data.studio);
    await expect(query.execute(entityId<"studio">(999))).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Studio was not found.",
    });
  });

  test("lists Studios in repository order", async () => {
    const data = createQueryTestData();
    const anotherStudio = {
      id: entityId<"studio">(100),
      name: "Second Studio",
      ...metadata,
    } satisfies Studio;

    await expect(
      new ListStudiosQuery(
        studioRepository([data.studio, anotherStudio]),
      ).execute(),
    ).resolves.toEqual([data.studio, anotherStudio]);
  });

  test("returns Studio Home Shows with counts instead of expanded Episodes", async () => {
    const data = createQueryTestData();
    const result = await new GetStudioHomeQuery({
      studios: studioRepository([data.studio]),
      shows: showRepository([data.firstShow, data.secondShow]),
      episodes: episodeRepository([data.firstEpisode, data.secondEpisode]),
    }).execute(data.studio.id);

    expect(result).toEqual({
      studio: data.studio,
      shows: [
        { show: data.firstShow, episodeCount: 1 },
        { show: data.secondShow, episodeCount: 1 },
      ],
    });
    expect(result.shows[0]).not.toHaveProperty("episodes");
  });

  test("lists Show cards with authoritative Episode counts", async () => {
    const data = createQueryTestData();
    const result = await new ListStudioShowsQuery({
      episodes: episodeRepository([data.firstEpisode, data.secondEpisode]),
      studios: studioRepository([data.studio]),
      shows: showRepository([data.firstShow, data.secondShow]),
    }).execute(data.studio.id);

    expect(result).toEqual([
      { show: data.firstShow, episodeCount: 1 },
      { show: data.secondShow, episodeCount: 1 },
    ]);
  });
});

describe("Show queries", () => {
  test("composes complete Show Detail data without changing repository order", async () => {
    const data = createQueryTestData();
    const result = await new GetShowDetailQuery({
      shows: showRepository([data.firstShow]),
      blueprints: blueprintRepository([data.blueprint]),
      segments: segmentRepository([data.firstSegment, data.secondSegment]),
      layouts: layoutRepository([data.layout]),
      episodes: episodeRepository([data.firstEpisode]),
    }).execute(data.firstShow.id);

    expect(result).toEqual({
      show: data.firstShow,
      blueprint: data.blueprint,
      segments: [data.firstSegment, data.secondSegment],
      layouts: [data.layout],
      episodes: [data.firstEpisode],
    });
  });

  test("lists the Segment Catalog only for an existing Show", async () => {
    const data = createQueryTestData();
    const query = new ListSegmentCatalogQuery({
      shows: showRepository([data.firstShow]),
      segments: segmentRepository([data.firstSegment, data.secondSegment]),
    });

    await expect(query.execute(data.firstShow.id)).resolves.toEqual([
      data.firstSegment,
      data.secondSegment,
    ]);
    await expect(query.execute(entityId<"show">(999))).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("Storyboard queries", () => {
  test("pairs ordered Blueprint placements with uniquely loaded source Segments", async () => {
    const data = createQueryTestData();
    let sourceLoadCount = 0;
    const result = await new GetBlueprintQuery({
      blueprints: blueprintRepository([data.blueprint]),
      segments: segmentRepository([data.firstSegment], () => {
        sourceLoadCount += 1;
      }),
    }).execute(data.firstShow.id);

    expect(result.blueprint).toBe(data.blueprint);
    expect(result.placements).toEqual(
      data.blueprint.placements.map((placement) => ({
        placement,
        segment: data.firstSegment,
      })),
    );
    expect(sourceLoadCount).toBe(1);
  });

  test("rejects a Blueprint Segment reference that crosses Shows", async () => {
    const data = createQueryTestData();
    const crossShowSegment = createShowSegment(
      { showId: data.secondShow.id, name: "Other Show Segment" },
      factoryDependencies(101),
    );
    const placement = data.blueprint.placements[0];

    if (placement === undefined) {
      throw new Error("Expected a Blueprint placement.");
    }

    const invalidBlueprint = {
      ...data.blueprint,
      placements: [{ ...placement, showSegmentId: crossShowSegment.id }],
    } satisfies ShowBlueprint;

    await expect(
      new GetBlueprintQuery({
        blueprints: blueprintRepository([invalidBlueprint]),
        segments: segmentRepository([crossShowSegment]),
      }).execute(data.firstShow.id),
    ).rejects.toMatchObject({ code: "INVALID_OWNERSHIP" });
  });

  test("pairs Episode Storyboard items with uniquely loaded source Segments", async () => {
    const data = createQueryTestData();
    let sourceLoadCount = 0;
    const result = await new GetEpisodeStoryboardQuery({
      episodes: episodeRepository([data.firstEpisode]),
      shows: showRepository([data.firstShow]),
      segments: segmentRepository([data.firstSegment], () => {
        sourceLoadCount += 1;
      }),
    }).execute(data.firstEpisode.id);

    expect(result.episode).toBe(data.firstEpisode);
    expect(result.show).toBe(data.firstShow);
    expect(result.items).toEqual(
      data.firstEpisode.segments.map((episodeSegment) => ({
        episodeSegment,
        readiness: "ready",
        sourceSegment: data.firstSegment,
        summary: String(episodeSegment.fieldValues["title"]),
        validationIssues: [],
      })),
    );
    expect(sourceLoadCount).toBe(1);
  });

  test("6.T10 sums resolved expected durations and tolerates missing values", () => {
    const data = createQueryTestData();
    const first = data.firstEpisode.segments[0];
    const second = data.firstEpisode.segments[1];
    if (first === undefined || second === undefined) {
      throw new Error("Expected two Episode Segments.");
    }
    const progress = calculateEpisodeProgress([
      {
        episodeSegment: { ...first, expectedDurationOverrideMs: 30_000 },
        readiness: "needs-content",
        sourceSegment: { ...data.firstSegment, expectedDurationMs: 90_000 },
        validationIssues: [],
      },
      {
        episodeSegment: second,
        readiness: "needs-content",
        sourceSegment: { ...data.firstSegment, expectedDurationMs: 90_000 },
        validationIssues: [],
      },
      {
        episodeSegment: { ...second, id: entityId<"episodeSegment">(200) },
        readiness: "needs-content",
        sourceSegment: data.firstSegment,
        validationIssues: [],
      },
    ]);

    expect(progress).toEqual({
      estimatedRuntimeMs: 120_000,
      needsContentCount: 3,
      readyCount: 0,
      segmentCount: 3,
    });
  });

  test("rejects an Episode Storyboard source that crosses Shows", async () => {
    const data = createQueryTestData();
    const crossShowSegment = createShowSegment(
      { showId: data.secondShow.id, name: "Other Show Segment" },
      factoryDependencies(101),
    );
    const source = data.firstEpisode.segments[0];

    if (source === undefined) {
      throw new Error("Expected an Episode Segment.");
    }

    const invalidEpisode = {
      ...data.firstEpisode,
      segments: [{ ...source, sourceShowSegmentId: crossShowSegment.id }],
    } satisfies Episode;

    await expect(
      new GetEpisodeStoryboardQuery({
        episodes: episodeRepository([invalidEpisode]),
        shows: showRepository([data.firstShow]),
        segments: segmentRepository([crossShowSegment]),
      }).execute(invalidEpisode.id),
    ).rejects.toMatchObject({ code: "INVALID_OWNERSHIP" });
  });
});
