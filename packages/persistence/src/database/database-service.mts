import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { z } from "zod";

export type DatabaseParameter = bigint | null | number | string | Uint8Array;

export interface DatabaseRowParser<TResult> {
  parse(value: unknown): TResult;
}

export interface DatabaseRunResult {
  readonly changes: bigint | number;
  readonly lastInsertRowId: bigint | number;
}

export interface DatabaseExecutor {
  executeScript(sql: string): void;
  run(
    sql: string,
    parameters?: readonly DatabaseParameter[],
  ): DatabaseRunResult;
  queryOne<TResult>(
    sql: string,
    parser: DatabaseRowParser<TResult>,
    parameters?: readonly DatabaseParameter[],
  ): TResult | undefined;
  queryRequired<TResult>(
    sql: string,
    parser: DatabaseRowParser<TResult>,
    parameters?: readonly DatabaseParameter[],
  ): TResult;
  queryAll<TResult>(
    sql: string,
    parser: DatabaseRowParser<TResult>,
    parameters?: readonly DatabaseParameter[],
  ): TResult[];
}

export interface ShowflowDatabase extends DatabaseExecutor {
  readonly databasePath: string;
  readonly isOpen: boolean;
  transaction<TResult>(
    operation: (transaction: DatabaseExecutor) => TResult,
  ): TResult;
  close(): void;
}

export interface OpenShowflowDatabaseOptions {
  readonly databasePath: string;
}

const DatabaseConfigurationSchema = z
  .object({
    busyTimeout: z.literal(5_000),
    foreignKeys: z.literal(1),
    journalMode: z.literal("wal"),
    synchronous: z.literal(1),
  })
  .strict();

const DATABASE_CONFIGURATION_SQL = `
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA busy_timeout = 5000;
`;

const DATABASE_CONFIGURATION_QUERY = `
  SELECT
    (SELECT foreign_keys FROM pragma_foreign_keys) AS foreignKeys,
    (SELECT journal_mode FROM pragma_journal_mode) AS journalMode,
    (SELECT synchronous FROM pragma_synchronous) AS synchronous,
    (SELECT timeout FROM pragma_busy_timeout) AS busyTimeout
`;

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  (typeof value === "object" || typeof value === "function") &&
  value !== null &&
  "then" in value &&
  typeof value.then === "function";

class NodeSqliteExecutor implements DatabaseExecutor {
  readonly #database: DatabaseSync;

  constructor(database: DatabaseSync) {
    this.#database = database;
  }

  executeScript(sql: string): void {
    this.#getOpenDatabase().exec(sql);
  }

  run(
    sql: string,
    parameters: readonly DatabaseParameter[] = [],
  ): DatabaseRunResult {
    const result = this.#getOpenDatabase()
      .prepare(sql)
      .run(...parameters);

    return {
      changes: result.changes,
      lastInsertRowId: result.lastInsertRowid,
    };
  }

  queryOne<TResult>(
    sql: string,
    parser: DatabaseRowParser<TResult>,
    parameters: readonly DatabaseParameter[] = [],
  ): TResult | undefined {
    const row = this.#getOpenDatabase()
      .prepare(sql)
      .get(...parameters);
    return row === undefined ? undefined : parser.parse(row);
  }

  queryRequired<TResult>(
    sql: string,
    parser: DatabaseRowParser<TResult>,
    parameters: readonly DatabaseParameter[] = [],
  ): TResult {
    const row = this.queryOne(sql, parser, parameters);

    if (row === undefined) {
      throw new Error("The database query did not return a required row.");
    }

    return row;
  }

  queryAll<TResult>(
    sql: string,
    parser: DatabaseRowParser<TResult>,
    parameters: readonly DatabaseParameter[] = [],
  ): TResult[] {
    return this.#getOpenDatabase()
      .prepare(sql)
      .all(...parameters)
      .map((row) => parser.parse(row));
  }

