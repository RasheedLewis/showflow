import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { PersistenceFailureError } from "@showflow/application";
import {
  parseEntityId,
  parseUtcTimestamp,
  createEpisode,
  createEpisodeSegment,
  createFixedClock,
  createShowSegment,
  type DomainFactoryDependencies,
  type EntityId,
  type EntityIdKind,
  type Layout,
  type Show,
  type ShowBlueprint,
  type Slot,
  type Studio,
} from "@showflow/domain";

import { initializePersistence } from "../migrations/initialize-persistence.mjs";
import type { MigrationLogger } from "../migrations/migration-model.mjs";
import { SqliteShowCreationRepository } from "../shows/sqlite-show-creation-repository.mjs";
import { SqliteStudioRepository } from "../studios/sqlite-studio-repository.mjs";
import { SqliteEpisodeRepository } from "../episodes/sqlite-episode-repository.mjs";
import { SqliteShowSegmentRepository } from "../shows/sqlite-show-segment-repository.mjs";
import { StoredLayoutError } from "./layout-storage.mjs";
import { SqliteLayoutEpisodeCreationRepository } from "./sqlite-layout-episode-creation-repository.mjs";
import { SqliteLayoutRepository } from "./sqlite-layout-repository.mjs";

const MIGRATIONS_DIRECTORY = path.resolve(
  import.meta.dirname,
  "../../../../migrations",
);
const CREATED_AT = parseUtcTimestamp("2026-08-08T10:00:00.000Z");
const UPDATED_AT = parseUtcTimestamp("2026-08-08T10:30:00.000Z");
const ARCHIVED_AT = parseUtcTimestamp("2026-08-08T11:00:00.000Z");
const STUDIO_ID = parseEntityId<"studio">(
  "01942c1f-ae8f-7e42-b900-000000000801",
);
const SHOW_ID = parseEntityId<"show">("01942c1f-ae8f-7e42-b900-000000000802");
const BLUEPRINT_ID = parseEntityId<"showBlueprint">(
  "01942c1f-ae8f-7e42-b900-000000000803",
);
const LAYOUT_ID = parseEntityId<"layout">(
  "01942c1f-ae8f-7e42-b900-000000000804",
);
const BACKGROUND_SLOT_ID = parseEntityId<"slot">(
  "01942c1f-ae8f-7e42-b900-000000000805",
);
const HOST_SLOT_ID = parseEntityId<"slot">(
  "01942c1f-ae8f-7e42-b900-000000000806",
);
const UNKNOWN_SHOW_ID = parseEntityId<"show">(
  "01942c1f-ae8f-7e42-b900-000000000899",
);
const logger: MigrationLogger = { log: () => undefined };

const studio: Studio = {
  id: STUDIO_ID,
  name: "Public Sphere",
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};
const show: Show = {
  id: SHOW_ID,
  studioId: STUDIO_ID,
  name: "Top 10 Music Videos",
  styleDefaults: {},
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};
const blueprint: ShowBlueprint = {
  id: BLUEPRINT_ID,
  showId: SHOW_ID,
  placements: [],
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};

const backgroundSlot = (): Slot => ({
  id: BACKGROUND_SLOT_ID,
  layoutId: LAYOUT_ID,
  name: "Background",
  role: "background",
  bounds: { x: 0, y: 0, width: 1, height: 1 },
  alignment: "stretch",
  safeMargins: { top: 0, right: 0, bottom: 0, left: 0 },
  layerOrder: 0,
  clipContent: true,
  allowedComponentTypes: ["background", "image", "video"],
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
});

const hostSlot = (): Slot => ({
  id: HOST_SLOT_ID,
  layoutId: LAYOUT_ID,
  name: "Host camera",
  role: "hostCamera",
  bounds: { x: 0.083_333, y: 0.074_074, width: 0.416_667, height: 0.740_741 },
  alignment: "center",
  safeMargins: { top: 0.05, right: 0.04, bottom: 0.03, left: 0.02 },
  layerOrder: 1,
  clipContent: false,
  allowedComponentTypes: ["camera"],
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
});

const layout = (): Layout => ({
  id: LAYOUT_ID,
  showId: SHOW_ID,
  name: "Host",
  aspectRatio: "16:9",
  canvas: { width: 1_920, height: 1_080 },
  slots: [backgroundSlot(), hostSlot()],
  componentPlacements: [],
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
});

