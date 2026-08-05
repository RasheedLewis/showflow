import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { z } from "zod";
import { describe, expect, test } from "vitest";

import { BackupError, createPreMigrationBackup } from "./backup-service.mjs";
import { createTestDatabase } from "../testing/create-test-database.mjs";

const FIRST_TIMESTAMP = "2026-08-05T06:30:00.000Z";
const SECOND_TIMESTAMP = "2026-08-05T06:31:00.000Z";
const THIRD_TIMESTAMP = "2026-08-05T06:32:00.000Z";
const ValueRowSchema = z.object({ value: z.string() }).strict();

const readBackupValue = (backupPath: string): string => {
  const backupDatabase = new DatabaseSync(backupPath, { readOnly: true });

  try {
    const row = backupDatabase
      .prepare("SELECT value FROM backup_records WHERE id = 1")
      .get();
    return ValueRowSchema.parse(row).value;
  } finally {
    backupDatabase.close();
  }
};

describe("backup service", () => {
  test("creates a timestamped backup that opens independently with the source state", async () => {
    const testDatabase = await createTestDatabase();
    const backupsDirectory = path.join(
      testDatabase.temporaryDirectory,
      "backups",
    );

    try {
      testDatabase.database.executeScript(`
        CREATE TABLE backup_records (
          id INTEGER PRIMARY KEY,
          value TEXT NOT NULL
        ) STRICT;
        INSERT INTO backup_records (id, value) VALUES (1, 'before migration');
      `);

      const result = await createPreMigrationBackup({
        backupsDirectory,
        databasePath: testDatabase.databasePath,
        now: () => FIRST_TIMESTAMP,
        retentionCount: 3,
      });
      testDatabase.database.run(
        "UPDATE backup_records SET value = ? WHERE id = 1",
        ["after migration"],
      );

      expect(path.basename(result.backupPath)).toBe(
        "showflow-backup-20260805T063000000Z.sqlite",
      );
      expect(result.pagesCopied).toBeGreaterThan(0);
      expect(result.removedBackupPaths).toEqual([]);
      expect(readBackupValue(result.backupPath)).toBe("before migration");
      expect(
        testDatabase.database.queryRequired(
          "SELECT value FROM backup_records WHERE id = 1",
          ValueRowSchema,
        ),
      ).toEqual({ value: "after migration" });
    } finally {
      await testDatabase.cleanup();
    }
  });

  test("creates the backup directory and retains only the configured count", async () => {
    const testDatabase = await createTestDatabase();
    const backupsDirectory = path.join(
      testDatabase.temporaryDirectory,
      "nested",
      "backups",
    );

    try {
      testDatabase.database.executeScript(
        "CREATE TABLE backup_records (id INTEGER PRIMARY KEY, value TEXT NOT NULL) STRICT;",
      );
      const backupPaths: string[] = [];

      for (const timestamp of [
        FIRST_TIMESTAMP,
        SECOND_TIMESTAMP,
        THIRD_TIMESTAMP,
      ]) {
        const result = await createPreMigrationBackup({
          backupsDirectory,
          databasePath: testDatabase.databasePath,
          now: () => timestamp,
          retentionCount: 2,
        });
        backupPaths.push(result.backupPath);
      }

      const retainedFiles = (await fs.readdir(backupsDirectory)).sort();
      expect(retainedFiles).toEqual([
        "showflow-backup-20260805T063100000Z.sqlite",
        "showflow-backup-20260805T063200000Z.sqlite",
      ]);
      await expect(fs.stat(backupPaths[0] ?? "")).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await testDatabase.cleanup();
    }
  });

  test("reports a controlled failure when the backup directory cannot be created", async () => {
    const testDatabase = await createTestDatabase();
    const backupsDirectory = path.join(
      testDatabase.temporaryDirectory,
      "backups",
    );
    await fs.writeFile(backupsDirectory, "not a directory", "utf8");

    try {
      const failure = await createPreMigrationBackup({
        backupsDirectory,
        databasePath: testDatabase.databasePath,
        now: () => FIRST_TIMESTAMP,
        retentionCount: 2,
      }).catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(BackupError);
      expect(failure).toMatchObject({ code: "BACKUP_CREATE_FAILED" });
    } finally {
      await testDatabase.cleanup();
    }
  });

  test("rejects an invalid retention count before creating backup data", async () => {
    const testDatabase = await createTestDatabase();
    const backupsDirectory = path.join(
      testDatabase.temporaryDirectory,
      "backups",
    );

    try {
      await expect(
        createPreMigrationBackup({
          backupsDirectory,
          databasePath: testDatabase.databasePath,
          now: () => FIRST_TIMESTAMP,
          retentionCount: 0,
        }),
      ).rejects.toMatchObject({ code: "BACKUP_CONFIGURATION_INVALID" });
      await expect(fs.stat(backupsDirectory)).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await testDatabase.cleanup();
    }
  });
});
