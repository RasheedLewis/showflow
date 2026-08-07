import type { ShowSegmentRepository } from "@showflow/application";
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
}
