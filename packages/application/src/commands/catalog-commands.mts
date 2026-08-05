import { createLayout, createShowSegment } from "@showflow/domain";
import type {
  CanvasAspectRatio,
  DomainFactoryDependencies,
  Layout,
  ShowSegment,
} from "@showflow/domain";

import {
  DEFAULT_COMMAND_DEPENDENCIES,
  resolveShowScope,
} from "./command-support.mjs";
import type { ShowScopeContext } from "./command-support.mjs";
import type { TransactionRepositories } from "../repositories/repositories.mjs";

type ShowSegmentCommandRepositories = Pick<
  TransactionRepositories,
  "episodes" | "segments" | "shows"
>;

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
    const showId = await resolveShowScope(input.context, this.#repositories);
    const segment = createShowSegment(
      {
        showId,
        name: input.name,
        ...(input.description === undefined
          ? {}
          : { description: input.description }),
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
