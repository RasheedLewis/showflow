import { describe, expect, test } from "vitest";

import {
  createEpisode,
  createFixedClock,
  createShowSegment,
  parseEntityId,
  parseUtcTimestamp,
} from "@showflow/domain";
import type {
  BlueprintSegmentPlacement,
  Component,
  ComponentId,
  DomainFactoryDependencies,
  EntityId,
  EntityIdKind,
  Episode,
  EpisodeId,
  EpisodeSegment,
  Layout,
  LayoutId,
  Resource,
  ResourceId,
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
  AddSegmentToBlueprintCommand,
  CreateEpisodeFromBlueprintCommand,
  CreateLayoutCommand,
  CreateShowCommand,
  CreateShowSegmentCommand,
  CreateStudioCommand,
  DuplicateBlueprintPlacementCommand,
  DuplicateEpisodeSegmentCommand,
  RemoveBlueprintPlacementCommand,
  RemoveEpisodeSegmentCommand,
  RenameShowCommand,
  RenameStudioCommand,
  ReorderBlueprintPlacementsCommand,
  ReorderEpisodeSegmentsCommand,
} from "./index.mjs";
import type { EpisodeFromBlueprintCreator } from "./index.mjs";
import type { EpisodeCreationRepositories } from "./index.mjs";
import type {
  ApplicationRepositories,
  TransactionRepositories,
} from "../repositories/repositories.mjs";
import type {
  ApplicationSettings,
  ApplicationSettingsRepository,
} from "../settings/application-settings.mjs";

const entityId = <TEntity extends EntityIdKind>(
  suffix: number,
): EntityId<TEntity> =>
  parseEntityId<TEntity>(
    `01942c1f-ae8f-7e42-b900-${suffix.toString(16).padStart(12, "0")}`,
  );

const createdAt = parseUtcTimestamp("2026-08-05T15:42:03.125Z");
const updatedAt = parseUtcTimestamp("2026-08-05T16:00:00.000Z");
const metadata = { createdAt, updatedAt: createdAt } as const;

const factoryDependencies = (
  suffix: number,
  timestamp = createdAt,
): DomainFactoryDependencies => ({
  clock: createFixedClock(timestamp),
  createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
    entityId<TEntity>(suffix),
});

const commandDependencies = (firstSuffix = 500): DomainFactoryDependencies => {
  let suffix = firstSuffix;

  return {
    clock: createFixedClock(updatedAt),
    createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> => {
      const id = entityId<TEntity>(suffix);
      suffix += 1;
      return id;
    },
  };
};

interface TestData {
  readonly studio: Studio;
  readonly show: Show;
  readonly blueprint: ShowBlueprint;
  readonly firstSegment: ShowSegment;
  readonly secondSegment: ShowSegment;
  readonly episode: Episode;
}

