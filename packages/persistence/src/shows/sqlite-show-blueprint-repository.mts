import type { ShowBlueprintRepository } from "@showflow/application";
import type { ShowBlueprint, ShowBlueprintId, ShowId } from "@showflow/domain";

import type { ShowflowDatabase } from "../database/database-service.mjs";
import { mapPersistenceError } from "../errors/persistence-error-mapper.mjs";
import {
  BLUEPRINT_COLUMNS,
  BLUEPRINT_PLACEMENT_COLUMNS,
  BlueprintPlacementRowParser,
  BlueprintRowParser,
  writeBlueprint,
} from "./show-storage.mjs";

export class SqliteShowBlueprintRepository implements ShowBlueprintRepository {
  constructor(readonly database: ShowflowDatabase) {}

  async getById(id: ShowBlueprintId): Promise<ShowBlueprint | null> {
    try {
      const blueprint =
        this.database.queryOne(
          `SELECT ${BLUEPRINT_COLUMNS} FROM show_blueprints WHERE id = ?`,
          BlueprintRowParser,
          [id],
        ) ?? null;
      return blueprint === null ? null : this.#withPlacements(blueprint);
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async getByShowId(showId: ShowId): Promise<ShowBlueprint | null> {
    try {
      const blueprint =
        this.database.queryOne(
          `SELECT ${BLUEPRINT_COLUMNS} FROM show_blueprints WHERE show_id = ?`,
          BlueprintRowParser,
          [showId],
        ) ?? null;
      return blueprint === null ? null : this.#withPlacements(blueprint);
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async save(blueprint: ShowBlueprint): Promise<void> {
    try {
      this.database.transaction((transaction) => {
        writeBlueprint(transaction, blueprint);
      });
    } catch (error) {
      throw mapPersistenceError(error, "write");
    }
  }

  #withPlacements(blueprint: ShowBlueprint): ShowBlueprint {
    const placements = this.database.queryAll(
      `SELECT ${BLUEPRINT_PLACEMENT_COLUMNS}
       FROM blueprint_segment_placements
       WHERE show_blueprint_id = ?
       ORDER BY position, id`,
      BlueprintPlacementRowParser,
      [blueprint.id],
    );
    return { ...blueprint, placements };
  }
}
