import { z } from "zod";

import {
  parseEntityId,
  parseUtcTimestamp,
  type JsonObject,
  type Show,
  type ShowBlueprint,
} from "@showflow/domain";

import type { DatabaseExecutor } from "../database/database-service.mjs";

export class StoredShowError extends Error {
  override readonly name = "StoredShowError";
  readonly code = "STORED_SHOW_INVALID" as const;

  constructor(cause: unknown) {
    super("Stored Show data is invalid.", { cause });
  }
}

const ShowRowSchema = z
  .object({
    archivedAt: z.string().nullable(),
    createdAt: z.string(),
    description: z.string().nullable(),
    id: z.string(),
    name: z
      .string()
      .max(200)
      .refine((value) => value.trim().length > 0),
    studioId: z.string(),
    styleDefaultsJson: z.string(),
    thumbnailResourceId: z.string().nullable(),
    updatedAt: z.string(),
  })
  .strict();

const JsonObjectSchema = z.record(z.string(), z.unknown());

const parseShowRow = (value: unknown): Show => {
  try {
    const row = ShowRowSchema.parse(value);
    const createdAt = parseUtcTimestamp(row.createdAt);
    const updatedAt = parseUtcTimestamp(row.updatedAt);
    if (updatedAt < createdAt) throw new RangeError("Invalid Show timestamps.");
    const archivedAt =
      row.archivedAt === null ? null : parseUtcTimestamp(row.archivedAt);
    if (archivedAt !== null && archivedAt < createdAt) {
      throw new RangeError("Invalid Show archive timestamp.");
    }
    const styleDefaults = JsonObjectSchema.parse(
      JSON.parse(row.styleDefaultsJson) as unknown,
    ) as JsonObject;

    return {
      id: parseEntityId<"show">(row.id),
      studioId: parseEntityId<"studio">(row.studioId),
      name: row.name,
      ...(row.description === null ? {} : { description: row.description }),
      ...(row.thumbnailResourceId === null
        ? {}
        : {
            thumbnailResourceId: parseEntityId<"resource">(
              row.thumbnailResourceId,
            ),
          }),
      styleDefaults,
      ...(archivedAt === null ? {} : { archivedAt }),
      createdAt,
      updatedAt,
    };
  } catch (error) {
    throw new StoredShowError(error);
  }
};

export const ShowRowParser = { parse: parseShowRow };
export const SHOW_COLUMNS = `
  id,
  studio_id AS studioId,
  name,
  description,
  thumbnail_resource_id AS thumbnailResourceId,
  style_defaults_json AS styleDefaultsJson,
  archived_at AS archivedAt,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

export const writeShow = (
  database: DatabaseExecutor,
  show: Show,
  insertOnly = false,
): void => {
  const validShow = parseShowRow({
    archivedAt: show.archivedAt ?? null,
    createdAt: show.createdAt,
    description: show.description ?? null,
    id: show.id,
    name: show.name,
    studioId: show.studioId,
    styleDefaultsJson: JSON.stringify(show.styleDefaults),
    thumbnailResourceId: show.thumbnailResourceId ?? null,
    updatedAt: show.updatedAt,
  });
  database.run(
    `
      INSERT INTO shows (
        id, studio_id, name, description, thumbnail_resource_id,
        style_defaults_json, archived_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ${
        insertOnly
          ? ""
          : `ON CONFLICT(id) DO UPDATE SET
              studio_id = excluded.studio_id,
              name = excluded.name,
              description = excluded.description,
              thumbnail_resource_id = excluded.thumbnail_resource_id,
              style_defaults_json = excluded.style_defaults_json,
              archived_at = excluded.archived_at,
              updated_at = excluded.updated_at`
      }
    `,
    [
      validShow.id,
      validShow.studioId,
      validShow.name,
      validShow.description ?? null,
      validShow.thumbnailResourceId ?? null,
      JSON.stringify(validShow.styleDefaults),
      validShow.archivedAt ?? null,
      validShow.createdAt,
      validShow.updatedAt,
    ],
  );
};

const BlueprintRowSchema = z
  .object({
    createdAt: z.string(),
    id: z.string(),
    showId: z.string(),
    updatedAt: z.string(),
  })
  .strict();

const parseBlueprintRow = (value: unknown): ShowBlueprint => {
  try {
    const row = BlueprintRowSchema.parse(value);
    const createdAt = parseUtcTimestamp(row.createdAt);
    const updatedAt = parseUtcTimestamp(row.updatedAt);
    if (updatedAt < createdAt) {
      throw new RangeError("Invalid Show Blueprint timestamps.");
    }
    return {
      id: parseEntityId<"showBlueprint">(row.id),
      showId: parseEntityId<"show">(row.showId),
      placements: [],
      createdAt,
      updatedAt,
    };
  } catch (error) {
    throw new StoredShowError(error);
  }
};

export const BlueprintRowParser = { parse: parseBlueprintRow };
export const BLUEPRINT_COLUMNS = `
  id,
  show_id AS showId,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

export const writeEmptyBlueprint = (
  database: DatabaseExecutor,
  blueprint: ShowBlueprint,
  insertOnly = false,
): void => {
  if (blueprint.placements.length !== 0) {
    throw new StoredShowError(
      new RangeError("Sprint 4 persistence accepts only an empty Blueprint."),
    );
  }
  const validBlueprint = parseBlueprintRow({
    createdAt: blueprint.createdAt,
    id: blueprint.id,
    showId: blueprint.showId,
    updatedAt: blueprint.updatedAt,
  });
  database.run(
    `
      INSERT INTO show_blueprints (id, show_id, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ${
        insertOnly
          ? ""
          : `ON CONFLICT(id) DO UPDATE SET
              updated_at = excluded.updated_at`
      }
    `,
    [
      validBlueprint.id,
      validBlueprint.showId,
      validBlueprint.createdAt,
      validBlueprint.updatedAt,
    ],
  );
};
