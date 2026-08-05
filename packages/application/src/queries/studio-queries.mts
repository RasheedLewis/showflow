import type { Show, Studio, StudioId } from "@showflow/domain";

import { requireQueryEntity } from "./query-support.mjs";
import type {
  EpisodeRepository,
  ShowRepository,
  StudioRepository,
} from "../repositories/repositories.mjs";

export class ListStudiosQuery {
  readonly #repository: StudioRepository;

  constructor(repository: StudioRepository) {
    this.#repository = repository;
  }

  execute(): Promise<readonly Studio[]> {
    return this.#repository.list();
  }
}

export interface StudioHomeShow {
  readonly show: Show;
  readonly episodeCount: number;
}

export interface StudioHome {
  readonly studio: Studio;
  readonly shows: readonly StudioHomeShow[];
}

type StudioHomeRepositories = {
  readonly studios: StudioRepository;
  readonly shows: ShowRepository;
  readonly episodes: EpisodeRepository;
};

export class GetStudioHomeQuery {
  readonly #repositories: StudioHomeRepositories;

  constructor(repositories: StudioHomeRepositories) {
    this.#repositories = repositories;
  }

  async execute(studioId: StudioId): Promise<StudioHome> {
    const studio = requireQueryEntity(
      await this.#repositories.studios.getById(studioId),
      "Studio",
    );
    const shows = await this.#repositories.shows.listByStudioId(studio.id);
    const showSummaries = await Promise.all(
      shows.map(async (show) => ({
        show,
        episodeCount: (await this.#repositories.episodes.listByShowId(show.id))
          .length,
      })),
    );

    return { studio, shows: showSummaries };
  }
}
