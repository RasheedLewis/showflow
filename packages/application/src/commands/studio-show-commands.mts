import {
  createEntityMetadata,
  createShow,
  createStudio,
} from "@showflow/domain";
import type {
  CreateShowInput,
  CreateStudioInput,
  DomainFactoryDependencies,
  Show,
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
  ApplicationRepositories,
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

export type CreateShowCommandInput = CreateShowInput;

export class CreateShowCommand {
  readonly #repositories: ApplicationRepositories;
  readonly #dependencies: DomainFactoryDependencies;

  constructor(
    repositories: ApplicationRepositories,
    dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {
    this.#repositories = repositories;
    this.#dependencies = dependencies;
  }

  execute(input: CreateShowCommandInput): Promise<Show> {
    return this.#repositories.transactions.run(async (repositories) => {
      requireEntity(
        await repositories.studios.getById(input.studioId),
        "Studio",
      );

      const show = createShow(input, this.#dependencies);
      const blueprint = {
        id: this.#dependencies.createId("showBlueprint"),
        showId: show.id,
        placements: [],
        ...createEntityMetadata(this.#dependencies.clock),
      };

      await repositories.shows.save(show);
      await repositories.blueprints.save(blueprint);
      return show;
    });
  }
}

export interface RenameShowCommandInput {
  readonly showId: ShowId;
  readonly name: string;
}

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
    const current = requireEntity(
      await this.#repository.getById(input.showId),
      "Show",
    );
    const show = touchEntity(
      { ...current, name: input.name },
      this.#dependencies,
    );
    await this.#repository.save(show);
    return show;
  }
}
