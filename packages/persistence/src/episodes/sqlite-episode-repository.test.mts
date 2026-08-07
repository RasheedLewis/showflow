import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  createEpisode,
  createEpisodeSegment,
  createFixedClock,
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

import { initializePersistence } from "../migrations/initialize-persistence.mjs";
import { SqliteShowCreationRepository } from "../shows/sqlite-show-creation-repository.mjs";
import { SqliteShowSegmentRepository } from "../shows/sqlite-show-segment-repository.mjs";
import { SqliteStudioRepository } from "../studios/sqlite-studio-repository.mjs";
import { SqliteEpisodeRepository } from "./sqlite-episode-repository.mjs";

const MIGRATIONS_DIRECTORY = path.resolve(
  import.meta.dirname,
  "../../../../migrations",
);
const timestamp = parseUtcTimestamp("2026-08-07T14:30:00.000Z");
const entityId = <TEntity extends EntityIdKind>(
  suffix: number,
): EntityId<TEntity> =>
  parseEntityId<TEntity>(
    `01942c1f-ae8f-7e42-b900-${suffix.toString(16).padStart(12, "0")}`,
  );
const dependencies = (firstSuffix: number): DomainFactoryDependencies => {
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

describe("SQLite Episode persistence", () => {
  test("6.T1 persists Episode metadata and ordered Segments atomically", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-episode-test-"),
    );
    try {
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
          id: entityId<"studio">(1),
          name: "Public Sphere",
          createdAt: timestamp,
          updatedAt: timestamp,
        } satisfies Studio;
        const show = {
          id: entityId<"show">(2),
          studioId: studio.id,
          name: "Top 10 Music Videos",
          styleDefaults: {},
          createdAt: timestamp,
          updatedAt: timestamp,
        } satisfies Show;
        const blueprint = {
          id: entityId<"showBlueprint">(3),
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
        const sourceSegment = createShowSegment(
          { showId: show.id, name: "Opening", expectedDurationMs: 60_000 },
          dependencies(10),
        );
        await new SqliteShowSegmentRepository(persistence.database).save(
          sourceSegment,
        );
        const baseEpisode = createEpisode(
          {
            showId: show.id,
            title: "Episode 24",
            episodeNumber: 24,
            plannedAt: timestamp,
          },
          dependencies(20),
        );
        const segment = createEpisodeSegment(
          {
            episode: baseEpisode,
            sourceSegment,
            position: 0,
            fieldValues: { title: "This week" },
            notes: "Welcome viewers.",
          },
          dependencies(30),
        );
        const episode = { ...baseEpisode, segments: [segment] };
        const episodes = new SqliteEpisodeRepository(persistence.database);

        await episodes.save(episode);
        await expect(episodes.getById(episode.id)).resolves.toEqual(episode);
        await expect(episodes.listByShowId(show.id)).resolves.toEqual([
          episode,
        ]);

        const invalidEpisode = createEpisode(
          { showId: show.id, title: "Rollback proof" },
          dependencies(40),
        );
        const missingSource = createShowSegment(
          { showId: show.id, name: "Missing source" },
          dependencies(50),
        );
        const invalidSegment = createEpisodeSegment(
          {
            episode: invalidEpisode,
            sourceSegment: missingSource,
            position: 0,
          },
          dependencies(60),
        );
        await expect(
          episodes.save({ ...invalidEpisode, segments: [invalidSegment] }),
        ).rejects.toMatchObject({ code: "PERSISTENCE_FAILURE" });
        await expect(episodes.getById(invalidEpisode.id)).resolves.toBeNull();
      } finally {
        persistence.database.close();
      }
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  });
});
