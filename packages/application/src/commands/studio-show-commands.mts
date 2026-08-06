import {
  createEntityMetadata,
  createShow,
  createStudio,
  currentUtcTimestamp,
} from "@showflow/domain";
import type {
  CreateStudioInput,
  DomainFactoryDependencies,
  Show,
  ShowBlueprint,
  ShowId,
  Studio,
  StudioId,
} from "@showflow/domain";

import {
  DEFAULT_COMMAND_DEPENDENCIES,
  requireEntity,
  touchEntity,
} from "./command-support.mjs";
import { ApplicationError } from "../errors/application-error.mjs";
import type {
  ShowCreationRepository,
  ShowDeletionRepository,
  ShowRepository,
  StudioRepository,
} from "../repositories/repositories.mjs";

export type CreateStudioCommandInput = CreateStudioInput;

const normalizeStudioName = (name: string): string => {
  const normalizedName = name.trim();

  if (normalizedName.length === 0 || normalizedName.length > 200) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Studio name must contain between 1 and 200 characters.",
    );
  }

  return normalizedName;
};

export class CreateStudioCommand {
  readonly #repository: StudioRepository;
  readonly #dependencies: DomainFactoryDependencies;

  constructor(
    repository: StudioRepository,
    dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {
    this.#repository = repository;
    this.#dependencies = dependencies;
  }

  async execute(input: CreateStudioCommandInput): Promise<Studio> {
    const studio = createStudio(
      { name: normalizeStudioName(input.name) },
      this.#dependencies,
    );
    await this.#repository.save(studio);
    return studio;
  }
}

export interface RenameStudioCommandInput {
  readonly studioId: StudioId;
  readonly name: string;
}

export class RenameStudioCommand {
  readonly #repository: StudioRepository;
  readonly #dependencies: DomainFactoryDependencies;

  constructor(
    repository: StudioRepository,
    dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {
    this.#repository = repository;
    this.#dependencies = dependencies;
  }

  async execute(input: RenameStudioCommandInput): Promise<Studio> {
    const current = requireEntity(
      await this.#repository.getById(input.studioId),
      "Studio",
    );
    const studio = touchEntity(
      { ...current, name: normalizeStudioName(input.name) },
      this.#dependencies,
    );
    await this.#repository.save(studio);
    return studio;
  }
}

export interface CreateShowCommandInput {
  readonly studioId: StudioId;
  readonly name: string;
  readonly description?: string;
}

export interface CreatedShow {
  readonly show: Show;
  readonly blueprint: ShowBlueprint;
}

const createShowBlueprint = (
  show: Show,
  dependencies: DomainFactoryDependencies,
): ShowBlueprint => ({
  id: dependencies.createId("showBlueprint"),
  showId: show.id,
  placements: [],
  ...createEntityMetadata(dependencies.clock),
});

const normalizeShowName = (name: string): string => {
  const normalizedName = name.trim();

  if (normalizedName.length === 0 || normalizedName.length > 200) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Show name must contain between 1 and 200 characters.",
    );
  }

  return normalizedName;
};

const normalizeShowDescription = (
  description: string | undefined,
): string | undefined => {
  const normalizedDescription = description?.trim();
  return normalizedDescription === "" ? undefined : normalizedDescription;
};

interface CreateShowRepositories {
  readonly studios: StudioRepository;
  readonly showCreation: ShowCreationRepository;
}

export class CreateShowCommand {
  readonly #repositories: CreateShowRepositories;
  readonly #dependencies: DomainFactoryDependencies;

  constructor(
    repositories: CreateShowRepositories,
    dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {
    this.#repositories = repositories;
    this.#dependencies = dependencies;
  }

  async execute(input: CreateShowCommandInput): Promise<CreatedShow> {
    requireEntity(
      await this.#repositories.studios.getById(input.studioId),
      "Studio",
    );

    const description = normalizeShowDescription(input.description);
    const show = createShow(
      {
        studioId: input.studioId,
        name: normalizeShowName(input.name),
        ...(description === undefined ? {} : { description }),
      },
      this.#dependencies,
    );
    const blueprint = createShowBlueprint(show, this.#dependencies);

    await this.#repositories.showCreation.create(show, blueprint);
    return { show, blueprint };
  }
}

export interface RenameShowCommandInput {
  readonly showId: ShowId;
  readonly studioId: StudioId;
  readonly name: string;
}

const requireShowInStudio = async (
  repository: ShowRepository,
  studioId: StudioId,
  showId: ShowId,
): Promise<Show> => {
  const show = requireEntity(await repository.getById(showId), "Show");
  if (show.studioId !== studioId) {
    throw new ApplicationError("NOT_FOUND", "Show was not found.");
  }
  return show;
};

export class RenameShowCommand {
  readonly #repository: ShowRepository;
  readonly #dependencies: DomainFactoryDependencies;

  constructor(
    repository: ShowRepository,
    dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {
    this.#repository = repository;
    this.#dependencies = dependencies;
  }

  async execute(input: RenameShowCommandInput): Promise<Show> {
    const current = await requireShowInStudio(
      this.#repository,
      input.studioId,
      input.showId,
    );
    const show = touchEntity(
      { ...current, name: normalizeShowName(input.name) },
      this.#dependencies,
    );
    await this.#repository.save(show);
    return show;
  }
}

export interface ArchiveShowCommandInput {
  readonly showId: ShowId;
  readonly studioId: StudioId;
}

export class ArchiveShowCommand {
  constructor(
    readonly repository: ShowRepository,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(input: ArchiveShowCommandInput): Promise<Show> {
    const current = await requireShowInStudio(
      this.repository,
      input.studioId,
      input.showId,
    );
    const archivedAt = currentUtcTimestamp(this.dependencies.clock);
    const show = touchEntity({ ...current, archivedAt }, this.dependencies);
    await this.repository.save(show);
    return show;
  }
}

export interface DeleteShowCommandInput {
  readonly showId: ShowId;
  readonly studioId: StudioId;
}

interface DeleteShowRepositories {
  readonly shows: ShowRepository;
  readonly showDeletion: ShowDeletionRepository;
}

export class DeleteShowCommand {
  constructor(readonly repositories: DeleteShowRepositories) {}

  async execute(input: DeleteShowCommandInput): Promise<ShowId> {
    const show = await requireShowInStudio(
      this.repositories.shows,
      input.studioId,
      input.showId,
    );
    await this.repositories.showDeletion.delete(show.id);
    return show.id;
  }
}
