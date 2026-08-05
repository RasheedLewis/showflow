import { createEntityMetadata, updateEntityMetadata } from "@showflow/domain";
import type {
  CreateEpisodeInput,
  DomainFactoryDependencies,
  Episode,
  EpisodeId,
  EpisodeSegment,
  EpisodeSegmentId,
} from "@showflow/domain";

import {
  DEFAULT_COMMAND_DEPENDENCIES,
  orderEntitiesById,
  requireEntity,
  throwNotFound,
  touchEntity,
} from "./command-support.mjs";
import type {
  ApplicationRepositories,
  TransactionRepositories,
} from "../repositories/repositories.mjs";

type EpisodeCommandRepository = TransactionRepositories["episodes"];

const saveEpisode = async (
  repository: EpisodeCommandRepository,
  episode: Episode,
): Promise<Episode> => {
  await repository.save(episode);
  return episode;
};

export type CreateEpisodeFromBlueprintCommandInput = CreateEpisodeInput;

export interface EpisodeFromBlueprintCreator {
  create(
    input: CreateEpisodeFromBlueprintCommandInput,
    repositories: TransactionRepositories,
    dependencies: DomainFactoryDependencies,
  ): Promise<Episode>;
}

export class CreateEpisodeFromBlueprintCommand {
  readonly #repositories: ApplicationRepositories;
  readonly #creator: EpisodeFromBlueprintCreator;
  readonly #dependencies: DomainFactoryDependencies;

  constructor(
    repositories: ApplicationRepositories,
    creator: EpisodeFromBlueprintCreator,
    dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {
    this.#repositories = repositories;
    this.#creator = creator;
    this.#dependencies = dependencies;
  }

  execute(input: CreateEpisodeFromBlueprintCommandInput): Promise<Episode> {
    return this.#repositories.transactions.run((repositories) =>
      this.#creator.create(input, repositories, this.#dependencies),
    );
  }
}

export interface ReorderEpisodeSegmentsCommandInput {
  readonly episodeId: EpisodeId;
  readonly orderedEpisodeSegmentIds: readonly EpisodeSegmentId[];
}

export class ReorderEpisodeSegmentsCommand {
  readonly #repository: EpisodeCommandRepository;
  readonly #dependencies: DomainFactoryDependencies;

  constructor(
    repository: EpisodeCommandRepository,
    dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {
    this.#repository = repository;
    this.#dependencies = dependencies;
  }

  async execute(input: ReorderEpisodeSegmentsCommandInput): Promise<Episode> {
    const episode = requireEntity(
      await this.#repository.getById(input.episodeId),
      "Episode",
    );
    const segments = orderEntitiesById(
      episode.segments,
      input.orderedEpisodeSegmentIds,
    ).map((segment, position) => ({
      ...segment,
      position,
      ...updateEntityMetadata(segment, this.#dependencies.clock),
    }));

    return saveEpisode(
      this.#repository,
      touchEntity({ ...episode, segments }, this.#dependencies),
    );
  }
}

export interface DuplicateEpisodeSegmentCommandInput {
  readonly episodeId: EpisodeId;
  readonly episodeSegmentId: EpisodeSegmentId;
}

export class DuplicateEpisodeSegmentCommand {
  readonly #repository: EpisodeCommandRepository;
  readonly #dependencies: DomainFactoryDependencies;

  constructor(
    repository: EpisodeCommandRepository,
    dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {
    this.#repository = repository;
    this.#dependencies = dependencies;
  }

  async execute(input: DuplicateEpisodeSegmentCommandInput): Promise<Episode> {
    const episode = requireEntity(
      await this.#repository.getById(input.episodeId),
      "Episode",
    );
    const sourceIndex = episode.segments.findIndex(
      (segment) => segment.id === input.episodeSegmentId,
    );
    const source = requireEntity(
      episode.segments[sourceIndex] ?? null,
      "Episode Segment",
    );
    const duplicate = {
      ...source,
      id: this.#dependencies.createId("episodeSegment"),
      fieldValues: { ...source.fieldValues },
      fixedResourceReplacements: source.fixedResourceReplacements.map(
        (replacement) => ({ ...replacement }),
      ),
      ...createEntityMetadata(this.#dependencies.clock),
    } satisfies EpisodeSegment;
    const segments = [...episode.segments];
    segments.splice(sourceIndex + 1, 0, duplicate);
    const positioned = segments.map((segment, position) =>
      segment.id === duplicate.id
        ? { ...segment, position }
        : {
            ...segment,
            position,
            ...updateEntityMetadata(segment, this.#dependencies.clock),
          },
    );

    return saveEpisode(
      this.#repository,
      touchEntity({ ...episode, segments: positioned }, this.#dependencies),
    );
  }
}

export interface RemoveEpisodeSegmentCommandInput {
  readonly episodeId: EpisodeId;
  readonly episodeSegmentId: EpisodeSegmentId;
}

export class RemoveEpisodeSegmentCommand {
  readonly #repository: EpisodeCommandRepository;
  readonly #dependencies: DomainFactoryDependencies;

  constructor(
    repository: EpisodeCommandRepository,
    dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {
    this.#repository = repository;
    this.#dependencies = dependencies;
  }

  async execute(input: RemoveEpisodeSegmentCommandInput): Promise<Episode> {
    const episode = requireEntity(
      await this.#repository.getById(input.episodeId),
      "Episode",
    );
    const retained = episode.segments.filter(
      (segment) => segment.id !== input.episodeSegmentId,
    );

    if (retained.length === episode.segments.length) {
      throwNotFound("Episode Segment");
    }

    const segments = retained.map((segment, position) => ({
      ...segment,
      position,
      ...updateEntityMetadata(segment, this.#dependencies.clock),
    }));

    return saveEpisode(
      this.#repository,
      touchEntity({ ...episode, segments }, this.#dependencies),
    );
  }
}
