import fs from "node:fs/promises";
import path from "node:path";
import { backup, DatabaseSync } from "node:sqlite";

import { z } from "zod";

import {
  NodeSqliteSpikeReportSchema,
  type NodeSqliteSpikeReport,
} from "./node-sqlite-spike-report.mjs";

const SpikeJsonPayloadSchema = z
  .object({
    enabled: z.boolean(),
    order: z.number().int().positive(),
    segment: z.string().min(1),
  })
  .strict();

const TextRowSchema = z.object({ value: z.string() }).strict();
const JsonRowSchema = z.object({ value: z.string() }).strict();
const CountRowSchema = z
  .object({ count: z.number().int().nonnegative() })
  .strict();
const ForeignKeysRowSchema = z.object({ foreign_keys: z.literal(1) }).strict();
const JournalModeRowSchema = z
  .object({ journal_mode: z.literal("wal") })
  .strict();
const SqliteVersionRowSchema = z
  .object({ sqlite_version: z.string().min(1) })
  .strict();

export interface RunNodeSqliteSpikeOptions {
  readonly workingDirectory: string;
}

const getRequiredRow = (
  database: DatabaseSync,
  sql: string,
): Record<string, unknown> => {
  const row = database.prepare(sql).get();

  if (row === undefined) {
    throw new Error(`The SQLite spike query returned no row: ${sql}`);
  }

  return row;
};

const verifyBackup = (backupPath: string): void => {
  const database = new DatabaseSync(backupPath, { readOnly: true });

  try {
    const text = TextRowSchema.parse(
      getRequiredRow(
        database,
        "SELECT value FROM text_records WHERE key = 'utf8'",
      ),
    );
    const json = JsonRowSchema.parse(
      getRequiredRow(
        database,
        "SELECT value FROM json_records WHERE key = 'segment'",
      ),
    );
    const committed = CountRowSchema.parse(
      getRequiredRow(
        database,
        "SELECT COUNT(*) AS count FROM transaction_events WHERE label = 'committed'",
      ),
    );
    const rolledBack = CountRowSchema.parse(
      getRequiredRow(
        database,
        "SELECT COUNT(*) AS count FROM transaction_events WHERE label = 'rolled-back'",
      ),
    );

    if (
      text.value !== "Opening — Beyoncé 🎙️" ||
      SpikeJsonPayloadSchema.parse(JSON.parse(json.value)).segment !==
        "Opening" ||
      committed.count !== 1 ||
      rolledBack.count !== 0
    ) {
      throw new Error("The SQLite backup did not preserve the expected state.");
    }
  } finally {
    database.close();
  }
};

