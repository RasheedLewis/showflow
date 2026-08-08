import { describe, expect, test } from "vitest";

import {
  createEpisode,
  createFixedClock,
  createResource,
  createShow,
  createStudio,
  parseEntityId,
  parseUtcTimestamp,
  type DomainFactoryDependencies,
  type EntityId,
  type EntityIdKind,
  type Episode,
  type Resource,
  type ResourceId,
  type Show,
  type Studio,
} from "@showflow/domain";

import {
  GetResourceAccessQuery,
  ListResourcesQuery,
} from "../queries/resource-queries.mjs";
import { ApplicationError } from "../errors/application-error.mjs";
import {
  ImportResourcesCommand,
  RepairResourceCommand,
  RenameResourceCommand,
} from "./resource-commands.mjs";

const timestamp = parseUtcTimestamp("2026-08-07T14:30:00.000Z");
const id = <TEntity extends EntityIdKind>(suffix: number): EntityId<TEntity> =>
  parseEntityId<TEntity>(
    `01942c1f-ae8f-7e42-b900-${suffix.toString(16).padStart(12, "0")}`,
  );
const dependencies = (start: number): DomainFactoryDependencies => {
  let suffix = start;
  return {
    clock: createFixedClock(timestamp),
    createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
      id<TEntity>(suffix++),
  };
};

const setup = () => {
  const deps = dependencies(1);
  const firstStudio = createStudio({ name: "First Studio" }, deps);
  const secondStudio = createStudio({ name: "Second Studio" }, deps);
  const firstShow = createShow(
    { studioId: firstStudio.id, name: "First Show" },
    deps,
  );
  const secondShow = createShow(
    { studioId: secondStudio.id, name: "Second Show" },
    deps,
  );
  const firstEpisode = createEpisode(
    { showId: firstShow.id, title: "Episode 1" },
    deps,
  );
  const secondEpisode = createEpisode(
    { showId: firstShow.id, title: "Episode 2" },
    deps,
  );
  const studios = new Map<Studio["id"], Studio>([
    [firstStudio.id, firstStudio],
    [secondStudio.id, secondStudio],
  ]);
  const shows = new Map<Show["id"], Show>([
    [firstShow.id, firstShow],
    [secondShow.id, secondShow],
  ]);
  const episodes = new Map<Episode["id"], Episode>([
    [firstEpisode.id, firstEpisode],
    [secondEpisode.id, secondEpisode],
  ]);
  const resources = new Map<ResourceId, Resource>();
  const repositories = {
    studios: {
      getById: async (entityId: Studio["id"]) => studios.get(entityId) ?? null,
    },
    shows: {
      getById: async (entityId: Show["id"]) => shows.get(entityId) ?? null,
    },
    episodes: {
      getById: async (entityId: Episode["id"]) =>
        episodes.get(entityId) ?? null,
    },
    resources: {
      delete: async (entityId: ResourceId) => {
        resources.delete(entityId);
      },
      getById: async (entityId: ResourceId) => resources.get(entityId) ?? null,
      listByOwner: async (owner: Resource["owner"]) =>
        [...resources.values()].filter(
          (resource) =>
            resource.owner.scope === owner.scope &&
            (owner.scope === "studio"
              ? resource.owner.scope === "studio" &&
                resource.owner.studioId === owner.studioId
              : owner.scope === "show"
                ? resource.owner.scope === "show" &&
                  resource.owner.showId === owner.showId
                : resource.owner.scope === "episode" &&
                  resource.owner.episodeId === owner.episodeId),
        ),
      listUsage: async () => [],
      save: async (resource: Resource) => {
        resources.set(resource.id, resource);
      },
    },
  };
  return {
    dependencies: deps,
    episodes: { firstEpisode, secondEpisode },
    firstShow,
    firstStudio,
    repositories,
    resources,
    secondStudio,
  };
};

