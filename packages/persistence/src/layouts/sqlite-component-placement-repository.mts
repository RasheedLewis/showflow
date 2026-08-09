import type { ComponentPlacementAssignmentRepository } from "@showflow/application";
import type { Component, Layout } from "@showflow/domain";

import type { ShowflowDatabase } from "../database/database-service.mjs";
import { mapPersistenceError } from "../errors/persistence-error-mapper.mjs";
import { writeComponent } from "./component-storage.mjs";
import { writeLayout } from "./layout-storage.mjs";

export class SqliteComponentPlacementRepository implements ComponentPlacementAssignmentRepository {
  constructor(readonly database: ShowflowDatabase) {}

  async saveComponentAndLayout(
    component: Component,
    layout: Layout,
  ): Promise<void> {
    try {
      this.database.transaction((transaction) => {
        writeComponent(transaction, component);
        writeLayout(transaction, layout);
      });
    } catch (error) {
      throw mapPersistenceError(error, "write");
    }
  }
}
