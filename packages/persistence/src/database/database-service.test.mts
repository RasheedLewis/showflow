import { z } from "zod";
import { afterEach, describe, expect, test } from "vitest";

import { openShowflowDatabase } from "./database-service.mjs";
import {
  createTestDatabase,
  type TestDatabase,
} from "../testing/create-test-database.mjs";

const TextRowSchema = z.object({ value: z.string() }).strict();
const CountRowSchema = z.object({ count: z.number().int() }).strict();
const ConfigurationRowSchema = z
  .object({
    busyTimeout: z.literal(5_000),
    foreignKeys: z.literal(1),
    journalMode: z.literal("wal"),
    synchronous: z.literal(1),
  })
  .strict();

const testDatabases: TestDatabase[] = [];

const setupDatabase = async (): Promise<TestDatabase> => {
  const testDatabase = await createTestDatabase();
  testDatabases.push(testDatabase);
  return testDatabase;
};

afterEach(async () => {
  await Promise.all(
    testDatabases.splice(0).map((testDatabase) => testDatabase.cleanup()),
  );
});

describe("Showflow database service", () => {
  test("initializes a configured file-backed database that can be reopened", async () => {
    const testDatabase = await setupDatabase();

    const configuration = testDatabase.database.queryRequired(
      `
        SELECT
          (SELECT foreign_keys FROM pragma_foreign_keys) AS foreignKeys,
          (SELECT journal_mode FROM pragma_journal_mode) AS journalMode,
          (SELECT synchronous FROM pragma_synchronous) AS synchronous,
          (SELECT timeout FROM pragma_busy_timeout) AS busyTimeout
      `,
      ConfigurationRowSchema,
    );
    expect(configuration).toEqual({
      busyTimeout: 5_000,
      foreignKeys: 1,
      journalMode: "wal",
      synchronous: 1,
    });

    testDatabase.database.executeScript(`
      CREATE TABLE persisted_values (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      ) STRICT;
    `);
    testDatabase.database.run(
      "INSERT INTO persisted_values (key, value) VALUES (?, ?)",
      ["greeting", "Opening — Beyoncé 🎙️"],
    );
    testDatabase.database.close();

    const reopened = await openShowflowDatabase({
      databasePath: testDatabase.databasePath,
    });
    try {
      expect(
        reopened.queryRequired(
          "SELECT value FROM persisted_values WHERE key = ?",
          TextRowSchema,
          ["greeting"],
        ),
      ).toEqual({ value: "Opening — Beyoncé 🎙️" });
    } finally {
      reopened.close();
    }
  });

  test("provides typed prepared-statement helpers", async () => {
    const { database } = await setupDatabase();
    database.executeScript(`
      CREATE TABLE values_list (
        position INTEGER PRIMARY KEY,
        value TEXT NOT NULL
      ) STRICT;
    `);

    const firstInsert = database.run(
      "INSERT INTO values_list (position, value) VALUES (?, ?)",
      [1, "Prepare"],
    );
    database.run("INSERT INTO values_list (position, value) VALUES (?, ?)", [
      2,
      "Active",
    ]);

    expect(firstInsert).toEqual({ changes: 1, lastInsertRowId: 1 });
    expect(
      database.queryAll(
        "SELECT value FROM values_list ORDER BY position",
        TextRowSchema,
      ),
    ).toEqual([{ value: "Prepare" }, { value: "Active" }]);
    expect(
      database.queryOne(
        "SELECT value FROM values_list WHERE position = ?",
        TextRowSchema,
        [999],
      ),
    ).toBeUndefined();
    expect(() =>
      database.queryRequired(
        "SELECT value FROM values_list WHERE position = ?",
        z.object({ value: z.number() }).strict(),
        [1],
      ),
    ).toThrow();
  });

  test("commits every write in a successful transaction", async () => {
    const { database } = await setupDatabase();
    database.executeScript(
      "CREATE TABLE transaction_events (label TEXT PRIMARY KEY) STRICT;",
    );

    const returnedValue = database.transaction((transaction) => {
      transaction.run("INSERT INTO transaction_events (label) VALUES (?)", [
        "prepare",
      ]);
      transaction.run("INSERT INTO transaction_events (label) VALUES (?)", [
        "active",
      ]);
      return "committed";
    });

    expect(returnedValue).toBe("committed");
    expect(
      database.queryRequired(
        "SELECT COUNT(*) AS count FROM transaction_events",
        CountRowSchema,
      ),
    ).toEqual({ count: 2 });
  });

  test("rolls back every write when a transaction callback throws", async () => {
    const { database } = await setupDatabase();
    database.executeScript(
      "CREATE TABLE transaction_events (label TEXT PRIMARY KEY) STRICT;",
    );

    expect(() =>
      database.transaction((transaction) => {
        transaction.run("INSERT INTO transaction_events (label) VALUES (?)", [
          "prepare",
        ]);
        throw new Error("stop the transaction");
      }),
    ).toThrow("stop the transaction");
    expect(
      database.queryRequired(
        "SELECT COUNT(*) AS count FROM transaction_events",
        CountRowSchema,
      ),
    ).toEqual({ count: 0 });
  });

  test("enforces foreign keys", async () => {
    const { database } = await setupDatabase();
    database.executeScript(`
      CREATE TABLE parent_records (id TEXT PRIMARY KEY) STRICT;
      CREATE TABLE child_records (
        id TEXT PRIMARY KEY,
        parent_id TEXT NOT NULL REFERENCES parent_records(id)
      ) STRICT;
    `);

    expect(() =>
      database.run("INSERT INTO child_records (id, parent_id) VALUES (?, ?)", [
        "child-id",
        "missing-parent-id",
      ]),
    ).toThrow();
  });

  test("rejects asynchronous and nested transaction callbacks without partial writes", async () => {
    const { database } = await setupDatabase();
    database.executeScript(
      "CREATE TABLE transaction_events (label TEXT PRIMARY KEY) STRICT;",
    );

    expect(() =>
      database.transaction(async (transaction) => {
        transaction.run("INSERT INTO transaction_events (label) VALUES (?)", [
          "async",
        ]);
      }),
    ).toThrow("synchronous");
    expect(() =>
      database.transaction(() => database.transaction(() => undefined)),
    ).toThrow("already active");
    expect(
      database.queryRequired(
        "SELECT COUNT(*) AS count FROM transaction_events",
        CountRowSchema,
      ),
    ).toEqual({ count: 0 });
  });

  test("closes idempotently and rejects further operations", async () => {
    const { database } = await setupDatabase();

    expect(database.isOpen).toBe(true);
    database.close();
    database.close();

    expect(database.isOpen).toBe(false);
    expect(() => database.executeScript("SELECT 1")).toThrow(
      "connection is closed",
    );
    expect(() => database.transaction(() => undefined)).toThrow(
      "connection is closed",
    );
  });

  test("rejects relative database paths", async () => {
    await expect(
      openShowflowDatabase({ databasePath: "showflow.sqlite" }),
    ).rejects.toThrow("must be absolute");
  });
});
