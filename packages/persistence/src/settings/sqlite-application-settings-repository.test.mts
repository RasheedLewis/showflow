import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";
import { z } from "zod";

import { PersistenceFailureError } from "@showflow/application";

import { initializePersistence } from "../migrations/initialize-persistence.mjs";
import type { MigrationLogger } from "../migrations/migration-model.mjs";
import {
  SqliteApplicationSettingsRepository,
  StoredApplicationSettingsError,
} from "./sqlite-application-settings-repository.mjs";

const MIGRATIONS_DIRECTORY = path.resolve(
  import.meta.dirname,
  "../../../../migrations",
);
const STUDIO_ID = "8d9df01f-2584-4b9a-ad13-a96d673918e9";
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
    now: () => "2026-08-05T06:30:00.000Z",
  });

describe("SqliteApplicationSettingsRepository", () => {
  test("persists and reloads navigation and window preferences", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-settings-repository-test-"),
    );

    try {
      const firstPersistence = await openTestPersistence(temporaryDirectory);
      const firstRepository = new SqliteApplicationSettingsRepository(
        firstPersistence.database,
      );
      await expect(firstRepository.get()).resolves.toEqual({
        lastRoute: "/",
        lastStudioId: null,
        windowPreferences: null,
      });
      await firstRepository.updateNavigation({
        lastRoute: `/studio/${STUDIO_ID}`,
        lastStudioId: STUDIO_ID,
      });
      await firstRepository.updateWindowPreferences({
        height: 800,
        isMaximized: true,
        width: 1280,
      });
      firstPersistence.database.close();

      const secondPersistence = await openTestPersistence(temporaryDirectory);
      try {
        const secondRepository = new SqliteApplicationSettingsRepository(
          secondPersistence.database,
        );
        await expect(secondRepository.get()).resolves.toEqual({
          lastRoute: `/studio/${STUDIO_ID}`,
          lastStudioId: STUDIO_ID,
          windowPreferences: {
            height: 800,
            isMaximized: true,
            width: 1280,
          },
        });
      } finally {
        secondPersistence.database.close();
      }
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("rejects malformed stored window preferences through a controlled error", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-settings-json-test-"),
    );

    try {
      const persistence = await openTestPersistence(temporaryDirectory);
      try {
        persistence.database.run(
          "UPDATE app_settings SET window_preferences_json = ? WHERE id = 1",
          ['{"width":"wide","height":800,"isMaximized":false}'],
        );
        const repository = new SqliteApplicationSettingsRepository(
          persistence.database,
        );
        const failure = await repository.get().catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(PersistenceFailureError);
        expect(failure).toMatchObject({
          code: "PERSISTENCE_FAILURE",
          operation: "read",
        });
        if (!(failure instanceof PersistenceFailureError)) {
          throw new Error("Expected a mapped persistence failure.");
        }
        expect(failure.cause).toBeInstanceOf(StoredApplicationSettingsError);
      } finally {
        persistence.database.close();
      }
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("maps low-level read and write failures without copying database details", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-settings-error-mapping-test-"),
    );

    try {
      const persistence = await openTestPersistence(temporaryDirectory);
      try {
        const repository = new SqliteApplicationSettingsRepository(
          persistence.database,
        );
        persistence.database.executeScript("DROP TABLE app_settings");

        const readFailure = await repository
          .get()
          .catch((error: unknown) => error);
        const writeFailure = await repository
          .updateNavigation({ lastRoute: "/studio/new", lastStudioId: null })
          .catch((error: unknown) => error);

        expect(readFailure).toMatchObject({
          code: "PERSISTENCE_FAILURE",
          operation: "read",
        });
        expect(writeFailure).toMatchObject({
          code: "PERSISTENCE_FAILURE",
          operation: "write",
        });
        if (
          !(readFailure instanceof PersistenceFailureError) ||
          !(writeFailure instanceof PersistenceFailureError)
        ) {
          throw new Error("Expected mapped persistence failures.");
        }
        expect(readFailure.message).not.toMatch(/app_settings|SELECT|SQLITE/u);
        expect(writeFailure.message).not.toMatch(/app_settings|UPDATE|SQLITE/u);
      } finally {
        persistence.database.close();
      }
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("rolls back a settings write when the saved result cannot be mapped", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-settings-rollback-test-"),
    );

    try {
      const persistence = await openTestPersistence(temporaryDirectory);
      try {
        persistence.database.run(
          "UPDATE app_settings SET window_preferences_json = ? WHERE id = 1",
          ['{"width":"wide","height":800,"isMaximized":false}'],
        );
        const repository = new SqliteApplicationSettingsRepository(
          persistence.database,
        );

        await expect(
          repository.updateNavigation({
            lastRoute: "/studio/new",
            lastStudioId: null,
          }),
        ).rejects.toMatchObject({
          code: "PERSISTENCE_FAILURE",
          operation: "write",
        });
        expect(
          persistence.database.queryRequired(
            "SELECT last_route AS lastRoute FROM app_settings WHERE id = 1",
            z.object({ lastRoute: z.string() }).strict(),
          ),
        ).toEqual({ lastRoute: "/" });
      } finally {
        persistence.database.close();
      }
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  });
});
