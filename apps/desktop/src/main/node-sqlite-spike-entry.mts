import fs from "node:fs/promises";
import path from "node:path";

export const NODE_SQLITE_SPIKE_REPORT_ENV =
  "SHOWFLOW_NODE_SQLITE_SPIKE_REPORT_PATH" as const;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown node:sqlite spike failure.";

export const runRequestedNodeSqliteSpike = async (): Promise<boolean> => {
  const reportPath = process.env[NODE_SQLITE_SPIKE_REPORT_ENV];

  if (reportPath === undefined) {
    return false;
  }

  try {
    const { runNodeSqliteSpike } =
      await import("@showflow/persistence/spikes/node-sqlite");
    const report = await runNodeSqliteSpike({
      workingDirectory: path.dirname(reportPath),
    });
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    process.exitCode = 0;
  } catch (error: unknown) {
    const failureReport = {
      error: getErrorMessage(error),
      ok: false,
    };

    try {
      await fs.writeFile(
        reportPath,
        `${JSON.stringify(failureReport, null, 2)}\n`,
        {
          encoding: "utf8",
          flag: "wx",
        },
      );
    } catch (writeError: unknown) {
      console.error(
        "Showflow could not write the node:sqlite spike failure report.",
        writeError,
      );
    }

    process.exitCode = 1;
  }

  return true;
};
