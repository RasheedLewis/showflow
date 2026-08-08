import { z } from "zod";

import type {
  ResourceRepository,
  ResourceUsageReference,
} from "@showflow/application";
import {
  parseEntityId,
  type Resource,
  type ResourceId,
  type ResourceOwner,
} from "@showflow/domain";

import type { ShowflowDatabase } from "../database/database-service.mjs";
import { mapPersistenceError } from "../errors/persistence-error-mapper.mjs";
import {
  RESOURCE_COLUMNS,
  ResourceRowParser,
  writeResource,
} from "./resource-storage.mjs";

const UsageRowSchema = z
  .object({
    episodeId: z.string(),
    episodeSegmentId: z.string(),
    episodeTitle: z.string(),
    fieldKey: z.string(),
    segmentName: z.string(),
    showId: z.string(),
  })
  .strict();

const ownerWhere = (
  owner: ResourceOwner,
): { readonly column: string; readonly id: string } => {
  switch (owner.scope) {
    case "studio":
      return { column: "studio_id", id: owner.studioId };
    case "show":
      return { column: "show_id", id: owner.showId };
    case "episode":
      return { column: "episode_id", id: owner.episodeId };
  }
};

export class SqliteResourceRepository implements ResourceRepository {
  constructor(readonly database: ShowflowDatabase) {}

  async getById(id: ResourceId): Promise<Resource | null> {
    try {
      return (
        this.database.queryOne(
          `SELECT ${RESOURCE_COLUMNS} FROM resources WHERE id = ?`,
          ResourceRowParser,
          [id],
        ) ?? null
      );
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async listByOwner(owner: ResourceOwner): Promise<readonly Resource[]> {
    try {
      const scoped = ownerWhere(owner);
      return this.database.queryAll(
        `SELECT ${RESOURCE_COLUMNS}
         FROM resources
         WHERE owner_scope = ? AND ${scoped.column} = ?
         ORDER BY updated_at DESC, display_name COLLATE NOCASE, id`,
        ResourceRowParser,
        [owner.scope, scoped.id],
      );
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async save(resource: Resource): Promise<void> {
    try {
      writeResource(this.database, resource);
    } catch (error) {
      throw mapPersistenceError(error, "write");
    }
  }

  async delete(id: ResourceId): Promise<void> {
    try {
      this.database.run("DELETE FROM resources WHERE id = ?", [id]);
    } catch (error) {
      throw mapPersistenceError(error, "write");
    }
  }

  async listUsage(id: ResourceId): Promise<readonly ResourceUsageReference[]> {
    try {
      return this.database
        .queryAll(
          `SELECT
             e.id AS episodeId,
             es.id AS episodeSegmentId,
             e.title AS episodeTitle,
             fields.key AS fieldKey,
             ss.name AS segmentName,
             e.show_id AS showId
           FROM episode_segments es
           JOIN episodes e ON e.id = es.episode_id
           JOIN show_segments ss ON ss.id = es.source_show_segment_id
           JOIN json_each(es.field_values_json) fields
           WHERE fields.value = ?
           ORDER BY e.title COLLATE NOCASE, es.position, fields.key`,
          UsageRowSchema,
          [id],
        )
        .map((row) => ({
          episodeId: parseEntityId<"episode">(row.episodeId),
          episodeSegmentId: parseEntityId<"episodeSegment">(
            row.episodeSegmentId,
          ),
          episodeTitle: row.episodeTitle,
          fieldKey: row.fieldKey,
          segmentName: row.segmentName,
          showId: parseEntityId<"show">(row.showId),
        }));
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }
}
