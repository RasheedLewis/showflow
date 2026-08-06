import type { ShowCreationRepository } from "@showflow/application";
import type { Show, ShowBlueprint } from "@showflow/domain";

import type { ShowflowDatabase } from "../database/database-service.mjs";
import { mapPersistenceError } from "../errors/persistence-error-mapper.mjs";
import { writeEmptyBlueprint, writeShow } from "./show-storage.mjs";

export class SqliteShowCreationRepository implements ShowCreationRepository {
  constructor(readonly database: ShowflowDatabase) {}

  async create(show: Show, blueprint: ShowBlueprint): Promise<void> {
    try {
      this.database.transaction((transaction) => {
        writeShow(transaction, show, true);
        writeEmptyBlueprint(transaction, blueprint, true);
      });
    } catch (error) {
      throw mapPersistenceError(error, "write");
    }
  }
}
