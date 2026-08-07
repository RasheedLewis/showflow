import type { EpisodeRepository } from "@showflow/application";
import type { Episode, EpisodeId, ShowId } from "@showflow/domain";

import type { ShowflowDatabase } from "../database/database-service.mjs";
import { mapPersistenceError } from "../errors/persistence-error-mapper.mjs";
import {
  EPISODE_COLUMNS,
  EPISODE_SEGMENT_COLUMNS,
  EpisodeRowParser,
  EpisodeSegmentRowParser,
  writeEpisode,
} from "./episode-storage.mjs";

export class SqliteEpisodeRepository implements EpisodeRepository {
  constructor(readonly database: ShowflowDatabase) {}

  async getById(id: EpisodeId): Promise<Episode | null> {
    try {
      const episode =
        this.database.queryOne(
          `SELECT ${EPISODE_COLUMNS} FROM episodes WHERE id = ?`,
          EpisodeRowParser,
          [id],
        ) ?? null;
      return episode === null ? null : this.#withSegments(episode);
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async listByShowId(showId: ShowId): Promise<readonly Episode[]> {
    try {
      return this.database
        .queryAll(
          `SELECT ${EPISODE_COLUMNS}
           FROM episodes
           WHERE show_id = ?
           ORDER BY updated_at DESC, id`,
          EpisodeRowParser,
          [showId],
        )
        .map((episode) => this.#withSegments(episode));
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async save(episode: Episode): Promise<void> {
    try {
      this.database.transaction((transaction) =>
        writeEpisode(transaction, episode),
      );
    } catch (error) {
      throw mapPersistenceError(error, "write");
    }
  }

  #withSegments(episode: Episode): Episode {
    const segments = this.database.queryAll(
      `SELECT ${EPISODE_SEGMENT_COLUMNS}
       FROM episode_segments
       WHERE episode_id = ?
       ORDER BY position, id`,
      EpisodeSegmentRowParser,
      [episode.id],
    );
    return { ...episode, segments };
  }
}