const openTestPersistence = async (temporaryDirectory: string) =>
  initializePersistence({
    backup: {
      backupsDirectory: path.join(temporaryDirectory, "backups"),
      retentionCount: 2,
    },
    databasePath: path.join(temporaryDirectory, "showflow.sqlite"),
    logger,
    migrationsDirectory: MIGRATIONS_DIRECTORY,
    now: () => CREATED_AT,
  });

const seedShow = async (
  persistence: Awaited<ReturnType<typeof openTestPersistence>>,
): Promise<void> => {
  await new SqliteStudioRepository(persistence.database).save(studio);
  await new SqliteShowCreationRepository(persistence.database).create(
    show,
    blueprint,
  );
};

describe("SqliteLayoutRepository", () => {
  test("10.T1 round-trips normalized Layout and Slot data without drift", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-layout-round-trip-test-"),
    );

    try {
      const firstPersistence = await openTestPersistence(temporaryDirectory);
      await seedShow(firstPersistence);
      const createdLayout = layout();
      const repository = new SqliteLayoutRepository(firstPersistence.database);

      await repository.save(createdLayout);
      await expect(repository.getById(createdLayout.id)).resolves.toEqual(
        createdLayout,
      );
      await expect(repository.listByShowId(SHOW_ID)).resolves.toEqual([
        createdLayout,
      ]);
      firstPersistence.database.close();

      const reopenedPersistence = await openTestPersistence(temporaryDirectory);
      try {
        const reopenedRepository = new SqliteLayoutRepository(
          reopenedPersistence.database,
        );
        await expect(
          reopenedRepository.getById(createdLayout.id),
        ).resolves.toEqual(createdLayout);
      } finally {
        reopenedPersistence.database.close();
      }
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("creates and assigns an Episode-origin Layout in one persistence transaction", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-layout-episode-test-"),
    );
    let suffix = 900;
    const dependencies: DomainFactoryDependencies = {
      clock: createFixedClock(CREATED_AT),
      createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
        parseEntityId<TEntity>(
          `01942c1f-ae8f-7e42-b900-${(suffix++).toString(16).padStart(12, "0")}`,
        ),
    };
    try {
      const persistence = await openTestPersistence(temporaryDirectory);
      try {
        await seedShow(persistence);
        const source = createShowSegment(
          { showId: SHOW_ID, name: "Interview" },
          dependencies,
        );
        await new SqliteShowSegmentRepository(persistence.database).save(
          source,
        );
        const baseEpisode = createEpisode(
          { showId: SHOW_ID, title: "Episode" },
          dependencies,
        );
        const occurrence = createEpisodeSegment(
          { episode: baseEpisode, sourceSegment: source, position: 0 },
          dependencies,
        );
        const episode = { ...baseEpisode, segments: [occurrence] };
        const episodeRepository = new SqliteEpisodeRepository(
          persistence.database,
        );
        await episodeRepository.save(episode);
        const assigned = {
          ...episode,
          segments: [
            {
              ...occurrence,
              defaultLayoutOverrideId: LAYOUT_ID,
              updatedAt: UPDATED_AT,
            },
          ],
          updatedAt: UPDATED_AT,
        };
        await new SqliteLayoutEpisodeCreationRepository(
          persistence.database,
        ).create(layout(), assigned);

        await expect(
          new SqliteLayoutRepository(persistence.database).getById(LAYOUT_ID),
        ).resolves.toEqual(layout());
        await expect(
          episodeRepository.getById(baseEpisode.id),
        ).resolves.toEqual(assigned);
      } finally {
        persistence.database.close();
      }
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("replaces Slots atomically and excludes archived Layouts from the Catalog", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-layout-atomic-test-"),
    );

    try {
      const persistence = await openTestPersistence(temporaryDirectory);
      try {
        await seedShow(persistence);
        const repository = new SqliteLayoutRepository(persistence.database);
        const original = layout();
        await repository.save(original);

        const conflictingLayer = {
          ...hostSlot(),
          layerOrder: 0,
          updatedAt: UPDATED_AT,
        } satisfies Slot;
        await expect(
          repository.save({
            ...original,
            name: "Should roll back",
            slots: [
              { ...backgroundSlot(), name: "Changed", updatedAt: UPDATED_AT },
              conflictingLayer,
            ],
            updatedAt: UPDATED_AT,
          }),
        ).rejects.toMatchObject({
          code: "PERSISTENCE_FAILURE",
          operation: "write",
        });
        await expect(repository.getById(original.id)).resolves.toEqual(
          original,
        );

        const updated = {
          ...original,
          name: "Host close",
          slots: [
            {
              ...hostSlot(),
              name: "Host close camera",
              layerOrder: 0,
              updatedAt: UPDATED_AT,
            },
          ],
          updatedAt: UPDATED_AT,
        } satisfies Layout;
        await repository.save(updated);
        await expect(repository.getById(updated.id)).resolves.toEqual(updated);

        const archived = {
          ...updated,
          archivedAt: ARCHIVED_AT,
          updatedAt: ARCHIVED_AT,
        } satisfies Layout;
        await repository.save(archived);
        await expect(repository.getById(archived.id)).resolves.toEqual(
          archived,
        );
        await expect(repository.listByShowId(SHOW_ID)).resolves.toEqual([]);
      } finally {
        persistence.database.close();
      }
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("enforces Show ownership, Slot ownership, bounds, and unsupported Placement storage", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-layout-invariant-test-"),
    );

    try {
      const persistence = await openTestPersistence(temporaryDirectory);
      try {
        await seedShow(persistence);
        const repository = new SqliteLayoutRepository(persistence.database);
        const validLayout = layout();

        await expect(
          repository.save({ ...validLayout, showId: UNKNOWN_SHOW_ID }),
        ).rejects.toMatchObject({
          code: "PERSISTENCE_FAILURE",
          operation: "write",
        });
        await expect(
          repository.save({
            ...validLayout,
            slots: [
              {
                ...backgroundSlot(),
                layoutId: parseEntityId<"layout">(
                  "01942c1f-ae8f-7e42-b900-000000000898",
                ),
              },
            ],
          }),
        ).rejects.toMatchObject({
          code: "PERSISTENCE_FAILURE",
          operation: "write",
        });
        await expect(
          repository.save({
            ...validLayout,
            slots: [
              {
                ...backgroundSlot(),
                bounds: { x: 0.5, y: 0, width: 0.6, height: 1 },
              },
            ],
          }),
        ).rejects.toMatchObject({
          code: "PERSISTENCE_FAILURE",
          operation: "write",
        });
        await expect(
          repository.save({
            ...validLayout,
            componentPlacements: [
              {
                id: parseEntityId<"componentPlacement">(
                  "01942c1f-ae8f-7e42-b900-000000000897",
                ),
                layoutId: validLayout.id,
                componentId: parseEntityId<"component">(
                  "01942c1f-ae8f-7e42-b900-000000000896",
                ),
                slotId: BACKGROUND_SLOT_ID,
                fixedProperties: {},
                bindings: {},
                visibleByDefault: true,
                createdAt: CREATED_AT,
                updatedAt: CREATED_AT,
              },
            ],
          }),
        ).rejects.toMatchObject({
          code: "PERSISTENCE_FAILURE",
          operation: "write",
        });
      } finally {
        persistence.database.close();
      }
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("maps malformed stored Slot data to a controlled read failure", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-layout-row-test-"),
    );

    try {
      const persistence = await openTestPersistence(temporaryDirectory);
      try {
        await seedShow(persistence);
        const repository = new SqliteLayoutRepository(persistence.database);
        const createdLayout = layout();
        await repository.save(createdLayout);
        persistence.database.run(
          "UPDATE slots SET allowed_component_types_json = ? WHERE id = ?",
          ['["unsupportedComponent"]', HOST_SLOT_ID],
        );

        const failure = await repository
          .getById(createdLayout.id)
          .catch((error: unknown) => error);
        expect(failure).toBeInstanceOf(PersistenceFailureError);
        expect(failure).toMatchObject({
          code: "PERSISTENCE_FAILURE",
          operation: "read",
        });
        if (!(failure instanceof PersistenceFailureError)) {
          throw new Error("Expected a mapped persistence failure.");
        }
        expect(failure.cause).toBeInstanceOf(StoredLayoutError);
      } finally {
        persistence.database.close();
      }
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  });
});
