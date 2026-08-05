import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";
import { NodeSqliteSpikeReportSchema } from "@showflow/persistence/spikes/node-sqlite-report";

import { getPackagedExecutablePath } from "../support/packaged-executable.js";

const NODE_SQLITE_SPIKE_REPORT_ENV =
  "SHOWFLOW_NODE_SQLITE_SPIKE_REPORT_PATH" as const;

const waitForExit = async (
  executablePath: string,
  reportPath: string,
): Promise<{ code: number | null; stderr: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn(executablePath, [], {
      env: {
        ...process.env,
        [NODE_SQLITE_SPIKE_REPORT_ENV]: reportPath,
      },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve({ code, stderr }));
  });

test("node:sqlite passes the packaged-app persistence proof", async () => {
  const workingDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "showflow-packaged-node-sqlite-spike-"),
  );
  const reportPath = path.join(workingDirectory, "report.json");

  try {
    const result = await waitForExit(getPackagedExecutablePath(), reportPath);
    const rawReport = await fs.readFile(reportPath, "utf8");
    const report = NodeSqliteSpikeReportSchema.parse(JSON.parse(rawReport));

    expect(result, result.stderr).toMatchObject({ code: 0 });
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
