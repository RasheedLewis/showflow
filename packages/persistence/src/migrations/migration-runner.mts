import { z } from "zod";

import { loadMigrations } from "./migration-loader.mjs";
import {
  MigrationError,
  type AppliedMigration,
  type LoadedMigration,
  type MigrationIdentity,
  type MigrationLogger,
} from "./migration-model.mjs";
import type { ShowflowDatabase } from "../database/database-service.mjs";

export interface RunMigrationsOptions {
  readonly database: ShowflowDatabase;
  readonly logger: MigrationLogger;
  readonly migrationsDirectory: string;
  readonly now?: () => string;
}

export interface MigrationRunResult {
  readonly appliedMigrations: readonly AppliedMigration[];
  readonly previouslyAppliedCount: number;
  readonly totalMigrationCount: number;
}

const UtcTimestampSchema = z
  .string()
  .datetime({ offset: true })
  .refine((value) => value.endsWith("Z"), "Timestamp must use UTC.");
const AppliedMigrationRowSchema = z
  .object({
    appliedAt: UtcTimestampSchema,
    checksum: z.string().regex(/^[a-f0-9]{64}$/u),
    name: z.string().min(1),
    version: z.number().int().positive(),
  })
  .strict();

const SCHEMA_MIGRATIONS_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY CHECK (version > 0),
    name TEXT NOT NULL UNIQUE,
    checksum TEXT NOT NULL CHECK (length(checksum) = 64),
    applied_at TEXT NOT NULL
  ) STRICT;
`;

const APPLIED_MIGRATIONS_QUERY = `
  SELECT
    version,
    name,
    checksum,
    applied_at AS appliedAt
  FROM schema_migrations
  ORDER BY version
`;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown migration failure.";

const migrationIdentity = (migration: LoadedMigration): MigrationIdentity => ({
  name: migration.name,
  version: migration.version,
});

const initializeMigrationHistory = (database: ShowflowDatabase): void => {
  try {
    database.executeScript(SCHEMA_MIGRATIONS_SQL);
  } catch (error) {
    throw new MigrationError({
      cause: error,
      code: "MIGRATION_INITIALIZATION_FAILED",
      message: "Showflow could not initialize migration history.",
    });
  }
};

const readAppliedMigrations = (
  database: ShowflowDatabase,
): AppliedMigration[] => {
  try {
    return database.queryAll(
      APPLIED_MIGRATIONS_QUERY,
      AppliedMigrationRowSchema,
    );
  } catch (error) {
    throw new MigrationError({
      cause: error,
      code: "MIGRATION_HISTORY_INVALID",
      message: "Showflow migration history could not be read or validated.",
    });
  }
};

const validateMigrationHistory = (
  migrations: readonly LoadedMigration[],
  appliedMigrations: readonly AppliedMigration[],
): void => {
  for (const [index, applied] of appliedMigrations.entries()) {
    const migration = migrations[index];
    if (
      migration === undefined ||
      applied.version !== migration.version ||
      applied.name !== migration.name ||
      applied.checksum !== migration.checksum
    ) {
      throw new MigrationError({
        code: "MIGRATION_HISTORY_INVALID",
        message:
          "An applied Showflow migration is missing, renamed, reordered, or edited.",
        migration: { name: applied.name, version: applied.version },
      });
    }
  }
};

const applyMigration = (
  database: ShowflowDatabase,
  migration: LoadedMigration,
  logger: MigrationLogger,
  now: () => string,
): AppliedMigration => {
  const identity = migrationIdentity(migration);
  logger.log({ migration: identity, type: "migration-applying" });

  try {
    const appliedAt = UtcTimestampSchema.parse(now());
    database.transaction((transaction) => {
      transaction.executeScript(migration.sql);
      transaction.run(
        `
          INSERT INTO schema_migrations (
            version,
            name,
            checksum,
            applied_at
          ) VALUES (?, ?, ?, ?)
        `,
        [migration.version, migration.name, migration.checksum, appliedAt],
      );
    });

    const appliedMigration: AppliedMigration = {
      appliedAt,
      checksum: migration.checksum,
      ...identity,
    };
    logger.log({
      appliedAt,
      migration: identity,
      type: "migration-applied",
    });
    return appliedMigration;
  } catch (error) {
    logger.log({
      message: getErrorMessage(error),
      migration: identity,
      type: "migration-failed",
    });
    throw new MigrationError({
      cause: error,
      code: "MIGRATION_APPLY_FAILED",
      message: `Showflow could not apply migration ${String(migration.version).padStart(3, "0")}_${migration.name}.`,
      migration: identity,
    });
  }
};

export const runMigrations = async (
  options: RunMigrationsOptions,
): Promise<MigrationRunResult> => {
  const migrations = await loadMigrations(options.migrationsDirectory);
  initializeMigrationHistory(options.database);
  const previouslyApplied = readAppliedMigrations(options.database);
  validateMigrationHistory(migrations, previouslyApplied);

  const now = options.now ?? (() => new Date().toISOString());
  const appliedMigrations: AppliedMigration[] = [];

  for (const migration of migrations.slice(previouslyApplied.length)) {
    appliedMigrations.push(
      applyMigration(options.database, migration, options.logger, now),
    );
  }

  options.logger.log({
    appliedCount: appliedMigrations.length,
    previouslyAppliedCount: previouslyApplied.length,
    totalMigrationCount: migrations.length,
    type: "migration-run-complete",
  });

  return {
    appliedMigrations,
    previouslyAppliedCount: previouslyApplied.length,
    totalMigrationCount: migrations.length,
  };
};
