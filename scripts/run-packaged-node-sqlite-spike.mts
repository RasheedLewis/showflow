import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  NodeSqliteSpikeReportSchema,
  type NodeSqliteSpikeReport,
} from "@showflow/persistence/spikes/node-sqlite-report";

import { getPackagedExecutablePath } from "./support/packaged-executable.mts";

const NODE_SQLITE_SPIKE_REPORT_ENV =
  "SHOWFLOW_NODE_SQLITE_SPIKE_REPORT_PATH" as const;
const SPIKE_EVIDENCE_DIRECTORY_ENV =
  "SHOWFLOW_SPIKE_EVIDENCE_DIRECTORY" as const;
const SPIKE_DISABLE_CHROMIUM_SANDBOX_ENV =
  "SHOWFLOW_SPIKE_DISABLE_CHROMIUM_SANDBOX" as const;
const SPIKE_TIMEOUT_MS = 30_000;

export interface PackagedNodeSqliteSpikeEvidence {
  readonly evidenceDirectory: string;
  readonly executableArguments: readonly string[];
  readonly report: NodeSqliteSpikeReport;
  readonly stderr: string;
}

const waitForExit = async (
  executablePath: string,
  executableArguments: readonly string[],
  reportPath: string,
): Promise<{ code: number | null; stderr: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn(executablePath, executableArguments, {
      env: {
        ...process.env,
        [NODE_SQLITE_SPIKE_REPORT_ENV]: reportPath,
      },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(
        new Error(
          `The packaged node:sqlite spike exceeded ${SPIKE_TIMEOUT_MS} ms.`,
        ),
      );
    }, SPIKE_TIMEOUT_MS);

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      resolve({ code, stderr });
    });
  });

export const runPackagedNodeSqliteSpike = async (
  evidenceRootDirectory: string,
): Promise<PackagedNodeSqliteSpikeEvidence> => {
  await fs.mkdir(evidenceRootDirectory, { recursive: true });
  const evidenceDirectory = await fs.mkdtemp(
    path.join(evidenceRootDirectory, `${process.platform}-${process.arch}-`),
  );
  const reportPath = path.join(evidenceDirectory, "report.json");
  const launcherPath = path.join(evidenceDirectory, "launcher.json");
  const stderrPath = path.join(evidenceDirectory, "stderr.log");
  const executableArguments =
    process.env[SPIKE_DISABLE_CHROMIUM_SANDBOX_ENV] === "1"
      ? ["--no-sandbox"]
      : [];
  const result = await waitForExit(
    getPackagedExecutablePath(),
    executableArguments,
    reportPath,
  );
  const stabilityWarnings = result.stderr
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0);

  await fs.writeFile(stderrPath, result.stderr, "utf8");
  await fs.writeFile(
    launcherPath,
    `${JSON.stringify({ executableArguments, stabilityWarnings }, null, 2)}\n`,
    "utf8",
  );

  if (result.code !== 0) {
    throw new Error(
      `The packaged node:sqlite spike exited with code ${String(result.code)}. ${result.stderr}`,
    );
  }

  const rawReport = await fs.readFile(reportPath, "utf8");
  const report = NodeSqliteSpikeReportSchema.parse(JSON.parse(rawReport));

  if (
    report.platform !== process.platform ||
    report.architecture !== process.arch
  ) {
    throw new Error(
      `The spike reported ${report.platform}/${report.architecture}, expected ${process.platform}/${process.arch}.`,
    );
  }

  return {
    evidenceDirectory,
    executableArguments,
    report,
    stderr: result.stderr,
  };
};

const runCommand = async (): Promise<void> => {
  const configuredEvidenceDirectory = process.env[SPIKE_EVIDENCE_DIRECTORY_ENV];
  const temporaryEvidenceDirectory =
    configuredEvidenceDirectory === undefined
      ? await fs.mkdtemp(path.join(os.tmpdir(), "showflow-spike-evidence-"))
      : undefined;
  const evidenceRootDirectory = path.resolve(
    configuredEvidenceDirectory ?? temporaryEvidenceDirectory ?? os.tmpdir(),
  );

  try {
    const evidence = await runPackagedNodeSqliteSpike(evidenceRootDirectory);
    process.stdout.write(
      `${JSON.stringify(
        {
          evidenceDirectory: evidence.evidenceDirectory,
          executableArguments: evidence.executableArguments,
          report: evidence.report,
          stabilityWarnings: evidence.stderr
            .split(/\r?\n/u)
            .filter((line) => line.trim().length > 0),
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    if (temporaryEvidenceDirectory !== undefined) {
      await fs.rm(temporaryEvidenceDirectory, {
        force: true,
        recursive: true,
      });
    }
  }
};

const entryPath = process.argv[1];

if (
  entryPath !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(entryPath)).href
) {
  await runCommand();
}
