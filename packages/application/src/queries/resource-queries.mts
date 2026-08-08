import type {
  EpisodeId,
  Resource,
  ResourceId,
  ResourceOwner,
  ShowId,
  StudioId,
} from "@showflow/domain";

import {
  resolveResourceOwner,
  type ResourceScopeContext,
} from "../commands/resource-commands.mjs";
import { ApplicationError } from "../errors/application-error.mjs";
import type {
  ResourceUsageReference,
  EpisodeRepository,
  ResourceRepository,
  ShowRepository,
  StudioRepository,
} from "../repositories/repositories.mjs";

type ResourceQueryRepositories = {
  readonly episodes: Pick<EpisodeRepository, "getById">;
  readonly resources: ResourceRepository;
  readonly shows: Pick<ShowRepository, "getById">;
  readonly studios: Pick<StudioRepository, "getById">;
};

const visibleOwners = (
  context: ResourceScopeContext,
  exact: ResourceOwner,
): readonly ResourceOwner[] => {
  if (context.scope === "studio") return [exact];
  if (context.scope === "show") {
    return [{ scope: "studio", studioId: context.studioId }, exact];
  }
  return [
    { scope: "studio", studioId: context.studioId },
    { scope: "show", showId: context.showId },
    exact,
  ];
};

export interface ResourceDetail {
  readonly resource: Resource;
  readonly usage: readonly ResourceUsageReference[];
}

export class ListResourcesQuery {
  constructor(readonly repositories: ResourceQueryRepositories) {}

  async execute(
    context: ResourceScopeContext,
  ): Promise<readonly ResourceDetail[]> {
    const exactOwner = await resolveResourceOwner(context, this.repositories);
    const resources = (
      await Promise.all(
        visibleOwners(context, exactOwner).map((owner) =>
          this.repositories.resources.listByOwner(owner),
        ),
      )
    ).flat();
    return Promise.all(
      resources.map(async (resource) => ({
        resource,
        usage: await this.repositories.resources.listUsage(resource.id),
      })),
    );
  }
}

const resourceStudioId = async (
  resource: Resource,
  repositories: Pick<ResourceQueryRepositories, "episodes" | "shows">,
): Promise<StudioId> => {
  if (resource.owner.scope === "studio") return resource.owner.studioId;
  const showId: ShowId =
    resource.owner.scope === "show"
      ? resource.owner.showId
      : ((await repositories.episodes.getById(resource.owner.episodeId))
          ?.showId ??
        (() => {
          throw new ApplicationError(
            "NOT_FOUND",
            "Resource owner was not found.",
          );
        })());
  const show = await repositories.shows.getById(showId);
  if (show === null)
    throw new ApplicationError("NOT_FOUND", "Resource owner was not found.");
  return show.studioId;
};

export class GetResourceAccessQuery {
  constructor(readonly repositories: ResourceQueryRepositories) {}

  async execute(resourceId: ResourceId, studioId: StudioId): Promise<Resource> {
    const resource = await this.repositories.resources.getById(resourceId);
    if (
      resource === null ||
      (await resourceStudioId(resource, this.repositories)) !== studioId
    ) {
      throw new ApplicationError(
        "NOT_FOUND",
        "Resource is not available in this Studio.",
      );
    }
    return resource;
  }
}

export interface ResourceFieldReference {
  readonly episodeId: EpisodeId;
  readonly resourceId: ResourceId;
  readonly fieldKey: string;
}
