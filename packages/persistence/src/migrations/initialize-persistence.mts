import {
  openShowflowDatabase,
  type ShowflowDatabase,
} from "../database/database-service.mjs";
import { runMigrations, type MigrationRunResult } from "./migration-runner.mjs";
import type { MigrationLogger } from "./migration-model.mjs";

export interface InitializePersistenceOptions {
  readonly databasePath: string;
  readonly logger: MigrationLogger;
  readonly migrationsDirectory: string;
  readonly now?: () => string;
}

export interface InitializedPersistence {
  readonly database: ShowflowDatabase;
  readonly migrationResult: MigrationRunResult;
}

export const initializePersistence = async (
  options: InitializePersistenceOptions,
): Promise<InitializedPersistence> => {
  const database = await openShowflowDatabase({
    databasePath: options.databasePath,
  });

  try {
    const migrationResult = await runMigrations({
      database,
      logger: options.logger,
      migrationsDirectory: options.migrationsDirectory,
      ...(options.now === undefined ? {} : { now: options.now }),
    });

    return { database, migrationResult };
  } catch (error) {
    try {
      database.close();
    } catch (closeError) {
      throw new AggregateError(
        [error, closeError],
        "Showflow persistence initialization and connection cleanup both failed.",
        { cause: closeError },
      );
    }

    throw error;
  }
};
