import type { SegmentBlueprintCreationRepository } from "@showflow/application";
import type { ShowBlueprint, ShowSegment } from "@showflow/domain";

import type { ShowflowDatabase } from "../database/database-service.mjs";
import { mapPersistenceError } from "../errors/persistence-error-mapper.mjs";
import { writeBlueprint } from "./show-storage.mjs";
import { writeShowSegment } from "./segment-storage.mjs";

export class SqliteSegmentBlueprintCreationRepository implements SegmentBlueprintCreationRepository {
  constructor(readonly database: ShowflowDatabase) {}

  async create(segment: ShowSegment, blueprint: ShowBlueprint): Promise<void> {
    try {
      this.database.transaction((transaction) => {
        writeShowSegment(transaction, segment);
        writeBlueprint(transaction, blueprint);
      });
    } catch (error) {
      throw mapPersistenceError(error, "write");
    }
  }
}
