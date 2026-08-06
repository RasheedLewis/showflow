import { z } from "zod";

import type { StudioRepository } from "@showflow/application";
import {
  parseEntityId,
  parseUtcTimestamp,
  type Studio,
  type StudioId,
} from "@showflow/domain";

import type { ShowflowDatabase } from "../database/database-service.mjs";
import { mapPersistenceError } from "../errors/persistence-error-mapper.mjs";

export class StoredStudioError extends Error {
  override readonly name = "StoredStudioError";
  readonly code = "STORED_STUDIO_INVALID" as const;

  constructor(cause: unknown) {
    super("Stored Studio data is invalid.", { cause });
  }
}

const StudioRowSchema = z
  .object({
    archivedAt: z.string().nullable(),
    createdAt: z.string(),
    id: z.string(),
    logoResourceId: z.string().nullable(),
    name: z
      .string()
      .max(200)
      .refine((value) => value.trim().length > 0),
    updatedAt: z.string(),
  })
  .strict();

const parseStudioRow = (value: unknown): Studio => {
  try {
    const row = StudioRowSchema.parse(value);
    const createdAt = parseUtcTimestamp(row.createdAt);
    const updatedAt = parseUtcTimestamp(row.updatedAt);

    if (updatedAt < createdAt) {
      throw new RangeError("A Studio cannot be updated before it was created.");
    }
    const archivedAt =
      row.archivedAt === null ? null : parseUtcTimestamp(row.archivedAt);
    if (archivedAt !== null && archivedAt < createdAt) {
      throw new RangeError(
        "A Studio cannot be archived before it was created.",
      );
    }

    return {
      id: parseEntityId<"studio">(row.id),
      name: row.name,
      ...(row.logoResourceId === null
        ? {}
        : { logoResourceId: parseEntityId<"resource">(row.logoResourceId) }),
      ...(archivedAt === null ? {} : { archivedAt }),
      createdAt,
      updatedAt,
    };
  } catch (error) {
    throw new StoredStudioError(error);
  }
};

const StudioRowParser = { parse: parseStudioRow };

const STUDIO_COLUMNS = `
  id,
  name,
  logo_resource_id AS logoResourceId,
  archived_at AS archivedAt,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const validateStudioForWrite = (studio: Studio): Studio =>
  parseStudioRow({
    archivedAt: studio.archivedAt ?? null,
    createdAt: studio.createdAt,
    id: studio.id,
    logoResourceId: studio.logoResourceId ?? null,
    name: studio.name,
    updatedAt: studio.updatedAt,
  });

export class SqliteStudioRepository implements StudioRepository {
  readonly #database: ShowflowDatabase;

  constructor(database: ShowflowDatabase) {
    this.#database = database;
  }

  async getById(id: StudioId): Promise<Studio | null> {
    try {
      return (
        this.#database.queryOne(
          `SELECT ${STUDIO_COLUMNS} FROM studios WHERE id = ?`,
          StudioRowParser,
          [id],
        ) ?? null
      );
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async list(): Promise<readonly Studio[]> {
    try {
      return this.#database.queryAll(
        `
          SELECT ${STUDIO_COLUMNS}
          FROM studios
          WHERE archived_at IS NULL
          ORDER BY created_at, id
        `,
        StudioRowParser,
      );
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async save(studio: Studio): Promise<void> {
    try {
      const validStudio = validateStudioForWrite(studio);
      this.#database.run(
        `
          INSERT INTO studios (
            id,
            name,
            logo_resource_id,
            archived_at,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            logo_resource_id = excluded.logo_resource_id,
            archived_at = excluded.archived_at,
            updated_at = excluded.updated_at
        `,
        [
          validStudio.id,
          validStudio.name,
          validStudio.logoResourceId ?? null,
          validStudio.archivedAt ?? null,
          validStudio.createdAt,
          validStudio.updatedAt,
        ],
      );
    } catch (error) {
      throw mapPersistenceError(error, "write");
    }
  }
}
