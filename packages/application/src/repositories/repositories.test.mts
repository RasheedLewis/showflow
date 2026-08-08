import { describe, expect, expectTypeOf, test } from "vitest";

import type {
  Component,
  ComponentId,
  Episode,
  EpisodeId,
  Layout,
  LayoutId,
  Resource,
  ResourceId,
  ResourceOwner,
  Show,
  ShowBlueprint,
  ShowBlueprintId,
  ShowId,
  ShowSegment,
  ShowSegmentId,
  Studio,
  StudioId,
} from "@showflow/domain";

import type {
  ApplicationRepositories,
  ComponentRepository,
  EntityRepository,
  EpisodeRepository,
  LayoutRepository,
  ResourceRepository,
  ShowBlueprintRepository,
  ShowRepository,
  ShowSegmentRepository,
  StudioRepository,
  TransactionRepositories,
  TransactionRunner,
} from "./repositories.mjs";
import type {
  ApplicationSettings,
  ApplicationSettingsRepository,
  UpdateNavigationSettings,
  WindowPreferences,
} from "../settings/application-settings.mjs";

type ResultOf<TFunction extends (...arguments_: never[]) => unknown> = Awaited<
  ReturnType<TFunction>
>;

describe("application repository ports", () => {
  test("uses branded IDs and domain entities at every entity boundary", () => {
    expectTypeOf<
      Parameters<EntityRepository<Studio, StudioId>["getById"]>[0]
    >().toEqualTypeOf<StudioId>();
    expectTypeOf<
      ResultOf<EntityRepository<Studio, StudioId>["getById"]>
    >().toEqualTypeOf<Studio | null>();
    expectTypeOf<
      Parameters<EntityRepository<Studio, StudioId>["save"]>[0]
    >().toEqualTypeOf<Studio>();

    expectTypeOf<ResultOf<StudioRepository["list"]>>().toEqualTypeOf<
      readonly Studio[]
    >();
    expectTypeOf<
      Parameters<ShowRepository["listByStudioId"]>[0]
    >().toEqualTypeOf<StudioId>();
    expectTypeOf<ResultOf<ShowRepository["listByStudioId"]>>().toEqualTypeOf<
      readonly Show[]
    >();
    expectTypeOf<
      Parameters<ShowBlueprintRepository["getByShowId"]>[0]
    >().toEqualTypeOf<ShowId>();
    expectTypeOf<
      ResultOf<ShowBlueprintRepository["getByShowId"]>
    >().toEqualTypeOf<ShowBlueprint | null>();
    expectTypeOf<
      ResultOf<ShowSegmentRepository["listByShowId"]>
    >().toEqualTypeOf<readonly ShowSegment[]>();
    expectTypeOf<ResultOf<LayoutRepository["listByShowId"]>>().toEqualTypeOf<
      readonly Layout[]
    >();
    expectTypeOf<ResultOf<ComponentRepository["listByShowId"]>>().toEqualTypeOf<
      readonly Component[]
    >();
    expectTypeOf<
      Parameters<ResourceRepository["listByOwner"]>[0]
    >().toEqualTypeOf<ResourceOwner>();
    expectTypeOf<ResultOf<ResourceRepository["listByOwner"]>>().toEqualTypeOf<
      readonly Resource[]
    >();
    expectTypeOf<ResultOf<EpisodeRepository["listByShowId"]>>().toEqualTypeOf<
      readonly Episode[]
    >();
  });

  test("keeps aggregate child entities behind Blueprint and Episode ports", () => {
    expectTypeOf<ShowBlueprintRepository>().toMatchTypeOf<
      EntityRepository<ShowBlueprint, ShowBlueprintId>
    >();
    expectTypeOf<EpisodeRepository>().toMatchTypeOf<
      EntityRepository<Episode, EpisodeId>
    >();
    expectTypeOf<ShowSegmentRepository>().toMatchTypeOf<
      EntityRepository<ShowSegment, ShowSegmentId>
    >();
    expectTypeOf<LayoutRepository>().toMatchTypeOf<
      EntityRepository<Layout, LayoutId>
    >();
    expectTypeOf<ComponentRepository>().toMatchTypeOf<
      EntityRepository<Component, ComponentId>
    >();
    expectTypeOf<ResourceRepository>().toMatchTypeOf<
      EntityRepository<Resource, ResourceId>
    >();
  });
});

const settings: ApplicationSettings = {
  lastRoute: "/",
  lastStudioId: null,
  windowPreferences: null,
};

const settingsRepository: ApplicationSettingsRepository = {
  get: async () => settings,
  updateNavigation: async (
    navigation: UpdateNavigationSettings,
  ): Promise<ApplicationSettings> => ({ ...settings, ...navigation }),
  updateWindowPreferences: async (
    windowPreferences: WindowPreferences,
  ): Promise<ApplicationSettings> => ({ ...settings, windowPreferences }),
};

const notFound = async <TEntity,>(): Promise<TEntity | null> => null;
const save = async (): Promise<void> => undefined;
const emptyList = async <TEntity,>(): Promise<readonly TEntity[]> => [];

const transactionRepositories = {
  studios: {
    getById: notFound<Studio>,
    list: emptyList<Studio>,
    save,
  },
  shows: {
    getById: notFound<Show>,
    listByStudioId: emptyList<Show>,
    save,
  },
  blueprints: {
    getById: notFound<ShowBlueprint>,
    getByShowId: notFound<ShowBlueprint>,
    save,
  },
  segments: {
    getById: notFound<ShowSegment>,
    listByShowId: emptyList<ShowSegment>,
    save,
  },
  layouts: {
    getById: notFound<Layout>,
    listByShowId: emptyList<Layout>,
    save,
  },
  components: {
    getById: notFound<Component>,
    listByShowId: emptyList<Component>,
    save,
  },
  resources: {
    delete: async () => undefined,
    getById: notFound<Resource>,
    listByOwner: emptyList<Resource>,
    listUsage: async () => [],
    save,
  },
  episodes: {
    getById: notFound<Episode>,
    listByShowId: emptyList<Episode>,
    save,
  },
  settings: settingsRepository,
} satisfies TransactionRepositories;

class CapturingTransactionRunner implements TransactionRunner {
  operationCount = 0;

  async run<TResult>(
    operation: (repositories: TransactionRepositories) => Promise<TResult>,
  ): Promise<TResult> {
    this.operationCount += 1;
    return operation(transactionRepositories);
  }
}

describe("transaction repository port", () => {
  test("supplies one repository collection and returns the operation result", async () => {
    const transactions = new CapturingTransactionRunner();
    const repositories = {
      ...transactionRepositories,
      transactions,
    } satisfies ApplicationRepositories;

    await expect(
      repositories.transactions.run(async (transaction) => {
        expect(transaction).toBe(transactionRepositories);
        await expect(transaction.studios.list()).resolves.toEqual([]);
        await expect(transaction.settings.get()).resolves.toEqual(settings);
        return "committed" as const;
      }),
    ).resolves.toBe("committed");
    expect(transactions.operationCount).toBe(1);
  });

  test("propagates a failed transaction operation", async () => {
    const transactions = new CapturingTransactionRunner();
    const failure = new Error("rollback");

    await expect(
      transactions.run(async () => Promise.reject(failure)),
    ).rejects.toBe(failure);
    expect(transactions.operationCount).toBe(1);
  });
});
