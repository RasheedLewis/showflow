import { createHash } from "node:crypto";
import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import { MigrationError, type LoadedMigration } from "./migration-model.mjs";

const MIGRATION_FILE_PATTERN = /^(\d{3})_([a-z0-9]+(?:_[a-z0-9]+)*)\.sql$/u;

const createLoadError = (message: string, cause?: unknown): MigrationError =>
  new MigrationError({
    ...(cause === undefined ? {} : { cause }),
    code: "MIGRATION_LOAD_FAILED",
    message,
  });

const parseMigrationFileName = (
  fileName: string,
): { name: string; version: number } => {
  const match = MIGRATION_FILE_PATTERN.exec(fileName);
  const versionText = match?.[1];
  const name = match?.[2];

  if (versionText === undefined || name === undefined) {
    throw createLoadError(
      `Migration file "${fileName}" must use NNN_snake_case.sql naming.`,
    );
  }

  const version = Number(versionText);
  if (!Number.isSafeInteger(version) || version < 1) {
    throw createLoadError(
      `Migration file "${fileName}" must have a positive version.`,
    );
  }

  return { name, version };
};

const loadMigrationFile = async (
  migrationsDirectory: string,
  fileName: string,
): Promise<LoadedMigration> => {
  const { name, version } = parseMigrationFileName(fileName);
  let sql: string;

  try {
    sql = await fs.readFile(path.join(migrationsDirectory, fileName), "utf8");
  } catch (error) {
    throw createLoadError(
      `Migration file "${fileName}" could not be read.`,
      error,
    );
  }

  if (sql.trim().length === 0) {
    throw createLoadError(`Migration file "${fileName}" must not be empty.`);
  }

  return {
    checksum: createHash("sha256").update(sql, "utf8").digest("hex"),
    fileName,
    name,
    sql,
    version,
  };
};

export const loadMigrations = async (
  migrationsDirectory: string,
): Promise<LoadedMigration[]> => {
  if (!path.isAbsolute(migrationsDirectory)) {
    throw createLoadError("The migrations directory path must be absolute.");
  }

  let entries: Dirent<string>[];
  try {
    entries = await fs.readdir(migrationsDirectory, {
      encoding: "utf8",
      withFileTypes: true,
    });
  } catch (error) {
    throw createLoadError("The migrations directory could not be read.", error);
  }

  const sqlEntries = entries
    .filter((entry) => entry.name.endsWith(".sql"))
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of sqlEntries) {
    if (!entry.isFile()) {
      throw createLoadError(
        `Migration entry "${entry.name}" must be a regular file.`,
      );
    }
  }

  const migrations = await Promise.all(
    sqlEntries.map((entry) =>
      loadMigrationFile(migrationsDirectory, entry.name),
    ),
  );
  migrations.sort((left, right) => left.version - right.version);

  for (const [index, migration] of migrations.entries()) {
    const expectedVersion = index + 1;
    if (migration.version !== expectedVersion) {
      throw createLoadError(
        `Migration versions must be contiguous from 001; expected ${String(expectedVersion).padStart(3, "0")} but found ${migration.fileName}.`,
      );
    }
  }

  return migrations;
};