  #getOpenDatabase(): DatabaseSync {
    if (!this.#database.isOpen) {
      throw new Error("The Showflow database connection is closed.");
    }

    return this.#database;
  }
}

class NodeSqliteDatabaseService implements ShowflowDatabase {
  readonly databasePath: string;
  readonly #database: DatabaseSync;
  readonly #executor: DatabaseExecutor;

  constructor(databasePath: string, database: DatabaseSync) {
    this.databasePath = databasePath;
    this.#database = database;
    this.#executor = new NodeSqliteExecutor(database);
  }

  get isOpen(): boolean {
    return this.#database.isOpen;
  }

  executeScript(sql: string): void {
    this.#executor.executeScript(sql);
  }

  run(
    sql: string,
    parameters: readonly DatabaseParameter[] = [],
  ): DatabaseRunResult {
    return this.#executor.run(sql, parameters);
  }

  queryOne<TResult>(
    sql: string,
    parser: DatabaseRowParser<TResult>,
    parameters: readonly DatabaseParameter[] = [],
  ): TResult | undefined {
    return this.#executor.queryOne(sql, parser, parameters);
  }

  queryRequired<TResult>(
    sql: string,
    parser: DatabaseRowParser<TResult>,
    parameters: readonly DatabaseParameter[] = [],
  ): TResult {
    return this.#executor.queryRequired(sql, parser, parameters);
  }

  queryAll<TResult>(
    sql: string,
    parser: DatabaseRowParser<TResult>,
    parameters: readonly DatabaseParameter[] = [],
  ): TResult[] {
    return this.#executor.queryAll(sql, parser, parameters);
  }

  transaction<TResult>(
    operation: (transaction: DatabaseExecutor) => TResult,
  ): TResult {
    this.#assertOpen();

    if (this.#database.isTransaction) {
      throw new Error("A Showflow database transaction is already active.");
    }

    this.#database.exec("BEGIN IMMEDIATE");

    try {
      const result = operation(this.#executor);

      if (isPromiseLike(result)) {
        throw new Error(
          "Showflow database transaction callbacks must be synchronous.",
        );
      }

      this.#database.exec("COMMIT");
      return result;
    } catch (error) {
      if (!this.#database.isTransaction) {
        throw error;
      }

      try {
        this.#database.exec("ROLLBACK");
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          "The Showflow database transaction and its rollback both failed.",
          { cause: rollbackError },
        );
      }

      throw error;
    }
  }

  close(): void {
    if (this.#database.isOpen) {
      this.#database.close();
    }
  }

  #assertOpen(): void {
    if (!this.#database.isOpen) {
      throw new Error("The Showflow database connection is closed.");
    }
  }
}

const validateDatabasePath = (databasePath: string): string => {
  if (!path.isAbsolute(databasePath)) {
    throw new Error("The Showflow database path must be absolute.");
  }

  return path.normalize(databasePath);
};

export const openShowflowDatabase = async (
  options: OpenShowflowDatabaseOptions,
): Promise<ShowflowDatabase> => {
  const databasePath = validateDatabasePath(options.databasePath);
  await fs.mkdir(path.dirname(databasePath), { recursive: true });

  const database = new DatabaseSync(databasePath, {
    allowBareNamedParameters: false,
    allowExtension: false,
    allowUnknownNamedParameters: false,
    defensive: true,
    enableDoubleQuotedStringLiterals: false,
    enableForeignKeyConstraints: true,
    readBigInts: false,
    returnArrays: false,
    timeout: 5_000,
  });
  const service = new NodeSqliteDatabaseService(databasePath, database);

  try {
    service.executeScript(DATABASE_CONFIGURATION_SQL);
    service.queryRequired(
      DATABASE_CONFIGURATION_QUERY,
      DatabaseConfigurationSchema,
    );
    return service;
  } catch (error) {
    service.close();
    throw error;
  }
};
