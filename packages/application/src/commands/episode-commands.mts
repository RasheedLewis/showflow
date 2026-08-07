import {
  assertEpisodeSegmentOwnership,
  createEntityMetadata,
  createEpisodeSegment,
  createShowSegment,
  updateEntityMetadata,
} from "@showflow/domain";
import type {
  CreateEpisodeInput,
  DomainFactoryDependencies,
  Episode,
  EpisodeId,
  EpisodeSegment,
  EpisodeSegmentId,
  JsonObject,
  JsonValue,
  ShowSegment,
  ShowSegmentId,
} from "@showflow/domain";

import {
  normalizeOptionalDescription,
  normalizeShowSegmentName,
} from "./catalog-commands.mjs";
import { RepositoryEpisodeFromBlueprintCreator } from "./episode-creation.mjs";
import type {
  EpisodeCreationRepositories,
  EpisodeFromBlueprintCreator,
} from "./episode-creation.mjs";
import {
  DEFAULT_COMMAND_DEPENDENCIES,
  orderEntitiesById,
  requireEntity,
  throwNotFound,
  touchEntity,
} from "./command-support.mjs";
import type {
  ApplicationRepositories,
  SegmentEpisodeCreationRepository,
  TransactionRepositories,
} from "../repositories/repositories.mjs";
import { ApplicationError } from "../errors/application-error.mjs";

type EpisodeCommandRepository = TransactionRepositories["episodes"];

const cloneJsonValue = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneJsonValue(entry));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneJsonValue(entry)]),
    );
  }
  return value;
};

const cloneJsonObject = (value: JsonObject): JsonObject =>
  cloneJsonValue(value) as JsonObject;

const saveEpisode = async (
  repository: EpisodeCommandRepository,
  episode: Episode,
): Promise<Episode> => {
  await repository.save(episode);
  return episode;
};

export type CreateEpisodeFromBlueprintCommandInput = CreateEpisodeInput;

const DEFAULT_EPISODE_FROM_BLUEPRINT_CREATOR =
  new RepositoryEpisodeFromBlueprintCreator();

export class CreateEpisodeFromBlueprintCommand {
  readonly #repositories: EpisodeCreationRepositories &
    Partial<Pick<ApplicationRepositories, "transactions">>;
  readonly #creator: EpisodeFromBlueprintCreator;
  readonly #dependencies: DomainFactoryDependencies;

  constructor(
    repositories: EpisodeCreationRepositories &
      Partial<Pick<ApplicationRepositories, "transactions">>,
    dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
    creator: EpisodeFromBlueprintCreator = DEFAULT_EPISODE_FROM_BLUEPRINT_CREATOR,
  ) {
    this.#repositories = repositories;
    this.#creator = creator;
    this.#dependencies = dependencies;
  }

  execute(input: CreateEpisodeFromBlueprintCommandInput): Promise<Episode> {
    return this.#repositories.transactions === undefined
      ? this.#creator.create(input, this.#repositories, this.#dependencies)
      : this.#repositories.transactions.run((repositories) =>
          this.#creator.create(input, repositories, this.#dependencies),
        );
  }
}

const insertEpisodeSegment = (
  episode: Episode,
  sourceSegment: ShowSegment,
  position: number,
  dependencies: DomainFactoryDependencies,
): Episode => {
  if (
    !Number.isInteger(position) ||
    position < 0 ||
    position > episode.segments.length
  ) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "The Segment insertion position is outside the Episode.",
    );
  }
  const inserted = createEpisodeSegment(
    { episode, sourceSegment, position, notes: sourceSegment.notesTemplate },
    dependencies,
  );
  const segments = [...episode.segments];
  segments.splice(position, 0, inserted);
  const positioned = segments.map((segment, index) =>
    segment.id === inserted.id
      ? segment
      : {
          ...segment,
          position: index,
          ...updateEntityMetadata(segment, dependencies.clock),
        },
  );
  return touchEntity({ ...episode, segments: positioned }, dependencies);
};

