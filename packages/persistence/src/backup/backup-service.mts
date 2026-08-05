import fs from "node:fs/promises";
import path from "node:path";
import { backup, DatabaseSync } from "node:sqlite";

import { z } from "zod";

export type BackupErrorCode =
  | "BACKUP_CONFIGURATION_INVALID"
  | "BACKUP_CREATE_FAILED"
  | "BACKUP_RETENTION_FAILED";

interface BackupErrorOptions {
  readonly cause?: unknown;
  readonly code: BackupErrorCode;
  readonly message: string;
}

export class BackupError extends Error {
  override readonly name = "BackupError";
  readonly code: BackupErrorCode;

  constructor(options: BackupErrorOptions) {
    super(
      options.message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.code = options.code;
  }
}

export interface CreatePreMigrationBackupOptions {
  readonly backupsDirectory: string;
  readonly databasePath: string;
  readonly now?: () => string;
  readonly retentionCount: number;
}

export interface PreMigrationBackupResult {
  readonly backupPath: string;
  readonly pagesCopied: number;
  readonly removedBackupPaths: readonly string[];
}

const UtcTimestampSchema = z
  .string()
  .datetime({ offset: true })
  .refine((value) => value.endsWith("Z"), "Timestamp must use UTC.");
const RetentionCountSchema = z.number().int().positive();
const BACKUP_FILE_PATTERN = /^showflow-backup-(\d{8}T\d{9}Z)\.sqlite$/u;

const createConfigurationError = (
  message: string,
  cause?: unknown,
): BackupError =>
  new BackupError({
    ...(cause === undefined ? {} : { cause }),
    code: "BACKUP_CONFIGURATION_INVALID",
    message,
  });

const validateAbsolutePath = (value: string, label: string): string => {
  if (!path.isAbsolute(value)) {
    throw createConfigurationError(`${label} must be an absolute path.`);
  }

  return path.normalize(value);
};

const getBackupTimestamp = (now: () => string): string => {
  try {
    return UtcTimestampSchema.parse(now()).replaceAll(/[-:.]/gu, "");
  } catch (error) {
    throw createConfigurationError(
      "The backup timestamp must be an ISO 8601 UTC string.",
      error,
    );
  }
};

const getRetentionCount = (value: number): number => {
  try {
    return RetentionCountSchema.parse(value);
  } catch (error) {
    throw createConfigurationError(
      "The backup retention count must be a positive integer.",
      error,
    );
  }
};

const isMissingPathError = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

const assertBackupPathAvailable = async (backupPath: string): Promise<void> => {
  try {
    await fs.stat(backupPath);
  } catch (error) {
    if (isMissingPathError(error)) {
      return;
    }

    throw error;
  }

  throw new Error(`A backup already exists at ${backupPath}.`);
};

const copyDatabase = async (
  databasePath: string,
  backupPath: string,
): Promise<number> => {
  const sourceDatabase = new DatabaseSync(databasePath, {
    allowExtension: false,
    readOnly: true,
  });

  try {
    return await backup(sourceDatabase, backupPath);
  } finally {
    sourceDatabase.close();
  }
};

const enforceRetention = async (
  backupsDirectory: string,
  retentionCount: number,
): Promise<string[]> => {
  try {
    const entries = await fs.readdir(backupsDirectory, {
      encoding: "utf8",
      withFileTypes: true,
    });
    const backupPaths = entries
      .filter((entry) => entry.isFile() && BACKUP_FILE_PATTERN.test(entry.name))
      .map((entry) => path.join(backupsDirectory, entry.name))
      .sort((left, right) => right.localeCompare(left));
    const removedBackupPaths = backupPaths.slice(retentionCount);

    for (const backupPath of removedBackupPaths) {
      await fs.rm(backupPath);
    }

    return removedBackupPaths;
  } catch (error) {
    throw new BackupError({
      cause: error,
      code: "BACKUP_RETENTION_FAILED",
      message: "Showflow created a backup but could not enforce retention.",
    });
  }
};

export const createPreMigrationBackup = async (
  options: CreatePreMigrationBackupOptions,
): Promise<PreMigrationBackupResult> => {
  const databasePath = validateAbsolutePath(
    options.databasePath,
    "The Showflow database path",
  );
  const backupsDirectory = validateAbsolutePath(
    options.backupsDirectory,
    "The Showflow backups directory",
  );
  const retentionCount = getRetentionCount(options.retentionCount);
  const timestamp = getBackupTimestamp(
    options.now ?? (() => new Date().toISOString()),
  );
  const backupPath = path.join(
    backupsDirectory,
    `showflow-backup-${timestamp}.sqlite`,
  );
  let backupStarted = false;
  let pagesCopied: number;

  try {
    await fs.mkdir(backupsDirectory, { recursive: true });
    await assertBackupPathAvailable(backupPath);
    backupStarted = true;
    pagesCopied = await copyDatabase(databasePath, backupPath);
  } catch (error) {
    let cause = error;

    if (backupStarted) {
      try {
        await fs.rm(backupPath, { force: true });
      } catch (cleanupError) {
        cause = new AggregateError(
          [error, cleanupError],
          "The backup and its incomplete-file cleanup both failed.",
          { cause: cleanupError },
        );
      }
    }

    throw new BackupError({
      cause,
      code: "BACKUP_CREATE_FAILED",
      message: "Showflow could not create the required pre-migration backup.",
    });
  }

  const removedBackupPaths = await enforceRetention(
    backupsDirectory,
    retentionCount,
  );

  return { backupPath, pagesCopied, removedBackupPaths };
};