export const runNodeSqliteSpike = async (
  options: RunNodeSqliteSpikeOptions,
): Promise<NodeSqliteSpikeReport> => {
  const startedAt = performance.now();
  const databasePath = path.join(
    options.workingDirectory,
    "node-sqlite-spike.sqlite",
  );
  const backupPath = path.join(
    options.workingDirectory,
    "node-sqlite-spike-backup.sqlite",
  );

  await fs.mkdir(options.workingDirectory, { recursive: true });

  const database = new DatabaseSync(databasePath, {
    allowExtension: false,
    enableDoubleQuotedStringLiterals: false,
    enableForeignKeyConstraints: true,
    timeout: 5_000,
  });

  let backupPages: number;
  let sqliteVersion: string;
  let journalMode: "wal";

  try {
    database.exec("PRAGMA foreign_keys = ON");
    database.exec("PRAGMA journal_mode = WAL");
    database.exec("PRAGMA synchronous = NORMAL");
    database.exec("PRAGMA busy_timeout = 5000");
    database.exec(`
      CREATE TABLE text_records (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      ) STRICT;
      CREATE TABLE json_records (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      ) STRICT;
      CREATE TABLE parent_records (
        id INTEGER PRIMARY KEY
      ) STRICT;
      CREATE TABLE child_records (
        id INTEGER PRIMARY KEY,
        parent_id INTEGER NOT NULL REFERENCES parent_records(id)
      ) STRICT;
      CREATE TABLE transaction_events (
        label TEXT PRIMARY KEY
      ) STRICT;
    `);

    database
      .prepare("INSERT INTO text_records (key, value) VALUES (?, ?)")
      .run("utf8", "Opening — Beyoncé 🎙️");

    const jsonPayload = SpikeJsonPayloadSchema.parse({
      enabled: true,
      order: 1,
      segment: "Opening",
    });
    database
      .prepare("INSERT INTO json_records (key, value) VALUES (?, ?)")
      .run("segment", JSON.stringify(jsonPayload));

    const text = TextRowSchema.parse(
      getRequiredRow(
        database,
        "SELECT value FROM text_records WHERE key = 'utf8'",
      ),
    );
    const storedJson = JsonRowSchema.parse(
      getRequiredRow(
        database,
        "SELECT value FROM json_records WHERE key = 'segment'",
      ),
    );
    const parsedJson = SpikeJsonPayloadSchema.parse(
      JSON.parse(storedJson.value),
    );

    database.exec("BEGIN IMMEDIATE");
    database
      .prepare("INSERT INTO transaction_events (label) VALUES (?)")
      .run("committed");
    database.exec("COMMIT");

    database.exec("BEGIN IMMEDIATE");
    database
      .prepare("INSERT INTO transaction_events (label) VALUES (?)")
      .run("rolled-back");
    database.exec("ROLLBACK");

    const committed = CountRowSchema.parse(
      getRequiredRow(
        database,
        "SELECT COUNT(*) AS count FROM transaction_events WHERE label = 'committed'",
      ),
    );
    const rolledBack = CountRowSchema.parse(
      getRequiredRow(
        database,
        "SELECT COUNT(*) AS count FROM transaction_events WHERE label = 'rolled-back'",
      ),
    );

    database.prepare("INSERT INTO parent_records (id) VALUES (?)").run(1);
    let foreignKeyRejected = false;

    try {
      database
        .prepare("INSERT INTO child_records (id, parent_id) VALUES (?, ?)")
        .run(1, 999);
    } catch {
      foreignKeyRejected = true;
    }

    const foreignKeys = ForeignKeysRowSchema.parse(
      getRequiredRow(database, "PRAGMA foreign_keys"),
    );
    const journal = JournalModeRowSchema.parse(
      getRequiredRow(database, "PRAGMA journal_mode"),
    );
    const version = SqliteVersionRowSchema.parse(
      getRequiredRow(database, "SELECT sqlite_version() AS sqlite_version"),
    );

    if (
      text.value !== "Opening — Beyoncé 🎙️" ||
      parsedJson.segment !== "Opening" ||
      committed.count !== 1 ||
      rolledBack.count !== 0 ||
      !foreignKeyRejected ||
      foreignKeys.foreign_keys !== 1
    ) {
      throw new Error("The node:sqlite spike did not satisfy every proof.");
    }

    journalMode = journal.journal_mode;
    sqliteVersion = version.sqlite_version;
    backupPages = await backup(database, backupPath);
  } finally {
    database.close();
  }

  verifyBackup(backupPath);

  return NodeSqliteSpikeReportSchema.parse({
    architecture: process.arch,
    backupPages,
    checks: {
      backup: true,
      fileBackedDatabase: path.isAbsolute(databasePath),
      foreignKeys: true,
      jsonRoundTrip: true,
      textRoundTrip: true,
      transactionCommit: true,
      transactionRollback: true,
      walMode: journalMode === "wal",
    },
    databasePath,
    durationMs: performance.now() - startedAt,
    electronVersion: process.versions["electron"] ?? null,
    journalMode,
    nodeVersion: process.versions.node,
    ok: true,
    platform: process.platform,
    sqliteVersion,
  });
};
