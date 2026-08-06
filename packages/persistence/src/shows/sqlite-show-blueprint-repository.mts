import type { ShowBlueprintRepository } from "@showflow/application";
import type { ShowBlueprint, ShowBlueprintId, ShowId } from "@showflow/domain";

import type { ShowflowDatabase } from "../database/database-service.mjs";
import { mapPersistenceError } from "../errors/persistence-error-mapper.mjs";
import {
  BLUEPRINT_COLUMNS,
  BlueprintRowParser,
  writeEmptyBlueprint,
} from "./show-storage.mjs";

export class SqliteShowBlueprintRepository implements ShowBlueprintRepository {
  constructor(readonly database: ShowflowDatabase) {}

  async getById(id: ShowBlueprintId): Promise<ShowBlueprint | null> {
    try {
      return (
        this.database.queryOne(
          `SELECT ${BLUEPRINT_COLUMNS} FROM show_blueprints WHERE id = ?`,
          BlueprintRowParser,
          [id],
        ) ?? null
      );
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async getByShowId(showId: ShowId): Promise<ShowBlueprint | null> {
    try {
      return (
        this.database.queryOne(
          `SELECT ${BLUEPRINT_COLUMNS} FROM show_blueprints WHERE show_id = ?`,
          BlueprintRowParser,
          [showId],
        ) ?? null
      );
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async save(blueprint: ShowBlueprint): Promise<void> {
    try {
      writeEmptyBlueprint(this.database, blueprint);
    } catch (error) {
      throw mapPersistenceError(error, "write");
    }
  }
}