export interface InsertSegmentIntoEpisodeCommandInput {
  readonly episodeId: EpisodeId;
  readonly showSegmentId: ShowSegmentId;
  readonly position?: number;
}

export class InsertSegmentIntoEpisodeCommand {
  constructor(
    readonly repositories: Pick<
      TransactionRepositories,
      "episodes" | "segments"
    >,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(input: InsertSegmentIntoEpisodeCommandInput): Promise<Episode> {
    const [storedEpisode, storedSegment] = await Promise.all([
      this.repositories.episodes.getById(input.episodeId),
      this.repositories.segments.getById(input.showSegmentId),
    ]);
    const episode = requireEntity(storedEpisode, "Episode");
    const sourceSegment = requireEntity(storedSegment, "Show Segment");
    const updated = insertEpisodeSegment(
      episode,
      sourceSegment,
      input.position ?? episode.segments.length,
      this.dependencies,
    );
    return saveEpisode(this.repositories.episodes, updated);
  }
}

export interface CreateShowSegmentInEpisodeCommandInput {
  readonly episodeId: EpisodeId;
  readonly name: string;
  readonly description?: string;
  readonly position?: number;
}

interface CreateShowSegmentInEpisodeRepositories {
  readonly episodes: TransactionRepositories["episodes"];
  readonly shows: TransactionRepositories["shows"];
  readonly creation: SegmentEpisodeCreationRepository;
}

export class CreateShowSegmentInEpisodeCommand {
  constructor(
    readonly repositories: CreateShowSegmentInEpisodeRepositories,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(input: CreateShowSegmentInEpisodeCommandInput): Promise<{
    readonly episode: Episode;
    readonly segment: ShowSegment;
  }> {
    const episode = requireEntity(
      await this.repositories.episodes.getById(input.episodeId),
      "Episode",
    );
    requireEntity(
      await this.repositories.shows.getById(episode.showId),
      "Show",
    );
    const description = normalizeOptionalDescription(input.description);
    const segment = createShowSegment(
      {
        showId: episode.showId,
        name: normalizeShowSegmentName(input.name),
        ...(description === undefined ? {} : { description }),
      },
      this.dependencies,
    );
    const updatedEpisode = insertEpisodeSegment(
      episode,
      segment,
      input.position ?? episode.segments.length,
      this.dependencies,
    );
    await this.repositories.creation.create(segment, updatedEpisode);
    return { episode: updatedEpisode, segment };
  }
}

export interface RestoreEpisodeSegmentCommandInput {
  readonly episodeId: EpisodeId;
  readonly segment: EpisodeSegment;
}

export class RestoreEpisodeSegmentCommand {
  constructor(
    readonly repositories: Pick<
      TransactionRepositories,
      "episodes" | "segments"
    >,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(input: RestoreEpisodeSegmentCommandInput): Promise<Episode> {
    const episode = requireEntity(
      await this.repositories.episodes.getById(input.episodeId),
      "Episode",
    );
    if (
      episode.segments.some((segment) => segment.id === input.segment.id) ||
      input.segment.episodeId !== episode.id
    ) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "The Episode Segment cannot be restored in this Episode.",
      );
    }
    const sourceSegment = requireEntity(
      await this.repositories.segments.getById(
        input.segment.sourceShowSegmentId,
      ),
      "Show Segment",
    );
    assertEpisodeSegmentOwnership({
      episode,
      episodeSegment: input.segment,
      sourceSegment,
    });
    const position = Math.min(input.segment.position, episode.segments.length);
    const restored = {
      ...input.segment,
      position,
      ...updateEntityMetadata(input.segment, this.dependencies.clock),
    };
    const segments = [...episode.segments];
    segments.splice(position, 0, restored);
    const positioned = segments.map((segment, index) => ({
      ...segment,
      position: index,
      ...(segment.id === restored.id
        ? {}
        : updateEntityMetadata(segment, this.dependencies.clock)),
    }));
    return saveEpisode(
      this.repositories.episodes,
      touchEntity({ ...episode, segments: positioned }, this.dependencies),
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
      fieldValues: cloneJsonObject(source.fieldValues),
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
