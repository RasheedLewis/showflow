import type { ComponentRepository } from "@showflow/application";
import type { Component, ComponentId, ShowId } from "@showflow/domain";

import type { ShowflowDatabase } from "../database/database-service.mjs";
import { mapPersistenceError } from "../errors/persistence-error-mapper.mjs";
import {
  COMPONENT_COLUMNS,
  ComponentRowParser,
  writeComponent,
} from "./component-storage.mjs";

export class SqliteComponentRepository implements ComponentRepository {
  constructor(readonly database: ShowflowDatabase) {}

  async getById(id: ComponentId): Promise<Component | null> {
    try {
      return (
        this.database.queryOne(
          `SELECT ${COMPONENT_COLUMNS} FROM components WHERE id = ?`,
          ComponentRowParser,
          [id],
        ) ?? null
      );
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async listByShowId(showId: ShowId): Promise<readonly Component[]> {
    try {
      return this.database.queryAll(
        `SELECT ${COMPONENT_COLUMNS} FROM components
         WHERE show_id = ? AND archived_at IS NULL
         ORDER BY component_type, updated_at DESC, id`,
        ComponentRowParser,
        [showId],
      );
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async save(component: Component): Promise<void> {
    try {
      this.database.transaction((transaction) =>
        writeComponent(transaction, component),
      );
    } catch (error) {
      throw mapPersistenceError(error, "write");
    }
  }
}