const createTestData = (): TestData => {
  const studio = {
    id: entityId<"studio">(1),
    name: "Public Sphere",
    ...metadata,
  } satisfies Studio;
  const show = {
    id: entityId<"show">(2),
    studioId: studio.id,
    name: "Top 10 Music Videos",
    styleDefaults: {},
    ...metadata,
  } satisfies Show;
  const firstSegment = createShowSegment(
    { showId: show.id, name: "Opening" },
    factoryDependencies(10),
  );
  const secondSegment = createShowSegment(
    { showId: show.id, name: "Interview" },
    factoryDependencies(11),
  );
  const blueprintId = entityId<"showBlueprint">(20);
  const firstPlacement = {
    id: entityId<"blueprintSegmentPlacement">(21),
    showBlueprintId: blueprintId,
    showSegmentId: firstSegment.id,
    position: 0,
    label: "Cold open",
    defaultData: { lowerThirdTitle: "This week" },
    defaultDurationMs: 60_000,
    placementOverrides: { emphasis: true },
    ...metadata,
  } satisfies BlueprintSegmentPlacement;
  const secondPlacement = {
    id: entityId<"blueprintSegmentPlacement">(22),
    showBlueprintId: blueprintId,
    showSegmentId: secondSegment.id,
    position: 1,
    defaultData: {},
    ...metadata,
  } satisfies BlueprintSegmentPlacement;
  const blueprint = {
    id: blueprintId,
    showId: show.id,
    placements: [firstPlacement, secondPlacement],
    ...metadata,
  } satisfies ShowBlueprint;
  const episodeId = entityId<"episode">(30);
  const firstEpisodeSegment = {
    id: entityId<"episodeSegment">(31),
    episodeId,
    sourceShowSegmentId: firstSegment.id,
    position: 0,
    label: "Opening label",
    fieldValues: { lowerThirdTitle: "Episode title" },
    notes: "Welcome viewers.",
    expectedDurationOverrideMs: 45_000,
    defaultLayoutOverrideId: entityId<"layout">(40),
    fixedResourceReplacements: [
      {
        componentPlacementId: entityId<"componentPlacement">(41),
        propertyKey: "logo",
        resourceId: entityId<"resource">(42),
      },
    ],
    ...metadata,
  } satisfies EpisodeSegment;
  const secondEpisodeSegment = {
    id: entityId<"episodeSegment">(32),
    episodeId,
    sourceShowSegmentId: secondSegment.id,
    position: 1,
    fieldValues: {},
    notes: "",
    fixedResourceReplacements: [],
    ...metadata,
  } satisfies EpisodeSegment;
  const episode = {
    id: episodeId,
    showId: show.id,
    title: "Episode 1",
    status: "draft",
    guestNames: [],
    internalNotes: "",
    segments: [firstEpisodeSegment, secondEpisodeSegment],
    ...metadata,
  } satisfies Episode;

  return {
    studio,
    show,
    blueprint,
    firstSegment,
    secondSegment,
    episode,
  };
};

interface RepositorySeeds {
  readonly studios?: readonly Studio[];
  readonly shows?: readonly Show[];
  readonly blueprints?: readonly ShowBlueprint[];
  readonly segments?: readonly ShowSegment[];
  readonly layouts?: readonly Layout[];
  readonly components?: readonly Component[];
  readonly resources?: readonly Resource[];
  readonly episodes?: readonly Episode[];
}

interface SavedEntities {
  readonly studios: Studio[];
  readonly shows: Show[];
  readonly blueprints: ShowBlueprint[];
  readonly segments: ShowSegment[];
  readonly layouts: Layout[];
  readonly components: Component[];
  readonly resources: Resource[];
  readonly episodes: Episode[];
}

interface TestRepositoryContext {
  readonly repositories: ApplicationRepositories;
  readonly saved: SavedEntities;
  readonly studios: Map<StudioId, Studio>;
  readonly shows: Map<ShowId, Show>;
  readonly blueprints: Map<ShowBlueprintId, ShowBlueprint>;
  readonly segments: Map<ShowSegmentId, ShowSegment>;
  readonly layouts: Map<LayoutId, Layout>;
  readonly components: Map<ComponentId, Component>;
  readonly resources: Map<ResourceId, Resource>;
  readonly episodes: Map<EpisodeId, Episode>;
  readonly getTransactionCount: () => number;
}

const settings: ApplicationSettings = {
  lastRoute: "/",
  lastStudioId: null,
  windowPreferences: null,
};

const settingsRepository: ApplicationSettingsRepository = {
  get: async () => settings,
  updateNavigation: async (navigation) => ({ ...settings, ...navigation }),
  updateWindowPreferences: async (windowPreferences) => ({
    ...settings,
    windowPreferences,
  }),
};

