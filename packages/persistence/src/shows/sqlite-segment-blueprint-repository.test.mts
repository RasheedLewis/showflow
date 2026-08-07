import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  createFixedClock,
  createShowSegment,
  parseEntityId,
  parseUtcTimestamp,
  type BlueprintSegmentPlacement,
  type DomainFactoryDependencies,
  type EntityId,
  type EntityIdKind,
  type Show,
  type ShowBlueprint,
  type Studio,
} from "@showflow/domain";

import { initializePersistence } from "../migrations/initialize-persistence.mjs";
import { SqliteStudioRepository } from "../studios/sqlite-studio-repository.mjs";
import { SqliteSegmentBlueprintCreationRepository } from "./sqlite-segment-blueprint-creation-repository.mjs";
import { SqliteShowBlueprintRepository } from "./sqlite-show-blueprint-repository.mjs";
import { SqliteShowCreationRepository } from "./sqlite-show-creation-repository.mjs";
import { SqliteShowSegmentRepository } from "./sqlite-show-segment-repository.mjs";

const MIGRATIONS_DIRECTORY = path.resolve(
  import.meta.dirname,
  "../../../../migrations",
);
const timestamp = parseUtcTimestamp("2026-08-06T14:30:00.000Z");
const entityId = <TEntity extends EntityIdKind>(
  suffix: number,
): EntityId<TEntity> =>
  parseEntityId<TEntity>(
    `01942c1f-ae8f-7e42-b900-${suffix.toString(16).padStart(12, "0")}`,
  );
const dependencies = (suffix: number): DomainFactoryDependencies => ({
  clock: createFixedClock(timestamp),
  createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
    entityId<TEntity>(suffix),
});

describe("SQLite Segment and Blueprint persistence", () => {
  test("persists Catalog Segments and exact Blueprint order across reload", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-blueprint-test-"),
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
        const segments = new SqliteShowSegmentRepository(persistence.database);
        const blueprints = new SqliteShowBlueprintRepository(
          persistence.database,
        );
        const opening = createShowSegment(
          { showId: show.id, name: "Opening" },
          dependencies(10),
        );
        const interview = createShowSegment(
          { showId: show.id, name: "Interview" },
          dependencies(11),
        );
        await segments.save(opening);
        await segments.save(interview);
        const placement = (
          idSuffix: number,
          showSegmentId: typeof opening.id,
          position: number,
        ): BlueprintSegmentPlacement => ({
          id: entityId<"blueprintSegmentPlacement">(idSuffix),
          showBlueprintId: blueprint.id,
          showSegmentId,
          position,
          defaultData: {},
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        const ordered = {
          ...blueprint,
          placements: [
            placement(21, interview.id, 0),
            placement(20, opening.id, 1),
          ],
        } satisfies ShowBlueprint;

        await blueprints.save(ordered);
        await expect(blueprints.getByShowId(show.id)).resolves.toEqual(ordered);
        await expect(segments.listByShowId(show.id)).resolves.toEqual([
          opening,
          interview,
        ]);

        const archived = { ...opening, archivedAt: timestamp };
        await segments.save(archived);
        await expect(segments.listByShowId(show.id)).resolves.toContainEqual(
          archived,
        );
      } finally {
        persistence.database.close();
      }
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("rolls back Segment creation when its Blueprint write fails", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-blueprint-rollback-test-"),
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
        const segment = createShowSegment(
          { showId: entityId<"show">(99), name: "Opening" },
          dependencies(98),
        );
        const creation = new SqliteSegmentBlueprintCreationRepository(
          persistence.database,
        );
        await expect(
          creation.create(segment, {
            id: entityId<"showBlueprint">(97),
            showId: segment.showId,
            placements: [],
            createdAt: timestamp,
            updatedAt: timestamp,
          }),
        ).rejects.toMatchObject({ code: "PERSISTENCE_FAILURE" });
        await expect(
          new SqliteShowSegmentRepository(persistence.database).getById(
            segment.id,
          ),
        ).resolves.toBeNull();
      } finally {
        persistence.database.close();
      }
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  });
});
