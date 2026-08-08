import { describe, expect, test } from "vitest";

import { ApplicationError } from "@showflow/application";
import {
  createFixedClock,
  createResource,
  parseEntityId,
  parseUtcTimestamp,
  type DomainFactoryDependencies,
  type EntityId,
  type EntityIdKind,
  type Resource,
} from "@showflow/domain";

import { RefreshingResourceRepository } from "./refreshing-resource-repository.mjs";

const initialTimestamp = parseUtcTimestamp("2026-08-07T12:00:00.000Z");
const modifiedTimestamp = "2026-08-07T12:05:00.000Z";
const dependencies: DomainFactoryDependencies = {
  clock: createFixedClock(initialTimestamp),
  createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
    parseEntityId<TEntity>("01942c1f-ae8f-7e42-b900-000000000001"),
};

describe("RefreshingResourceRepository", () => {
  test("9.T8 keeps metadata and usage while marking a moved file Missing", async () => {
    let stored = createResource(
      {
        owner: {
          scope: "studio",
          studioId: parseEntityId<"studio">(
            "01942c1f-ae8f-7e42-b900-000000000002",
          ),
        },
        displayName: "Artwork",
        category: "image",
        mimeType: "image/png",
        localPath: "/missing/artwork.png",
        originalFilename: "artwork.png",
        sourceModifiedAt: initialTimestamp,
      },
      dependencies,
    );
    const repository = new RefreshingResourceRepository(
      {
        delete: async () => undefined,
        getById: async () => stored,
        listByOwner: async () => [stored],
        listUsage: async () => [
          {
            episodeId: parseEntityId<"episode">(
              "01942c1f-ae8f-7e42-b900-000000000003",
            ),
            episodeSegmentId: parseEntityId<"episodeSegment">(
              "01942c1f-ae8f-7e42-b900-000000000004",
            ),
            episodeTitle: "Week 32",
            fieldKey: "artwork",
            segmentName: "Reveal",
            showId: parseEntityId<"show">(
              "01942c1f-ae8f-7e42-b900-000000000005",
            ),
          },
        ],
        save: async (resource: Resource) => {
          stored = resource;
        },
      },
      {
        inspect: async () => {
          throw new ApplicationError(
            "FILE_UNAVAILABLE",
            "Artwork could not be found. Locate it or choose a replacement.",
          );
        },
      },
    );

    await expect(repository.getById(stored.id)).resolves.toMatchObject({
      id: stored.id,
      availability: "missing",
      localPath: "/missing/artwork.png",
    });
    await expect(repository.listUsage(stored.id)).resolves.toHaveLength(1);
  });

  test("9.T11 regenerates the thumbnail cache key after source modification", async () => {
    let stored = createResource(
      {
        owner: {
          scope: "studio",
          studioId: parseEntityId<"studio">(
            "01942c1f-ae8f-7e42-b900-000000000012",
          ),
        },
        displayName: "Artwork",
        category: "image",
        mimeType: "image/png",
        localPath: "/media/artwork.png",
        sourceModifiedAt: initialTimestamp,
        thumbnailCacheKey: "old-cache",
      },
      dependencies,
    );
    const repository = new RefreshingResourceRepository(
      {
        delete: async () => undefined,
        getById: async () => stored,
        listByOwner: async () => [stored],
        listUsage: async () => [],
        save: async (resource: Resource) => {
          stored = resource;
        },
      },
      {
        inspect: async () => ({
          absolutePath: "/media/artwork.png",
          category: "image",
          fileSizeBytes: 2048,
          mimeType: "image/png",
          originalFilename: "artwork.png",
          sourceModifiedAt: modifiedTimestamp,
          dimensions: { height: 1080, width: 1920 },
        }),
      },
    );

    const refreshed = await repository.getById(stored.id);
    expect(refreshed?.thumbnailCacheKey).not.toBe("old-cache");
    expect(refreshed?.sourceModifiedAt).toBe(modifiedTimestamp);
  });
});
