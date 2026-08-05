import { z } from "zod";

export const NodeSqliteSpikeReportSchema = z
  .object({
    architecture: z.string().min(1),
    backupPages: z.number().int().positive(),
    checks: z
      .object({
        backup: z.literal(true),
        fileBackedDatabase: z.literal(true),
        foreignKeys: z.literal(true),
        jsonRoundTrip: z.literal(true),
        textRoundTrip: z.literal(true),
        transactionCommit: z.literal(true),
        transactionRollback: z.literal(true),
        walMode: z.literal(true),
      })
      .strict(),
    databasePath: z.string().min(1),
    durationMs: z.number().nonnegative(),
    electronVersion: z.string().min(1).nullable(),
    journalMode: z.literal("wal"),
    nodeVersion: z.string().min(1),
    ok: z.literal(true),
    platform: z.string().min(1),
    sqliteVersion: z.string().min(1),
  })
  .strict();

export type NodeSqliteSpikeReport = z.infer<typeof NodeSqliteSpikeReportSchema>;
