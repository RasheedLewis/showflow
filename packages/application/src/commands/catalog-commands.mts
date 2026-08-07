import {
  createLayout,
  createShowSegment,
  currentUtcTimestamp,
} from "@showflow/domain";
import type {
  CanvasAspectRatio,
  DomainFactoryDependencies,
  Layout,
  ShowBlueprint,
  ShowBlueprintId,
  ShowId,
  ShowSegment,
  ShowSegmentId,
} from "@showflow/domain";

import { addSegmentToBlueprint } from "./blueprint-commands.mjs";
import {
  DEFAULT_COMMAND_DEPENDENCIES,
  requireEntity,
  resolveShowScope,
  touchEntity,
} from "./command-support.mjs";
import { ApplicationError } from "../errors/application-error.mjs";
import type { ShowScopeContext } from "./command-support.mjs";
import type {
  SegmentBlueprintCreationRepository,
  TransactionRepositories,
} from "../repositories/repositories.mjs";

type ShowSegmentCommandRepositories = Pick<
  TransactionRepositories,
  "segments" | "shows"
> &
  Partial<Pick<TransactionRepositories, "episodes">>;

type LayoutCommandRepositories = Pick<
  TransactionRepositories,
  "episodes" | "layouts" | "shows"
>;

export interface CreateShowSegmentCommandInput {
  readonly context: ShowScopeContext;
  readonly name: string;
  readonly description?: string;
  readonly expectedDurationMs?: number;
  readonly notesTemplate?: string;
}

const normalizeSegmentName = (name: string): string => {
  const normalized = name.trim();
  if (normalized.length === 0 || normalized.length > 200) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Segment name must contain between 1 and 200 characters.",
    );
  }
  return normalized;
};

const normalizeDescription = (
  description: string | undefined,
): string | undefined => {
  const normalized = description?.trim();
  return normalized === "" ? undefined : normalized;
};

export class CreateShowSegmentCommand {
  readonly #repositories: ShowSegmentCommandRepositories;
  readonly #dependencies: DomainFactoryDependencies;

  constructor(
    repositories: ShowSegmentCommandRepositories,
    dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {
    this.#repositories = repositories;
    this.#dependencies = dependencies;
  }

  async execute(input: CreateShowSegmentCommandInput): Promise<ShowSegment> {
    const showId =
      input.context.scope === "show"
        ? requireEntity(
            await this.#repositories.shows.getById(input.context.showId),
            "Show",
          ).id
        : await resolveShowScope(input.context, {
            shows: this.#repositories.shows,
            episodes: requireEntity(
              this.#repositories.episodes ?? null,
              "Episode repository",
            ),
          });
    const description = normalizeDescription(input.description);
    const segment = createShowSegment(
      {
        showId,
        name: normalizeSegmentName(input.name),
        ...(description === undefined ? {} : { description }),
        ...(input.expectedDurationMs === undefined
          ? {}
          : { expectedDurationMs: input.expectedDurationMs }),
        ...(input.notesTemplate === undefined
          ? {}
          : { notesTemplate: input.notesTemplate }),
      },
      this.#dependencies,
    );
    await this.#repositories.segments.save(segment);
    return segment;
  }
}

export interface CreateShowSegmentInBlueprintCommandInput {
  readonly showId: ShowId;
  readonly blueprintId: ShowBlueprintId;
  readonly name: string;
  readonly description?: string;
  readonly position?: number;
}

interface CreateShowSegmentInBlueprintRepositories {
  readonly blueprints: TransactionRepositories["blueprints"];
  readonly shows: TransactionRepositories["shows"];
  readonly creation: SegmentBlueprintCreationRepository;
}

export class CreateShowSegmentInBlueprintCommand {
  constructor(
    readonly repositories: CreateShowSegmentInBlueprintRepositories,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(input: CreateShowSegmentInBlueprintCommandInput): Promise<{
    readonly blueprint: ShowBlueprint;
    readonly segment: ShowSegment;
  }> {
    const [show, blueprint] = await Promise.all([
      this.repositories.shows.getById(input.showId),
      this.repositories.blueprints.getById(input.blueprintId),
    ]);
    requireEntity(show, "Show");
    const currentBlueprint = requireEntity(blueprint, "Show Blueprint");
    if (currentBlueprint.showId !== input.showId) {
      throw new ApplicationError("NOT_FOUND", "Show Blueprint was not found.");
    }
    const description = normalizeDescription(input.description);
    const segment = createShowSegment(
      {
        showId: input.showId,
        name: normalizeSegmentName(input.name),
        ...(description === undefined ? {} : { description }),
      },
      this.dependencies,
    );
    const updatedBlueprint = addSegmentToBlueprint(
      currentBlueprint,
      segment,
      input.position === undefined ? {} : { position: input.position },
      this.dependencies,
    );
    await this.repositories.creation.create(segment, updatedBlueprint);
    return { blueprint: updatedBlueprint, segment };
  }
}

export interface ArchiveShowSegmentCommandInput {
  readonly showId: ShowId;
  readonly showSegmentId: ShowSegmentId;
}

export class ArchiveShowSegmentCommand {
  constructor(
    readonly repository: TransactionRepositories["segments"],
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(input: ArchiveShowSegmentCommandInput): Promise<ShowSegment> {
    const current = requireEntity(
      await this.repository.getById(input.showSegmentId),
      "Show Segment",
    );
    if (current.showId !== input.showId) {
      throw new ApplicationError("NOT_FOUND", "Show Segment was not found.");
    }
    const segment = touchEntity(
      { ...current, archivedAt: currentUtcTimestamp(this.dependencies.clock) },
      this.dependencies,
    );
    await this.repository.save(segment);
    return segment;
  }
}

export interface CreateLayoutCommandInput {
  readonly context: ShowScopeContext;
  readonly name: string;
  readonly aspectRatio?: CanvasAspectRatio;
}

export class CreateLayoutCommand {
  readonly #repositories: LayoutCommandRepositories;
  readonly #dependencies: DomainFactoryDependencies;

  constructor(
    repositories: LayoutCommandRepositories,
    dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {
    this.#repositories = repositories;
    this.#dependencies = dependencies;
  }

  async execute(input: CreateLayoutCommandInput): Promise<Layout> {
    const showId = await resolveShowScope(input.context, this.#repositories);
    const layout = createLayout(
      {
        showId,
        name: input.name,
        ...(input.aspectRatio === undefined
          ? {}
          : { aspectRatio: input.aspectRatio }),
      },
      this.#dependencies,
    );
    await this.#repositories.layouts.save(layout);
    return layout;
  }
}
