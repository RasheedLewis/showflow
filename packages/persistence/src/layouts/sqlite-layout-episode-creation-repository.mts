import type { LayoutEpisodeCreationRepository } from "@showflow/application";
import type { Episode, Layout } from "@showflow/domain";

import type { ShowflowDatabase } from "../database/database-service.mjs";
import { writeEpisode } from "../episodes/episode-storage.mjs";
import { mapPersistenceError } from "../errors/persistence-error-mapper.mjs";
import { writeLayout } from "./layout-storage.mjs";

export class SqliteLayoutEpisodeCreationRepository implements LayoutEpisodeCreationRepository {
  constructor(readonly database: ShowflowDatabase) {}

  async create(layout: Layout, episode: Episode): Promise<void> {
    try {
      this.database.transaction((transaction) => {
        writeLayout(transaction, layout);
        writeEpisode(transaction, episode);
      });
    } catch (error) {
      throw mapPersistenceError(error, "write");
    }
  }
}
