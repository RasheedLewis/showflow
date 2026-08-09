import type { Component, ShowId, StudioId } from "@showflow/domain";

import { ApplicationError } from "../errors/application-error.mjs";
import type {
  ComponentRepository,
  ShowRepository,
} from "../repositories/repositories.mjs";
import { requireQueryEntity } from "./query-support.mjs";

export class ListComponentsQuery {
  constructor(
    readonly repositories: {
      readonly components: ComponentRepository;
      readonly shows: ShowRepository;
    },
  ) {}

  async execute(
    studioId: StudioId,
    showId: ShowId,
  ): Promise<readonly Component[]> {
    const show = requireQueryEntity(
      await this.repositories.shows.getById(showId),
      "Show",
    );
    if (show.studioId !== studioId)
      throw new ApplicationError("NOT_FOUND", "Show was not found.");
    return this.repositories.components.listByShowId(showId);
  }
}
