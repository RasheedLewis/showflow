import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  createEpisode,
  createEpisodeSegment,
  createFixedClock,
  createResource,
  createShowSegment,
  parseEntityId,
  parseUtcTimestamp,
  type DomainFactoryDependencies,
  type EntityId,
  type EntityIdKind,
  type Show,
  type ShowBlueprint,
  type Studio,
} from "@showflow/domain";

import { SqliteEpisodeRepository } from "../episodes/sqlite-episode-repository.mjs";
import { initializePersistence } from "../migrations/initialize-persistence.mjs";
import { SqliteShowCreationRepository } from "../shows/sqlite-show-creation-repository.mjs";
import { SqliteShowSegmentRepository } from "../shows/sqlite-show-segment-repository.mjs";
import { SqliteStudioRepository } from "../studios/sqlite-studio-repository.mjs";
import { SqliteResourceRepository } from "./sqlite-resource-repository.mjs";

const MIGRATIONS_DIRECTORY = path.resolve(
  import.meta.dirname,
  "../../../../migrations",
);
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

describe("SQLite Resource persistence", () => {
  test("9.T1, 9.T3, and 9.11 persist metadata, isolate scopes, and report usages", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-resource-test-"),
    );
    const persistence = await initializePersistence({
      backup: {
        backupsDirectory: path.join(temporaryDirectory, "backups"),
        retentionCount: 2,
      },
      databasePath: path.join(temporaryDirectory, "showflow.sqlite"),
      logger: { log: () => undefined },
      migrationsDirectory: MIGRATIONS_DIRECTORY,
      now: () => timestamp,
    });
    try {
      const studio = {
        id: id<"studio">(1),
        name: "Public Sphere",
        createdAt: timestamp,
        updatedAt: timestamp,
      } satisfies Studio;
      const show = {
        id: id<"show">(2),
        studioId: studio.id,
        name: "Top 10",
        styleDefaults: {},
        createdAt: timestamp,
        updatedAt: timestamp,
      } satisfies Show;
      const blueprint = {
        id: id<"showBlueprint">(3),
        showId: show.id,
        placements: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      } satisfies ShowBlueprint;
      await new SqliteStudioRepository(persistence.database).save(studio);
      await new SqliteShowCreationRepository(persistence.database).create(
        show,
        blueprint,
      );
      const segment = createShowSegment(
        { showId: show.id, name: "Reveal" },
        dependencies(10),
      );
      await new SqliteShowSegmentRepository(persistence.database).save(segment);
      const baseEpisode = createEpisode(
        { showId: show.id, title: "Week 32" },
        dependencies(20),
      );
      const repository = new SqliteResourceRepository(persistence.database);
      const showResource = createResource(
        {
          owner: { scope: "show", showId: show.id },
          displayName: "Artwork",
          category: "image",
          mimeType: "image/png",
          originalFilename: "artwork.png",
          localPath: "/media/artwork.png",
          fileSizeBytes: 4096,
          sourceModifiedAt: timestamp,
          dimensions: { width: 1920, height: 1080 },
          thumbnailCacheKey: "artwork-cache-v1",
        },
        dependencies(30),
      );
      const episodeResource = createResource(
        {
          owner: { scope: "episode", episodeId: baseEpisode.id },
          displayName: "Week 32 clip",
          category: "video",
          mimeType: "video/mp4",
          localPath: "/media/week-32.mp4",
          originalFilename: "week-32.mp4",
          fileSizeBytes: 2_000_000,
          sourceModifiedAt: timestamp,
          durationMs: 30_000,
        },
        dependencies(31),
      );
      const episodeSegment = createEpisodeSegment(
        {
          episode: baseEpisode,
          sourceSegment: segment,
          position: 0,
          fieldValues: { artwork: showResource.id },
        },
        dependencies(40),
      );
      await new SqliteEpisodeRepository(persistence.database).save({
        ...baseEpisode,
        segments: [episodeSegment],
      });
      await repository.save(showResource);
      await repository.save(episodeResource);

      await expect(repository.getById(showResource.id)).resolves.toEqual(
        showResource,
      );
      await expect(
        repository.listByOwner({ scope: "show", showId: show.id }),
      ).resolves.toEqual([showResource]);
      await expect(
        repository.listByOwner({ scope: "episode", episodeId: baseEpisode.id }),
      ).resolves.toEqual([episodeResource]);
      await expect(repository.listUsage(showResource.id)).resolves.toEqual([
        {
          episodeId: baseEpisode.id,
          episodeSegmentId: episodeSegment.id,
          episodeTitle: "Week 32",
          fieldKey: "artwork",
          segmentName: "Reveal",
          showId: show.id,
        },
      ]);
    } finally {
      persistence.database.close();
      await fs.rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
