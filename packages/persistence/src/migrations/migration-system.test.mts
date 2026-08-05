import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { z } from "zod";
import { describe, expect, test } from "vitest";

import { BackupError } from "../backup/backup-service.mjs";
import { openShowflowDatabase } from "../database/database-service.mjs";
import { initializePersistence } from "./initialize-persistence.mjs";
import { loadMigrations } from "./migration-loader.mjs";
import {
  MigrationError,
  type MigrationLogEvent,
  type MigrationLogger,
} from "./migration-model.mjs";
import { runMigrations } from "./migration-runner.mjs";
import {
  createTestDatabase,
  type TestDatabase,
} from "../testing/create-test-database.mjs";

const FIXED_TIMESTAMP = "2026-08-05T06:30:00.000Z";
const TextRowSchema = z.object({ value: z.string() }).strict();
const CountRowSchema = z.object({ count: z.number().int() }).strict();
const AppliedMigrationRowSchema = z
  .object({
    appliedAt: z.string(),
    checksum: z.string(),
    name: z.string(),
    version: z.number().int(),
  })
  .strict();

const createMigrationDirectory = async (
  testDatabase: Pick<TestDatabase, "temporaryDirectory">,
  files: Readonly<Record<string, string>>,
): Promise<string> => {
  const migrationsDirectory = path.join(
    testDatabase.temporaryDirectory,
    "migrations",
  );
  await fs.mkdir(migrationsDirectory, { recursive: true });
  await fs.writeFile(
    path.join(migrationsDirectory, "README.md"),
    "Migration fixtures.\n",
    "utf8",
  );
  await Promise.all(
    Object.entries(files).map(([fileName, sql]) =>
      fs.writeFile(path.join(migrationsDirectory, fileName), sql, "utf8"),
    ),
  );
  return migrationsDirectory;
};

const createCapturingLogger = (): {
  readonly events: MigrationLogEvent[];
  readonly logger: MigrationLogger;
} => {
  const events: MigrationLogEvent[] = [];
  return {
    events,
    logger: {
      log(event): void {
        events.push(event);
      },
    },
  };
};

const runTestMigrations = async (
  testDatabase: TestDatabase,
  migrationsDirectory: string,
  logger: MigrationLogger,
) =>
  runMigrations({
    database: testDatabase.database,
    logger,
    migrationsDirectory,
    now: () => FIXED_TIMESTAMP,
  });

