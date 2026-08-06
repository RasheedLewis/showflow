import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  parseEntityId,
  parseUtcTimestamp,
  type Show,
  type ShowBlueprint,
  type Studio,
} from "@showflow/domain";

import { initializePersistence } from "../migrations/initialize-persistence.mjs";
import { SqliteStudioRepository } from "../studios/sqlite-studio-repository.mjs";
import { SqliteShowBlueprintRepository } from "./sqlite-show-blueprint-repository.mjs";
import { SqliteShowCreationRepository } from "./sqlite-show-creation-repository.mjs";
import { SqliteShowRepository } from "./sqlite-show-repository.mjs";

const MIGRATIONS_DIRECTORY = path.resolve(
  import.meta.dirname,
  "../../../../migrations",
);
const timestamp = parseUtcTimestamp("2026-08-06T14:30:00.000Z");
const studioId = parseEntityId<"studio">(
  "8d9df01f-2584-4b9a-ad13-a96d673918e9",
);
const showId = parseEntityId<"show">("514ad6df-710d-4301-9bff-b096e9db3dd4");
const blueprintId = parseEntityId<"showBlueprint">(
  "5da62c88-a25d-450d-bf4d-3809a9f8bd11",
);

describe("SQLite Show persistence", () => {
  test("creates a Show and empty Blueprint atomically and reloads them", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-show-test-"),
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
          id: studioId,
          name: "Public Sphere",
          createdAt: timestamp,
          updatedAt: timestamp,
        } satisfies Studio;
        await new SqliteStudioRepository(persistence.database).save(studio);
        const show = {
          id: showId,
          studioId,
          name: "Artist Interviews",
          description: "Weekly artist interviews.",
          styleDefaults: {},
          createdAt: timestamp,
          updatedAt: timestamp,
        } satisfies Show;
        const blueprint = {
          id: blueprintId,
          showId,
          placements: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        } satisfies ShowBlueprint;
        const creation = new SqliteShowCreationRepository(persistence.database);
        const shows = new SqliteShowRepository(persistence.database);
        const blueprints = new SqliteShowBlueprintRepository(
          persistence.database,
        );

        await creation.create(show, blueprint);
        await expect(shows.getById(show.id)).resolves.toEqual(show);
        await expect(shows.listByStudioId(studio.id)).resolves.toEqual([show]);
        await expect(blueprints.getByShowId(show.id)).resolves.toEqual(
          blueprint,
        );

        const secondShow = {
          ...show,
          id: parseEntityId<"show">("4aeb72c9-6bed-4f5a-9ae1-01f519b7f7f3"),
          name: "Rollback proof",
        } satisfies Show;
        await expect(
          creation.create(secondShow, { ...blueprint, showId: secondShow.id }),
        ).rejects.toMatchObject({
          code: "PERSISTENCE_FAILURE",
          operation: "write",
        });
        await expect(shows.getById(secondShow.id)).resolves.toBeNull();
      } finally {
        persistence.database.close();
      }
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  });
});