describe("Resource commands and queries", () => {
  test("9.T1 imports validated linked metadata at the context default scope", async () => {
    const fixture = setup();
    const command = new ImportResourcesCommand(
      fixture.repositories,
      {
        inspect: async () => ({
          absolutePath: "/media/artwork.png",
          category: "image",
          fileSizeBytes: 2048,
          mimeType: "image/png",
          originalFilename: "artwork.png",
          sourceModifiedAt: timestamp,
          dimensions: { height: 1080, width: 1920 },
        }),
      },
      fixture.dependencies,
    );
    const [resource] = await command.execute({
      context: {
        scope: "episode",
        studioId: fixture.firstStudio.id,
        showId: fixture.firstShow.id,
        episodeId: fixture.episodes.firstEpisode.id,
      },
      filePaths: ["/media/artwork.png"],
    });

    expect(resource).toMatchObject({
      category: "image",
      fileSizeBytes: 2048,
      localPath: "/media/artwork.png",
      owner: { scope: "episode", episodeId: fixture.episodes.firstEpisode.id },
    });
  });

  test("9.T2 returns an actionable unsupported-file error", async () => {
    const fixture = setup();
    const command = new ImportResourcesCommand(fixture.repositories, {
      inspect: async () => {
        throw new ApplicationError(
          "UNSUPPORTED_MEDIA",
          "archive.zip is not supported. Choose an image, video, or audio file.",
        );
      },
    });
    await expect(
      command.execute({
        context: { scope: "studio", studioId: fixture.firstStudio.id },
        filePaths: ["/media/archive.zip"],
      }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_MEDIA" });
  });

  test("9.T3 hides Episode Resources from Show scope while inheriting upper scopes", async () => {
    const fixture = setup();
    const studioResource = createResource(
      {
        owner: { scope: "studio", studioId: fixture.firstStudio.id },
        displayName: "Brand mark",
        category: "image",
        mimeType: "image/png",
      },
      dependencies(100),
    );
    const episodeResource = createResource(
      {
        owner: {
          scope: "episode",
          episodeId: fixture.episodes.firstEpisode.id,
        },
        displayName: "This week",
        category: "video",
        mimeType: "video/mp4",
      },
      dependencies(101),
    );
    fixture.resources.set(studioResource.id, studioResource);
    fixture.resources.set(episodeResource.id, episodeResource);
    const query = new ListResourcesQuery(fixture.repositories);

    await expect(
      query.execute({
        scope: "show",
        studioId: fixture.firstStudio.id,
        showId: fixture.firstShow.id,
      }),
    ).resolves.toEqual([{ resource: studioResource, usage: [] }]);
    await expect(
      query.execute({
        scope: "episode",
        studioId: fixture.firstStudio.id,
        showId: fixture.firstShow.id,
        episodeId: fixture.episodes.firstEpisode.id,
      }),
    ).resolves.toEqual([
      { resource: studioResource, usage: [] },
      { resource: episodeResource, usage: [] },
    ]);
  });

  test("9.T6 rejects cross-Studio Resource access", async () => {
    const fixture = setup();
    const resource = createResource(
      {
        owner: { scope: "studio", studioId: fixture.firstStudio.id },
        displayName: "Private mark",
        category: "image",
        mimeType: "image/png",
      },
      dependencies(110),
    );
    fixture.resources.set(resource.id, resource);
    const query = new GetResourceAccessQuery(fixture.repositories);
    await expect(
      query.execute(resource.id, fixture.secondStudio.id),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  test("9.T9 and 9.T10 locate and replace while preserving Resource identity", async () => {
    const fixture = setup();
    const resource = createResource(
      {
        owner: {
          scope: "episode",
          episodeId: fixture.episodes.firstEpisode.id,
        },
        displayName: "Artwork",
        category: "image",
        mimeType: "image/png",
        availability: "missing",
        localPath: "/old/artwork.png",
      },
      dependencies(120),
    );
    fixture.resources.set(resource.id, resource);
    const repair = new RepairResourceCommand(
      fixture.repositories,
      {
        inspect: async (filePath) => ({
          absolutePath: filePath,
          category: "image",
          fileSizeBytes: 512,
          mimeType: "image/png",
          originalFilename: "replacement.png",
          sourceModifiedAt: timestamp,
          dimensions: { height: 720, width: 1280 },
        }),
      },
      fixture.dependencies,
    );
    const context = {
      scope: "episode" as const,
      studioId: fixture.firstStudio.id,
      showId: fixture.firstShow.id,
      episodeId: fixture.episodes.firstEpisode.id,
    };
    const located = await repair.execute({
      context,
      filePath: "/new/artwork.png",
      mode: "locate",
      resourceId: resource.id,
    });
    const replaced = await repair.execute({
      context,
      filePath: "/newer/artwork.png",
      mode: "replace",
      resourceId: resource.id,
    });

    expect(located).toMatchObject({
      id: resource.id,
      availability: "available",
    });
    expect(replaced).toMatchObject({
      id: resource.id,
      localPath: "/newer/artwork.png",
    });
  });

  test("renames a Resource within its owning scope", async () => {
    const fixture = setup();
    const resource = createResource(
      {
        owner: { scope: "show", showId: fixture.firstShow.id },
        displayName: "Artwork",
        category: "image",
        mimeType: "image/png",
      },
      dependencies(130),
    );
    fixture.resources.set(resource.id, resource);
    const renamed = await new RenameResourceCommand(
      fixture.repositories,
      fixture.dependencies,
    ).execute(
      {
        scope: "show",
        studioId: fixture.firstStudio.id,
        showId: fixture.firstShow.id,
      },
      resource.id,
      "Guest artwork",
    );

    expect(renamed).toMatchObject({
      id: resource.id,
      displayName: "Guest artwork",
    });
  });
});
