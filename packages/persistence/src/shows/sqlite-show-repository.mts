import type { ShowRepository } from "@showflow/application";
import type { Show, ShowId, StudioId } from "@showflow/domain";

import type { ShowflowDatabase } from "../database/database-service.mjs";
import { mapPersistenceError } from "../errors/persistence-error-mapper.mjs";
import { SHOW_COLUMNS, ShowRowParser, writeShow } from "./show-storage.mjs";

export class SqliteShowRepository implements ShowRepository {
  constructor(readonly database: ShowflowDatabase) {}

  async getById(id: ShowId): Promise<Show | null> {
    try {
      return (
        this.database.queryOne(
          `SELECT ${SHOW_COLUMNS} FROM shows WHERE id = ?`,
          ShowRowParser,
          [id],
        ) ?? null
      );
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async listByStudioId(studioId: StudioId): Promise<readonly Show[]> {
    try {
      return this.database.queryAll(
        `SELECT ${SHOW_COLUMNS} FROM shows
         WHERE studio_id = ? AND archived_at IS NULL
         ORDER BY updated_at DESC, id`,
        ShowRowParser,
        [studioId],
      );
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async save(show: Show): Promise<void> {
    try {
      writeShow(this.database, show);
    } catch (error) {
      throw mapPersistenceError(error, "write");
    }
  }
}
