import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  openShowflowDatabase,
  type ShowflowDatabase,
} from "../database/database-service.mjs";

export interface TestDatabase {
  readonly database: ShowflowDatabase;
  readonly databasePath: string;
  readonly temporaryDirectory: string;
  cleanup(): Promise<void>;
}

export const createTestDatabase = async (): Promise<TestDatabase> => {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "showflow-database-test-"),
  );
  const databasePath = path.join(
    temporaryDirectory,
    "user-data",
    "showflow-test.sqlite",
  );

  let database: ShowflowDatabase;
  try {
    database = await openShowflowDatabase({ databasePath });
  } catch (error) {
    await fs.rm(temporaryDirectory, { force: true, recursive: true });
    throw error;
  }

  let cleanedUp = false;

  return {
    database,
    databasePath,
    temporaryDirectory,
    async cleanup(): Promise<void> {
      if (cleanedUp) {
        return;
      }

      cleanedUp = true;
      try {
        database.close();
      } finally {
        await fs.rm(temporaryDirectory, { force: true, recursive: true });
      }
    },
  };
};