describe("migration system", () => {
  test("applies numbered migrations in order to an empty database", async () => {
    const testDatabase = await createTestDatabase();
    const migrationsDirectory = await createMigrationDirectory(testDatabase, {
      "001_create_migration_events.sql": `
        CREATE TABLE migration_events (
          position INTEGER PRIMARY KEY,
          value TEXT NOT NULL
        ) STRICT;
        INSERT INTO migration_events (position, value) VALUES (1, 'first');
      `,
      "002_append_migration_event.sql": `
        INSERT INTO migration_events (position, value) VALUES (2, 'second');
      `,
    });
    const { events, logger } = createCapturingLogger();

    try {
      const result = await runTestMigrations(
        testDatabase,
        migrationsDirectory,
        logger,
      );

      expect(result.appliedMigrations.map(({ version }) => version)).toEqual([
        1, 2,
      ]);
      expect(result.previouslyAppliedCount).toBe(0);
      expect(result.totalMigrationCount).toBe(2);
      expect(
        testDatabase.database.queryAll(
          "SELECT value FROM migration_events ORDER BY position",
          TextRowSchema,
        ),
      ).toEqual([{ value: "first" }, { value: "second" }]);
      expect(
        testDatabase.database.queryAll(
          `
            SELECT
              version,
              name,
              checksum,
              applied_at AS appliedAt
            FROM schema_migrations
            ORDER BY version
          `,
          AppliedMigrationRowSchema,
        ),
      ).toEqual([
        {
          appliedAt: FIXED_TIMESTAMP,
          checksum: result.appliedMigrations[0]?.checksum,
          name: "create_migration_events",
          version: 1,
        },
        {
          appliedAt: FIXED_TIMESTAMP,
          checksum: result.appliedMigrations[1]?.checksum,
          name: "append_migration_event",
          version: 2,
        },
      ]);
      expect(events.map(({ type }) => type)).toEqual([
        "migration-applying",
        "migration-applied",
        "migration-applying",
        "migration-applied",
        "migration-run-complete",
      ]);
    } finally {
      await testDatabase.cleanup();
    }
  });

  test("does not apply a migration more than once", async () => {
    const testDatabase = await createTestDatabase();
    const migrationsDirectory = await createMigrationDirectory(testDatabase, {
      "001_create_counter.sql": `
        CREATE TABLE migration_counter (value INTEGER NOT NULL) STRICT;
        INSERT INTO migration_counter (value) VALUES (1);
      `,
    });
    const firstLogger = createCapturingLogger();
    const secondLogger = createCapturingLogger();

    try {
      await runTestMigrations(
        testDatabase,
        migrationsDirectory,
        firstLogger.logger,
      );
      const secondResult = await runTestMigrations(
        testDatabase,
        migrationsDirectory,
        secondLogger.logger,
      );

      expect(secondResult).toMatchObject({
        appliedMigrations: [],
        previouslyAppliedCount: 1,
        totalMigrationCount: 1,
      });
      expect(
        testDatabase.database.queryRequired(
          "SELECT COUNT(*) AS count FROM migration_counter",
          CountRowSchema,
        ),
      ).toEqual({ count: 1 });
      expect(secondLogger.events).toEqual([
        {
          appliedCount: 0,
          previouslyAppliedCount: 1,
          totalMigrationCount: 1,
          type: "migration-run-complete",
        },
      ]);
    } finally {
      await testDatabase.cleanup();
    }
  });

  test("backs up the database before pending migrations and not on an idempotent startup", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-pre-migration-backup-test-"),
    );
    const databasePath = path.join(temporaryDirectory, "showflow.sqlite");
    const backupsDirectory = path.join(temporaryDirectory, "backups");
    const migrationsDirectory = await createMigrationDirectory(
      { temporaryDirectory },
      {
        "001_create_storyboard_state.sql": `
          CREATE TABLE storyboard_state (value TEXT NOT NULL) STRICT;
          INSERT INTO storyboard_state (value) VALUES ('before second migration');
        `,
      },
    );
    const logger = createCapturingLogger().logger;

    try {
      const firstStartup = await initializePersistence({
        backup: { backupsDirectory, retentionCount: 3 },
        databasePath,
        logger,
        migrationsDirectory,
        now: () => "2026-08-05T06:30:00.000Z",
      });
      firstStartup.database.close();

      await fs.writeFile(
        path.join(migrationsDirectory, "002_update_storyboard_state.sql"),
        "UPDATE storyboard_state SET value = 'after second migration';",
        "utf8",
      );
      const secondStartup = await initializePersistence({
        backup: { backupsDirectory, retentionCount: 3 },
        databasePath,
        logger,
        migrationsDirectory,
        now: () => "2026-08-05T06:31:00.000Z",
      });
      expect(
        secondStartup.database.queryRequired(
          "SELECT value FROM storyboard_state",
          TextRowSchema,
        ),
      ).toEqual({ value: "after second migration" });
      secondStartup.database.close();

      const preMigrationBackup = new DatabaseSync(
        path.join(
          backupsDirectory,
          "showflow-backup-20260805T063100000Z.sqlite",
        ),
        { readOnly: true },
      );
      try {
        expect(
          TextRowSchema.parse(
            preMigrationBackup
              .prepare("SELECT value FROM storyboard_state")
              .get(),
          ),
        ).toEqual({ value: "before second migration" });
      } finally {
        preMigrationBackup.close();
      }

      const idempotentStartup = await initializePersistence({
        backup: { backupsDirectory, retentionCount: 3 },
        databasePath,
        logger,
        migrationsDirectory,
        now: () => "2026-08-05T06:32:00.000Z",
      });
      idempotentStartup.database.close();
      expect(
        (await fs.readdir(backupsDirectory))
          .filter((fileName) => fileName.endsWith(".sqlite"))
          .sort(),
      ).toEqual([
        "showflow-backup-20260805T063000000Z.sqlite",
        "showflow-backup-20260805T063100000Z.sqlite",
      ]);
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("rolls back a failed migration and reports a startup failure", async () => {
    const testDatabase = await createTestDatabase();
    const migrationsDirectory = await createMigrationDirectory(testDatabase, {
      "001_create_stable_records.sql": `
        CREATE TABLE stable_records (value TEXT NOT NULL) STRICT;
        INSERT INTO stable_records (value) VALUES ('kept');
      `,
      "002_create_broken_records.sql": `
        CREATE TABLE rolled_back_records (value TEXT NOT NULL) STRICT;
        INSERT INTO rolled_back_records (value) VALUES ('remove me');
        INSERT INTO missing_table (value) VALUES ('fail');
      `,
    });
    const { events, logger } = createCapturingLogger();

    try {
      const failure = await runTestMigrations(
        testDatabase,
        migrationsDirectory,
        logger,
      ).catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(MigrationError);
      expect(failure).toMatchObject({
        code: "MIGRATION_APPLY_FAILED",
        migration: {
          name: "create_broken_records",
          version: 2,
        },
      });
      expect(
        testDatabase.database.queryRequired(
          "SELECT COUNT(*) AS count FROM stable_records",
          CountRowSchema,
        ),
      ).toEqual({ count: 1 });
      expect(
        testDatabase.database.queryRequired(
          `
            SELECT COUNT(*) AS count
            FROM sqlite_master
            WHERE type = 'table' AND name = 'rolled_back_records'
          `,
          CountRowSchema,
        ),
      ).toEqual({ count: 0 });
      expect(
        testDatabase.database.queryAll(
          "SELECT version FROM schema_migrations ORDER BY version",
          z.object({ version: z.number().int() }).strict(),
        ),
      ).toEqual([{ version: 1 }]);
      expect(events).toContainEqual(
        expect.objectContaining({
          migration: { name: "create_broken_records", version: 2 },
          type: "migration-failed",
        }),
      );
    } finally {
      await testDatabase.cleanup();
    }
  });

  test("closes the database when startup migration fails", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-migration-startup-test-"),
    );
    const databasePath = path.join(temporaryDirectory, "showflow.sqlite");
    const migrationsDirectory = await createMigrationDirectory(
      { temporaryDirectory },
      {
        "001_broken_startup.sql":
          "CREATE TABLE startup_record (value TEXT); INSERT INTO missing_table VALUES (1);",
      },
    );
    const logger = createCapturingLogger().logger;

    try {
      await expect(
        initializePersistence({
          backup: {
            backupsDirectory: path.join(temporaryDirectory, "backups"),
            retentionCount: 2,
          },
          databasePath,
          logger,
          migrationsDirectory,
          now: () => FIXED_TIMESTAMP,
        }),
      ).rejects.toMatchObject({ code: "MIGRATION_APPLY_FAILED" });

      await expect(fs.rm(databasePath)).resolves.toBeUndefined();
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("does not apply pending migrations when the required backup fails", async () => {
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-backup-failure-test-"),
    );
    const databasePath = path.join(temporaryDirectory, "showflow.sqlite");
    const backupsDirectory = path.join(temporaryDirectory, "backups");
    const migrationsDirectory = await createMigrationDirectory(
      { temporaryDirectory },
      {
        "001_create_blocked_table.sql":
          "CREATE TABLE blocked_table (value TEXT NOT NULL) STRICT;",
      },
    );
    await fs.writeFile(backupsDirectory, "not a directory", "utf8");
    const logger = createCapturingLogger().logger;

    try {
      const failure = await initializePersistence({
        backup: { backupsDirectory, retentionCount: 2 },
        databasePath,
        logger,
        migrationsDirectory,
        now: () => FIXED_TIMESTAMP,
      }).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(BackupError);
      expect(failure).toMatchObject({ code: "BACKUP_CREATE_FAILED" });

      const database = await openShowflowDatabase({ databasePath });
      try {
        expect(
          database.queryRequired(
            `
              SELECT COUNT(*) AS count
              FROM sqlite_master
              WHERE type = 'table' AND name = 'blocked_table'
            `,
            CountRowSchema,
          ),
        ).toEqual({ count: 0 });
      } finally {
        database.close();
      }
    } finally {
      await fs.rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test("rejects edits to an applied migration", async () => {
    const testDatabase = await createTestDatabase();
    const fileName = "001_create_immutable_record.sql";
    const migrationsDirectory = await createMigrationDirectory(testDatabase, {
      [fileName]: "CREATE TABLE immutable_record (value TEXT NOT NULL) STRICT;",
    });
    const logger = createCapturingLogger().logger;

    try {
      await runTestMigrations(testDatabase, migrationsDirectory, logger);
      await fs.writeFile(
        path.join(migrationsDirectory, fileName),
        "CREATE TABLE edited_record (value TEXT NOT NULL) STRICT;",
        "utf8",
      );

      await expect(
        runTestMigrations(testDatabase, migrationsDirectory, logger),
      ).rejects.toMatchObject({ code: "MIGRATION_HISTORY_INVALID" });
    } finally {
      await testDatabase.cleanup();
    }
  });

  test("rejects malformed or nonsequential SQL migration filenames", async () => {
    const testDatabase = await createTestDatabase();
    const malformedDirectory = await createMigrationDirectory(testDatabase, {
      "migration.sql": "SELECT 1;",
    });

    try {
      await expect(loadMigrations(malformedDirectory)).rejects.toMatchObject({
        code: "MIGRATION_LOAD_FAILED",
      });

      await fs.rm(path.join(malformedDirectory, "migration.sql"));
      await fs.writeFile(
        path.join(malformedDirectory, "002_second.sql"),
        "SELECT 2;",
        "utf8",
      );
      await expect(loadMigrations(malformedDirectory)).rejects.toMatchObject({
        code: "MIGRATION_LOAD_FAILED",
      });
    } finally {
      await testDatabase.cleanup();
    }
  });
});