const createRepositories = (
  seeds: RepositorySeeds = {},
): TestRepositoryContext => {
  const studios = new Map((seeds.studios ?? []).map((item) => [item.id, item]));
  const shows = new Map((seeds.shows ?? []).map((item) => [item.id, item]));
  const blueprints = new Map(
    (seeds.blueprints ?? []).map((item) => [item.id, item]),
  );
  const segments = new Map(
    (seeds.segments ?? []).map((item) => [item.id, item]),
  );
  const layouts = new Map((seeds.layouts ?? []).map((item) => [item.id, item]));
  const components = new Map(
    (seeds.components ?? []).map((item) => [item.id, item]),
  );
  const resources = new Map(
    (seeds.resources ?? []).map((item) => [item.id, item]),
  );
  const episodes = new Map(
    (seeds.episodes ?? []).map((item) => [item.id, item]),
  );
  const saved: SavedEntities = {
    studios: [],
    shows: [],
    blueprints: [],
    segments: [],
    layouts: [],
    components: [],
    resources: [],
    episodes: [],
  };
  let transactionCount = 0;

  const transactionRepositories = {
    studios: {
      getById: async (id: StudioId) => studios.get(id) ?? null,
      list: async () => [...studios.values()],
      save: async (studio: Studio) => {
        saved.studios.push(studio);
        studios.set(studio.id, studio);
      },
    },
    shows: {
      getById: async (id: ShowId) => shows.get(id) ?? null,
      listByStudioId: async (studioId: StudioId) =>
        [...shows.values()].filter((show) => show.studioId === studioId),
      save: async (show: Show) => {
        saved.shows.push(show);
        shows.set(show.id, show);
      },
    },
    blueprints: {
      getById: async (id: ShowBlueprintId) => blueprints.get(id) ?? null,
      getByShowId: async (showId: ShowId) =>
        [...blueprints.values()].find((item) => item.showId === showId) ?? null,
      save: async (blueprint: ShowBlueprint) => {
        saved.blueprints.push(blueprint);
        blueprints.set(blueprint.id, blueprint);
      },
    },
    segments: {
      getById: async (id: ShowSegmentId) => segments.get(id) ?? null,
      listByShowId: async (showId: ShowId) =>
        [...segments.values()].filter((segment) => segment.showId === showId),
      save: async (segment: ShowSegment) => {
        saved.segments.push(segment);
        segments.set(segment.id, segment);
      },
    },
    layouts: {
      getById: async (id: LayoutId) => layouts.get(id) ?? null,
      listByShowId: async (showId: ShowId) =>
        [...layouts.values()].filter((layout) => layout.showId === showId),
      save: async (layout: Layout) => {
        saved.layouts.push(layout);
        layouts.set(layout.id, layout);
      },
    },
    components: {
      getById: async (id: ComponentId) => components.get(id) ?? null,
      listByShowId: async (showId: ShowId) =>
        [...components.values()].filter(
          (component) => component.showId === showId,
        ),
      save: async (component: Component) => {
        saved.components.push(component);
        components.set(component.id, component);
      },
    },
    resources: {
      getById: async (id: ResourceId) => resources.get(id) ?? null,
      listByOwner: async () => [...resources.values()],
      save: async (resource: Resource) => {
        saved.resources.push(resource);
        resources.set(resource.id, resource);
      },
    },
    episodes: {
      getById: async (id: EpisodeId) => episodes.get(id) ?? null,
      listByShowId: async (showId: ShowId) =>
        [...episodes.values()].filter((episode) => episode.showId === showId),
      save: async (episode: Episode) => {
        saved.episodes.push(episode);
        episodes.set(episode.id, episode);
      },
    },
    settings: settingsRepository,
  } satisfies TransactionRepositories;

  const repositories = {
    ...transactionRepositories,
    transactions: {
      run: async <TResult,>(
        operation: (repositories: TransactionRepositories) => Promise<TResult>,
      ): Promise<TResult> => {
        transactionCount += 1;
        return operation(transactionRepositories);
      },
    },
  } satisfies ApplicationRepositories;

  return {
    repositories,
    saved,
    studios,
    shows,
    blueprints,
    segments,
    layouts,
    components,
    resources,
    episodes,
    getTransactionCount: () => transactionCount,
  };
};

const seededRepositories = (data: TestData): TestRepositoryContext =>
  createRepositories({
    studios: [data.studio],
    shows: [data.show],
    blueprints: [data.blueprint],
    segments: [data.firstSegment, data.secondSegment],
    episodes: [data.episode],
  });

