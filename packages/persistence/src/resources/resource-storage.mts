import { z } from "zod";

import {
  parseEntityId,
  parseUtcTimestamp,
  type Resource,
} from "@showflow/domain";

import type { DatabaseExecutor } from "../database/database-service.mjs";

const ResourceRowSchema = z
  .object({
    availability: z.enum([
      "available",
      "missing",
      "unavailable",
      "unsupported",
    ]),
    category: z.enum([
      "image",
      "video",
      "audio",
      "font",
      "cameraInput",
      "microphoneInput",
      "screenCapture",
      "textDocument",
      "structuredData",
      "animatedGraphic",
    ]),
    contentHash: z.string().nullable(),
    createdAt: z.string(),
    displayName: z.string().min(1).max(255),
    durationMs: z.number().int().nonnegative().nullable(),
    episodeId: z.string().nullable(),
    fileSizeBytes: z.number().int().nonnegative().nullable(),
    height: z.number().int().positive().nullable(),
    id: z.string(),
    localPath: z.string().nullable(),
    mimeType: z.string().min(1),
    originalFilename: z.string().nullable(),
    ownerScope: z.enum(["studio", "show", "episode"]),
    showId: z.string().nullable(),
    sourceModifiedAt: z.string().nullable(),
    studioId: z.string().nullable(),
    thumbnailCacheKey: z.string().nullable(),
    updatedAt: z.string(),
    width: z.number().int().positive().nullable(),
  })
  .strict();

export class StoredResourceError extends Error {
  override readonly name = "StoredResourceError";
  readonly code = "STORED_RESOURCE_INVALID" as const;

  constructor(cause: unknown) {
    super("Stored Resource data is invalid.", { cause });
  }
}

const parseResourceRow = (value: unknown): Resource => {
  try {
    const row = ResourceRowSchema.parse(value);
    const createdAt = parseUtcTimestamp(row.createdAt);
    const updatedAt = parseUtcTimestamp(row.updatedAt);
    if (updatedAt < createdAt)
      throw new RangeError("Invalid Resource timestamps.");
    const owner =
      row.ownerScope === "studio" && row.studioId !== null
        ? {
            scope: "studio" as const,
            studioId: parseEntityId<"studio">(row.studioId),
          }
        : row.ownerScope === "show" && row.showId !== null
          ? {
              scope: "show" as const,
              showId: parseEntityId<"show">(row.showId),
            }
          : row.ownerScope === "episode" && row.episodeId !== null
            ? {
                scope: "episode" as const,
                episodeId: parseEntityId<"episode">(row.episodeId),
              }
            : undefined;
    if (owner === undefined || (row.width === null) !== (row.height === null)) {
      throw new RangeError("Invalid Resource ownership or dimensions.");
    }

    return {
      id: parseEntityId<"resource">(row.id),
      owner,
      displayName: row.displayName,
      category: row.category,
      mimeType: row.mimeType,
      availability: row.availability,
      ...(row.originalFilename === null
        ? {}
        : { originalFilename: row.originalFilename }),
      ...(row.localPath === null ? {} : { localPath: row.localPath }),
      ...(row.fileSizeBytes === null
        ? {}
        : { fileSizeBytes: row.fileSizeBytes }),
      ...(row.sourceModifiedAt === null
        ? {}
        : { sourceModifiedAt: parseUtcTimestamp(row.sourceModifiedAt) }),
      ...(row.contentHash === null ? {} : { contentHash: row.contentHash }),
      ...(row.width === null || row.height === null
        ? {}
        : { dimensions: { width: row.width, height: row.height } }),
      ...(row.durationMs === null ? {} : { durationMs: row.durationMs }),
      ...(row.thumbnailCacheKey === null
        ? {}
        : { thumbnailCacheKey: row.thumbnailCacheKey }),
      createdAt,
      updatedAt,
    };
  } catch (error) {
    throw new StoredResourceError(error);
  }
};

export const ResourceRowParser = { parse: parseResourceRow };
export const RESOURCE_COLUMNS = `
  id,
  owner_scope AS ownerScope,
  studio_id AS studioId,
  show_id AS showId,
  episode_id AS episodeId,
  display_name AS displayName,
  original_filename AS originalFilename,
  local_path AS localPath,
  mime_type AS mimeType,
  category,
  file_size_bytes AS fileSizeBytes,
  source_modified_at AS sourceModifiedAt,
  content_hash AS contentHash,
  width,
  height,
  duration_ms AS durationMs,
  availability,
  thumbnail_cache_key AS thumbnailCacheKey,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

export const writeResource = (
  database: DatabaseExecutor,
  resource: Resource,
): void => {
  const studioId =
    resource.owner.scope === "studio" ? resource.owner.studioId : null;
  const showId = resource.owner.scope === "show" ? resource.owner.showId : null;
  const episodeId =
    resource.owner.scope === "episode" ? resource.owner.episodeId : null;
  const valid = parseResourceRow({
    availability: resource.availability,
    category: resource.category,
    contentHash: resource.contentHash ?? null,
    createdAt: resource.createdAt,
    displayName: resource.displayName,
    durationMs: resource.durationMs ?? null,
    episodeId,
    fileSizeBytes: resource.fileSizeBytes ?? null,
    height: resource.dimensions?.height ?? null,
    id: resource.id,
    localPath: resource.localPath ?? null,
    mimeType: resource.mimeType,
    originalFilename: resource.originalFilename ?? null,
    ownerScope: resource.owner.scope,
    showId,
    sourceModifiedAt: resource.sourceModifiedAt ?? null,
    studioId,
    thumbnailCacheKey: resource.thumbnailCacheKey ?? null,
    updatedAt: resource.updatedAt,
    width: resource.dimensions?.width ?? null,
  });
  database.run(
    `INSERT INTO resources (
       id, owner_scope, studio_id, show_id, episode_id, display_name,
       original_filename, local_path, mime_type, category, file_size_bytes,
       source_modified_at, content_hash, width, height, duration_ms,
       availability, thumbnail_cache_key, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       owner_scope = excluded.owner_scope,
       studio_id = excluded.studio_id,
       show_id = excluded.show_id,
       episode_id = excluded.episode_id,
       display_name = excluded.display_name,
       original_filename = excluded.original_filename,
       local_path = excluded.local_path,
       mime_type = excluded.mime_type,
       category = excluded.category,
       file_size_bytes = excluded.file_size_bytes,
       source_modified_at = excluded.source_modified_at,
       content_hash = excluded.content_hash,
       width = excluded.width,
       height = excluded.height,
       duration_ms = excluded.duration_ms,
       availability = excluded.availability,
       thumbnail_cache_key = excluded.thumbnail_cache_key,
       updated_at = excluded.updated_at`,
    [
      valid.id,
      valid.owner.scope,
      valid.owner.scope === "studio" ? valid.owner.studioId : null,
      valid.owner.scope === "show" ? valid.owner.showId : null,
      valid.owner.scope === "episode" ? valid.owner.episodeId : null,
      valid.displayName,
      valid.originalFilename ?? null,
      valid.localPath ?? null,
      valid.mimeType,
      valid.category,
      valid.fileSizeBytes ?? null,
      valid.sourceModifiedAt ?? null,
      valid.contentHash ?? null,
      valid.dimensions?.width ?? null,
      valid.dimensions?.height ?? null,
      valid.durationMs ?? null,
      valid.availability,
      valid.thumbnailCacheKey ?? null,
      valid.createdAt,
      valid.updatedAt,
    ],
  );
};
