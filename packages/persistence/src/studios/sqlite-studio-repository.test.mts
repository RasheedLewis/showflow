import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { PersistenceFailureError } from "@showflow/application";
import {
  parseEntityId,
  parseUtcTimestamp,
  type Studio,
} from "@showflow/domain";

import { initializePersistence } from "../migrations/initialize-persistence.mjs";
import type { MigrationLogger } from "../migrations/migration-model.mjs";
import {
  SqliteStudioRepository,
  StoredStudioError,
} from "./sqlite-studio-repository.mjs";

const MIGRATIONS_DIRECTORY = path.resolve(
  import.meta.dirname,
  "../../../../migrations",
);
const FIRST_STUDIO_ID = parseEntityId<"studio">(
  "8d9df01f-2584-4b9a-ad13-a96d673918e9",
);
const SECOND_STUDIO_ID = parseEntityId<"studio">(
  "2ea0f315-f419-4a4e-9928-34ec3fceaf0d",
);
const LOGO_RESOURCE_ID = parseEntityId<"resource">(
  "2da7016b-3820-4b10-af90-1b3cb3d98917",
);
const CREATED_AT = parseUtcTimestamp("2026-08-05T06:30:00.000Z");
const RENAMED_AT = parseUtcTimestamp("2026-08-05T07:00:00.000Z");
const ARCHIVED_AT = parseUtcTimestamp("2026-08-05T08:00:00.000Z");
const logger: MigrationLogger = { log: () => undefined };

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

const firstStudio = (): Studio => ({
  id: FIRST_STUDIO_ID,
  name: "Public Sphere",
  logoResourceId: LOGO_RESOURCE_ID,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
});

const secondStudio = (): Studio => ({
  id: SECOND_STUDIO_ID,
  name: "Late Night Lab",
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
});

describe("SqliteStudioRepository", () => {
  test("creates, lists, renames, archives, and reloads Studios", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-studio-repository-test-"),
    );

    try {
      const firstPersistence = await openTestPersistence(temporaryDirectory);
      const repository = new SqliteStudioRepository(firstPersistence.database);
      const createdFirstStudio = firstStudio();
      const createdSecondStudio = secondStudio();

      await repository.save(createdFirstStudio);
      await repository.save(createdSecondStudio);
      await expect(repository.list()).resolves.toEqual([
        createdSecondStudio,
        createdFirstStudio,
      ]);

      const renamedStudio = {
        ...createdFirstStudio,
        name: "Public Sphere Studio",
        updatedAt: RENAMED_AT,
      } satisfies Studio;
      await repository.save(renamedStudio);
      await expect(repository.getById(renamedStudio.id)).resolves.toEqual(
        renamedStudio,
      );

      const archivedStudio = {
        ...renamedStudio,
        archivedAt: ARCHIVED_AT,
        updatedAt: ARCHIVED_AT,
      } satisfies Studio;
      await repository.save(archivedStudio);
      await expect(repository.getById(archivedStudio.id)).resolves.toEqual(
        archivedStudio,
      );
      await expect(repository.list()).resolves.toEqual([createdSecondStudio]);
      firstPersistence.database.close();

      const secondPersistence = await openTestPersistence(temporaryDirectory);
      try {
        const reopenedRepository = new SqliteStudioRepository(
          secondPersistence.database,
        );
        await expect(
          reopenedRepository.getById(archivedStudio.id),
        ).resolves.toEqual(archivedStudio);
        await expect(reopenedRepository.list()).resolves.toEqual([
          createdSecondStudio,
        ]);
        await expect(
          reopenedRepository.getById(
            parseEntityId<"studio">("7e83310b-e8f2-4d46-a441-552288431802"),
          ),
        ).resolves.toBeNull();
      } finally {
        secondPersistence.database.close();
      }
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("rejects malformed stored Studio data through a controlled error", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-studio-row-test-"),
    );

    try {
      const persistence = await openTestPersistence(temporaryDirectory);
      try {
        persistence.database.run(
          `
            INSERT INTO studios (
              id,
              name,
              logo_resource_id,
              archived_at,
              created_at,
              updated_at
            ) VALUES (?, ?, NULL, NULL, ?, ?)
          `,
          [FIRST_STUDIO_ID, "Public Sphere", CREATED_AT, CREATED_AT],
        );
        persistence.database.run("UPDATE studios SET id = ? WHERE id = ?", [
          "00000000-0000-0000-0000-000000000000",
          FIRST_STUDIO_ID,
        ]);
        const repository = new SqliteStudioRepository(persistence.database);
        const failure = await repository
          .list()
          .catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(PersistenceFailureError);
        expect(failure).toMatchObject({
          code: "PERSISTENCE_FAILURE",
          operation: "read",
        });
        if (!(failure instanceof PersistenceFailureError)) {
          throw new Error("Expected a mapped persistence failure.");
        }
        expect(failure.cause).toBeInstanceOf(StoredStudioError);
      } finally {
        persistence.database.close();
      }
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("maps low-level Studio read and write failures", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-studio-error-test-"),
    );

    try {
      const persistence = await openTestPersistence(temporaryDirectory);
      try {
        const repository = new SqliteStudioRepository(persistence.database);
        persistence.database.executeScript("DROP TABLE studios");

        await expect(repository.list()).rejects.toMatchObject({
          code: "PERSISTENCE_FAILURE",
          operation: "read",
        });
        await expect(repository.save(firstStudio())).rejects.toMatchObject({
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
});
