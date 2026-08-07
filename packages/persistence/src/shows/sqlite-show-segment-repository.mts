import type { ShowSegmentRepository } from "@showflow/application";
import type { ShowId, ShowSegment, ShowSegmentId } from "@showflow/domain";

import type { ShowflowDatabase } from "../database/database-service.mjs";
import { mapPersistenceError } from "../errors/persistence-error-mapper.mjs";
import {
  SHOW_SEGMENT_COLUMNS,
  ShowSegmentRowParser,
  writeShowSegment,
} from "./segment-storage.mjs";

export class SqliteShowSegmentRepository implements ShowSegmentRepository {
  constructor(readonly database: ShowflowDatabase) {}

  async getById(id: ShowSegmentId): Promise<ShowSegment | null> {
    try {
      return (
        this.database.queryOne(
          `SELECT ${SHOW_SEGMENT_COLUMNS} FROM show_segments WHERE id = ?`,
          ShowSegmentRowParser,
          [id],
        ) ?? null
      );
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async listByShowId(showId: ShowId): Promise<readonly ShowSegment[]> {
    try {
      return this.database.queryAll(
        `SELECT ${SHOW_SEGMENT_COLUMNS}
         FROM show_segments
         WHERE show_id = ?
         ORDER BY updated_at DESC, id`,
        ShowSegmentRowParser,
        [showId],
      );
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async save(segment: ShowSegment): Promise<void> {
    try {
      writeShowSegment(this.database, segment);
    } catch (error) {
      throw mapPersistenceError(error, "write");
    }
  }
}
