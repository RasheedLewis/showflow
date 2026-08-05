import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { NodeSqliteSpikeReportSchema } from "./node-sqlite-spike-report.mjs";
import { runNodeSqliteSpike } from "./node-sqlite-spike.mjs";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fs.rm(directory, {
        force: true,
        recursive: true,
      }),
    ),
  );
});

describe("node:sqlite persistence spike", () => {
  test("proves the required database behaviors", async () => {
    const workingDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "showflow-node-sqlite-spike-"),
    );
    temporaryDirectories.push(workingDirectory);

    const report = await runNodeSqliteSpike({ workingDirectory });

    expect(NodeSqliteSpikeReportSchema.parse(report)).toEqual(report);
    expect(report.checks).toEqual({
      backup: true,
      fileBackedDatabase: true,
      foreignKeys: true,
      jsonRoundTrip: true,
      textRoundTrip: true,
      transactionCommit: true,
      transactionRollback: true,
      walMode: true,
    });
    const databaseStats = await fs.stat(report.databasePath);
    expect(databaseStats.isFile()).toBe(true);
  });
});
