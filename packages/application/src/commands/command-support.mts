import {
  createEntityId,
  SYSTEM_CLOCK,
  updateEntityMetadata,
} from "@showflow/domain";
import type {
  DomainFactoryDependencies,
  EntityId,
  EntityIdKind,
  EntityMetadata,
  EpisodeId,
  ShowId,
} from "@showflow/domain";

import { ApplicationError } from "../errors/application-error.mjs";
import type { TransactionRepositories } from "../repositories/repositories.mjs";

export const DEFAULT_COMMAND_DEPENDENCIES: DomainFactoryDependencies =
  Object.freeze({
    clock: SYSTEM_CLOCK,
    createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
      createEntityId<TEntity>(),
  });

export const throwNotFound = (entityName: string): never => {
  throw new ApplicationError("NOT_FOUND", `${entityName} was not found.`);
};

export const requireEntity = <TEntity,>(
  entity: TEntity | null,
  entityName: string,
): TEntity => {
  if (entity === null) {
    return throwNotFound(entityName);
  }

  return entity;
};

export const touchEntity = <TEntity extends EntityMetadata>(
  entity: TEntity,
  dependencies: DomainFactoryDependencies,
): TEntity =>
  Object.assign({}, entity, updateEntityMetadata(entity, dependencies.clock));

export type ShowScopeContext =
  | { readonly scope: "show"; readonly showId: ShowId }
  | { readonly scope: "episode"; readonly episodeId: EpisodeId };

type ShowScopeRepositories = Pick<
  TransactionRepositories,
  "episodes" | "shows"
>;

export const resolveShowScope = async (
  context: ShowScopeContext,
  repositories: ShowScopeRepositories,
): Promise<ShowId> => {
  if (context.scope === "show") {
    const show = requireEntity(
      await repositories.shows.getById(context.showId),
      "Show",
    );
    return show.id;
  }

  const episode = requireEntity(
    await repositories.episodes.getById(context.episodeId),
    "Episode",
  );
  return episode.showId;
};

export const orderEntitiesById = <
  TEntity extends { readonly id: TEntityId },
  TEntityId extends string,
>(
  entities: readonly TEntity[],
  orderedIds: readonly TEntityId[],
): readonly TEntity[] => {
  const entitiesById = new Map(entities.map((entity) => [entity.id, entity]));
  const orderedIdSet = new Set(orderedIds);

  if (
    entitiesById.size !== entities.length ||
    orderedIdSet.size !== orderedIds.length ||
    orderedIds.length !== entities.length ||
    orderedIds.some((id) => !entitiesById.has(id))
  ) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "The requested order must contain every current item exactly once.",
    );
  }

  return orderedIds.map((id) =>
    requireEntity(entitiesById.get(id) ?? null, "Ordered item"),
  );
};
