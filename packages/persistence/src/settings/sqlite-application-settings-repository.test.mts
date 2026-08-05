import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

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

        expect(failure).toBeInstanceOf(StoredApplicationSettingsError);
        expect(failure).toMatchObject({ code: "STORED_SETTINGS_INVALID" });
      } finally {
        persistence.database.close();
      }
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  });
});
