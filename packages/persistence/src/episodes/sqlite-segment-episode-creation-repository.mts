import type { SegmentEpisodeCreationRepository } from "@showflow/application";
import type { Episode, ShowSegment } from "@showflow/domain";

import type { ShowflowDatabase } from "../database/database-service.mjs";
import { mapPersistenceError } from "../errors/persistence-error-mapper.mjs";
import { writeShowSegment } from "../shows/segment-storage.mjs";
import { writeEpisode } from "./episode-storage.mjs";

export class SqliteSegmentEpisodeCreationRepository implements SegmentEpisodeCreationRepository {
  constructor(readonly database: ShowflowDatabase) {}

  async create(segment: ShowSegment, episode: Episode): Promise<void> {
    try {
      this.database.transaction((transaction) => {
        writeShowSegment(transaction, segment);
        writeEpisode(transaction, episode);
      });
    } catch (error) {
      throw mapPersistenceError(error, "write");
    }
  }
}
