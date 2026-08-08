import type { LayoutRepository } from "@showflow/application";
import type { Layout, LayoutId, ShowId } from "@showflow/domain";

import type { ShowflowDatabase } from "../database/database-service.mjs";
import { mapPersistenceError } from "../errors/persistence-error-mapper.mjs";
import {
  LAYOUT_COLUMNS,
  LayoutRowParser,
  readLayoutDetails,
  writeLayout,
} from "./layout-storage.mjs";

export class SqliteLayoutRepository implements LayoutRepository {
  constructor(readonly database: ShowflowDatabase) {}

  async getById(id: LayoutId): Promise<Layout | null> {
    try {
      const layout =
        this.database.queryOne(
          `SELECT ${LAYOUT_COLUMNS} FROM layouts WHERE id = ?`,
          LayoutRowParser,
          [id],
        ) ?? null;
      return layout === null ? null : readLayoutDetails(this.database, layout);
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async listByShowId(showId: ShowId): Promise<readonly Layout[]> {
    try {
      return this.database
        .queryAll(
          `SELECT ${LAYOUT_COLUMNS}
           FROM layouts
           WHERE show_id = ? AND archived_at IS NULL
           ORDER BY updated_at DESC, id`,
          LayoutRowParser,
          [showId],
        )
        .map((layout) => readLayoutDetails(this.database, layout));
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async save(layout: Layout): Promise<void> {
    try {
      this.database.transaction((transaction) =>
        writeLayout(transaction, layout),
      );
    } catch (error) {
      throw mapPersistenceError(error, "write");
    }
  }
}
