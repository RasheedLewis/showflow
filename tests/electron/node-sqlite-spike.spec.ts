import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { runPackagedNodeSqliteSpike } from "../../scripts/run-packaged-node-sqlite-spike.mjs";

test("node:sqlite passes the packaged-app persistence proof", async () => {
  const workingDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "showflow-packaged-node-sqlite-spike-"),
  );
  try {
    const evidence = await runPackagedNodeSqliteSpike(workingDirectory);
    const report = evidence.report;

    expect(report.electronVersion).toBe("43.3.0");
    expect(report.platform).toBe(process.platform);
    expect(report.architecture).toBe(process.arch);
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
  } finally {
    await fs.rm(workingDirectory, { force: true, recursive: true });
  }
});