describe("Studio and Show commands", () => {
  test("creates and renames a Studio through its repository", async () => {
    const context = createRepositories();
    const created = await new CreateStudioCommand(
      context.repositories.studios,
      commandDependencies(),
    ).execute({ name: "Public Sphere" });
    const renamed = await new RenameStudioCommand(
      context.repositories.studios,
      commandDependencies(600),
    ).execute({ studioId: created.id, name: "Public Sphere Studio" });

    expect(created.id).toBe(entityId<"studio">(500));
    expect(renamed).toMatchObject({
      id: created.id,
      name: "Public Sphere Studio",
      createdAt: updatedAt,
      updatedAt,
    });
    expect(context.saved.studios).toHaveLength(2);
  });

  test("normalizes Studio names and rejects empty creation", async () => {
    const context = createRepositories();
    const command = new CreateStudioCommand(
      context.repositories.studios,
      commandDependencies(),
    );

    await expect(
      command.execute({ name: "  Public Sphere  " }),
    ).resolves.toMatchObject({
      name: "Public Sphere",
    });
    await expect(command.execute({ name: "   " })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  test("creates a Show and empty Blueprint in one transaction", async () => {
    const data = createTestData();
    const context = createRepositories({ studios: [data.studio] });
    const show = await new CreateShowCommand(
      context.repositories,
      commandDependencies(),
    ).execute({ studioId: data.studio.id, name: "Artist Interviews" });
    const blueprint = [...context.blueprints.values()][0];

    expect(show.id).toBe(entityId<"show">(500));
    expect(blueprint).toMatchObject({
      id: entityId<"showBlueprint">(501),
      showId: show.id,
      placements: [],
    });
    expect(context.getTransactionCount()).toBe(1);
  });

  test("renames a Show and returns a stable not-found error", async () => {
    const data = createTestData();
    const context = seededRepositories(data);
    const command = new RenameShowCommand(
      context.repositories.shows,
      commandDependencies(),
    );

    await expect(
      command.execute({ showId: data.show.id, name: "Weekly Countdown" }),
    ).resolves.toMatchObject({
      name: "Weekly Countdown",
      updatedAt,
    });
    await expect(
      command.execute({
        showId: entityId<"show">(999),
        name: "Missing Show",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("Show-scoped catalog commands", () => {
  test("creates Segments and Layouts at Show scope from an Episode context", async () => {
    const data = createTestData();
    const context = seededRepositories(data);
    const dependencies = commandDependencies();
    const segment = await new CreateShowSegmentCommand(
      context.repositories,
      dependencies,
    ).execute({
      context: { scope: "episode", episodeId: data.episode.id },
      name: "Closing",
    });
    const layout = await new CreateLayoutCommand(
      context.repositories,
      dependencies,
    ).execute({
      context: { scope: "episode", episodeId: data.episode.id },
      name: "Host",
    });

    expect(segment).toMatchObject({
      id: entityId<"showSegment">(500),
      showId: data.show.id,
    });
    expect(layout).toMatchObject({
      id: entityId<"layout">(501),
      showId: data.show.id,
    });
    expect(context.saved.segments).toEqual([segment]);
    expect(context.saved.layouts).toEqual([layout]);
  });
});

describe("Show Blueprint commands", () => {
  test("adds only a same-Show Segment to the Blueprint", async () => {
    const data = createTestData();
    const context = seededRepositories(data);
    const added = await new AddSegmentToBlueprintCommand(
      context.repositories,
      commandDependencies(),
    ).execute({
      blueprintId: data.blueprint.id,
      showSegmentId: data.firstSegment.id,
      label: "Encore",
      defaultData: { title: "One more" },
    });

    expect(added.placements[2]).toMatchObject({
      id: entityId<"blueprintSegmentPlacement">(500),
      showSegmentId: data.firstSegment.id,
      position: 2,
      label: "Encore",
    });

    const otherShowId = entityId<"show">(100);
    const crossShowSegment = createShowSegment(
      { showId: otherShowId, name: "Other opening" },
      factoryDependencies(101),
    );
    context.segments.set(crossShowSegment.id, crossShowSegment);

    await expect(
      new AddSegmentToBlueprintCommand(
        context.repositories,
        commandDependencies(600),
      ).execute({
        blueprintId: data.blueprint.id,
        showSegmentId: crossShowSegment.id,
      }),
    ).rejects.toMatchObject({ code: "INVALID_OWNERSHIP" });
  });

  test("reorders every Blueprint placement exactly once", async () => {
    const data = createTestData();
    const context = seededRepositories(data);
    const command = new ReorderBlueprintPlacementsCommand(
      context.repositories.blueprints,
      commandDependencies(),
    );
    const [first, second] = data.blueprint.placements;

    if (first === undefined || second === undefined) {
      throw new Error("Expected two Blueprint placements.");
    }

    const reordered = await command.execute({
      blueprintId: data.blueprint.id,
      orderedPlacementIds: [second.id, first.id],
    });
    expect(
      reordered.placements.map(({ id, position }) => ({ id, position })),
    ).toEqual([
      { id: second.id, position: 0 },
      { id: first.id, position: 1 },
    ]);

    await expect(
      command.execute({
        blueprintId: data.blueprint.id,
        orderedPlacementIds: [first.id, first.id],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  test("duplicates a placement immediately with a new ID and the same Segment", async () => {
    const data = createTestData();
    const context = seededRepositories(data);
    const source = data.blueprint.placements[0];

    if (source === undefined) {
      throw new Error("Expected a Blueprint placement.");
    }

    const updated = await new DuplicateBlueprintPlacementCommand(
      context.repositories.blueprints,
      commandDependencies(),
    ).execute({ blueprintId: data.blueprint.id, placementId: source.id });
    const duplicate = updated.placements[1];

    expect(duplicate).toMatchObject({
      id: entityId<"blueprintSegmentPlacement">(500),
      showSegmentId: source.showSegmentId,
      position: 1,
      label: source.label,
      defaultData: source.defaultData,
      defaultDurationMs: source.defaultDurationMs,
      placementOverrides: source.placementOverrides,
    });
    expect(duplicate?.id).not.toBe(source.id);
    expect(duplicate?.defaultData).not.toBe(source.defaultData);
  });

  test("removes only the Blueprint placement and retains its Catalog Segment", async () => {
    const data = createTestData();
    const context = seededRepositories(data);
    const removed = data.blueprint.placements[0];

    if (removed === undefined) {
      throw new Error("Expected a Blueprint placement.");
    }

    const updated = await new RemoveBlueprintPlacementCommand(
      context.repositories.blueprints,
      commandDependencies(),
    ).execute({ blueprintId: data.blueprint.id, placementId: removed.id });

    expect(updated.placements).toHaveLength(1);
    expect(updated.placements[0]).toMatchObject({ position: 0 });
    expect(context.segments.get(removed.showSegmentId)).toBe(data.firstSegment);
    expect(context.saved.segments).toEqual([]);
  });
});

describe("Episode commands", () => {
  test("runs Episode creation through the transaction and mapping port", async () => {
    const data = createTestData();
    const context = seededRepositories(data);
    const mappedEpisode = createEpisode(
      { showId: data.show.id, title: "Episode 2" },
      factoryDependencies(80, updatedAt),
    );
    let receivedRepositories: EpisodeCreationRepositories | undefined;
    let receivedDependencies: DomainFactoryDependencies | undefined;
    const creator: EpisodeFromBlueprintCreator = {
      create: async (_input, repositories, dependencies) => {
        receivedRepositories = repositories;
        receivedDependencies = dependencies;
        await repositories.episodes.save(mappedEpisode);
        return mappedEpisode;
      },
    };
    const dependencies = commandDependencies();
    const created = await new CreateEpisodeFromBlueprintCommand(
      context.repositories,
      dependencies,
      creator,
    ).execute({ showId: data.show.id, title: "Episode 2" });

    expect(created).toBe(mappedEpisode);
    expect(receivedRepositories).toBeDefined();
    expect(receivedDependencies).toBe(dependencies);
    expect(context.getTransactionCount()).toBe(1);
  });

  test("creates a complete Episode from the Blueprint through the default mapper", async () => {
    const data = createTestData();
    const context = seededRepositories(data);
    const created = await new CreateEpisodeFromBlueprintCommand(
      context.repositories,
      commandDependencies(),
    ).execute({ showId: data.show.id, title: "Episode 2" });

    expect(created.id).toBe(entityId<"episode">(500));
    expect(created.segments).toEqual([
      expect.objectContaining({
        id: entityId<"episodeSegment">(501),
        sourceShowSegmentId: data.firstSegment.id,
        position: 0,
        label: "Cold open",
        fieldValues: { lowerThirdTitle: "This week" },
        expectedDurationOverrideMs: 60_000,
      }),
      expect.objectContaining({
        id: entityId<"episodeSegment">(502),
        sourceShowSegmentId: data.secondSegment.id,
        position: 1,
        fieldValues: {},
      }),
    ]);
    expect(context.saved.episodes).toEqual([created]);
    expect(context.getTransactionCount()).toBe(1);
  });

  test("2.T12 leaves no partial Episode when Segment creation fails in the transaction", async () => {
    const data = createTestData();
    const context = seededRepositories(data);
    let idCallCount = 0;
    const dependencies: DomainFactoryDependencies = {
      clock: createFixedClock(updatedAt),
      createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> => {
        idCallCount += 1;
        if (idCallCount === 3) {
          throw new Error("Episode Segment creation failed.");
        }
        return entityId<TEntity>(500 + idCallCount);
      },
    };

    await expect(
      new CreateEpisodeFromBlueprintCommand(
        context.repositories,
        dependencies,
      ).execute({ showId: data.show.id, title: "Episode 2" }),
    ).rejects.toThrow("Episode Segment creation failed.");

    expect(context.saved.episodes).toEqual([]);
    expect(context.episodes.size).toBe(1);
    expect(context.episodes.get(data.episode.id)).toBe(data.episode);
    expect(context.getTransactionCount()).toBe(1);
  });

  test("reorders every Episode Segment exactly once", async () => {
    const data = createTestData();
    const context = seededRepositories(data);
    const [first, second] = data.episode.segments;

    if (first === undefined || second === undefined) {
      throw new Error("Expected two Episode Segments.");
    }

    const updated = await new ReorderEpisodeSegmentsCommand(
      context.repositories.episodes,
      commandDependencies(),
    ).execute({
      episodeId: data.episode.id,
      orderedEpisodeSegmentIds: [second.id, first.id],
    });

    expect(
      updated.segments.map(({ id, position }) => ({ id, position })),
    ).toEqual([
      { id: second.id, position: 0 },
      { id: first.id, position: 1 },
    ]);
  });

  test("duplicates an Episode Segment with copied data and the same source", async () => {
    const data = createTestData();
    const context = seededRepositories(data);
    const source = data.episode.segments[0];

    if (source === undefined) {
      throw new Error("Expected an Episode Segment.");
    }

    const updated = await new DuplicateEpisodeSegmentCommand(
      context.repositories.episodes,
      commandDependencies(),
    ).execute({
      episodeId: data.episode.id,
      episodeSegmentId: source.id,
    });
    const duplicate = updated.segments[1];

    expect(duplicate).toMatchObject({
      id: entityId<"episodeSegment">(500),
      sourceShowSegmentId: source.sourceShowSegmentId,
      position: 1,
      label: source.label,
      fieldValues: source.fieldValues,
      notes: source.notes,
      expectedDurationOverrideMs: source.expectedDurationOverrideMs,
      defaultLayoutOverrideId: source.defaultLayoutOverrideId,
      fixedResourceReplacements: source.fixedResourceReplacements,
    });
    expect(duplicate?.id).not.toBe(source.id);
    expect(duplicate?.fieldValues).not.toBe(source.fieldValues);
    expect(duplicate?.fixedResourceReplacements).not.toBe(
      source.fixedResourceReplacements,
    );
  });

  test("removes only the Episode Segment and leaves Blueprint and Catalog unchanged", async () => {
    const data = createTestData();
    const context = seededRepositories(data);
    const removed = data.episode.segments[0];

    if (removed === undefined) {
      throw new Error("Expected an Episode Segment.");
    }

    const updated = await new RemoveEpisodeSegmentCommand(
      context.repositories.episodes,
      commandDependencies(),
    ).execute({
      episodeId: data.episode.id,
      episodeSegmentId: removed.id,
    });

    expect(updated.segments).toHaveLength(1);
    expect(updated.segments[0]).toMatchObject({ position: 0 });
    expect(context.blueprints.get(data.blueprint.id)).toBe(data.blueprint);
    expect(context.segments.get(removed.sourceShowSegmentId)).toBe(
      data.firstSegment,
    );
    expect(context.saved.blueprints).toEqual([]);
    expect(context.saved.segments).toEqual([]);
  });
});
