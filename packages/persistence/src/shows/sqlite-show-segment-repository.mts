import type {
  SegmentFieldBindingUsage,
  ShowSegmentRepository,
} from "@showflow/application";
import type { ShowId, ShowSegment, ShowSegmentId } from "@showflow/domain";
import { z } from "zod";

import type { ShowflowDatabase } from "../database/database-service.mjs";
import { mapPersistenceError } from "../errors/persistence-error-mapper.mjs";
import {
  SHOW_SEGMENT_COLUMNS,
  ShowSegmentRowParser,
  readShowSegmentDetails,
  writeShowSegment,
} from "./segment-storage.mjs";

export class SqliteShowSegmentRepository implements ShowSegmentRepository {
  constructor(readonly database: ShowflowDatabase) {}

  async getById(id: ShowSegmentId): Promise<ShowSegment | null> {
    try {
      const segment =
        this.database.queryOne(
          `SELECT ${SHOW_SEGMENT_COLUMNS} FROM show_segments WHERE id = ?`,
          ShowSegmentRowParser,
          [id],
        ) ?? null;
      return segment === null
        ? null
        : readShowSegmentDetails(this.database, segment);
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async listByShowId(showId: ShowId): Promise<readonly ShowSegment[]> {
    try {
      return this.database
        .queryAll(
          `SELECT ${SHOW_SEGMENT_COLUMNS}
           FROM show_segments
           WHERE show_id = ?
           ORDER BY updated_at DESC, id`,
          ShowSegmentRowParser,
          [showId],
        )
        .map((segment) => readShowSegmentDetails(this.database, segment));
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async save(segment: ShowSegment): Promise<void> {
    try {
      this.database.transaction((transaction) =>
        writeShowSegment(transaction, segment),
      );
    } catch (error) {
      throw mapPersistenceError(error, "write");
    }
  }

  async countEpisodeFieldValues(
    showSegmentId: ShowSegmentId,
    fieldKey: string,
  ): Promise<number> {
    try {
      const row = this.database.queryRequired(
        `SELECT COUNT(*) AS count
         FROM episode_segments
         WHERE source_show_segment_id = ?
           AND json_type(field_values_json, ?) IS NOT NULL`,
        {
          parse(value: unknown): number {
            const parsed = value as Readonly<{ count?: unknown }>;
            return z.number().int().nonnegative().parse(parsed.count);
          },
        },
        [showSegmentId, `$."${fieldKey}"`],
      );
      return row;
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async listLayoutBindingUsages(
    showSegmentId: ShowSegmentId,
    fieldKey: string,
  ): Promise<readonly SegmentFieldBindingUsage[]> {
    try {
      return this.database.queryAll(
        `SELECT
           c.name AS componentName,
           l.name AS layoutName,
           cp.id AS placementId,
           binding.key AS propertyKey
         FROM segment_lifecycle_configs lifecycle
         JOIN layouts l ON (
           l.id = json_extract(lifecycle.active_configuration_json, '$.defaultLayoutId')
           OR l.id IN (
             SELECT value
             FROM json_each(lifecycle.active_configuration_json, '$.availableLayoutIds')
           )
         )
         JOIN component_placements cp ON cp.layout_id = l.id
         JOIN components c ON c.id = cp.component_id
         JOIN json_each(cp.bindings_json) binding
         WHERE lifecycle.show_segment_id = ?
           AND json_extract(binding.value, '$.kind') = 'segmentField'
           AND json_extract(binding.value, '$.fieldKey') = ?
         ORDER BY l.name, c.name, cp.id, binding.key`,
        {
          parse(value: unknown): SegmentFieldBindingUsage {
            const row = z
              .object({
                componentName: z.string(),
                layoutName: z.string(),
                placementId: z.string(),
                propertyKey: z.string(),
              })
              .strict()
              .parse(value);
            return {
              ...row,
              placementId:
                row.placementId as SegmentFieldBindingUsage["placementId"],
            };
          },
        },
        [showSegmentId, fieldKey],
      );
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }
}
