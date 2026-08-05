import { ApplicationError } from "../errors/application-error.mjs";

export const requireQueryEntity = <TEntity,>(
  entity: TEntity | null,
  entityName: string,
): TEntity => {
  if (entity === null) {
    throw new ApplicationError("NOT_FOUND", `${entityName} was not found.`);
  }

  return entity;
};

export const loadEntitiesById = async <TEntityId extends string, TEntity>(
  entityIds: readonly TEntityId[],
  load: (entityId: TEntityId) => Promise<TEntity | null>,
  entityName: string,
): Promise<ReadonlyMap<TEntityId, TEntity>> => {
  const uniqueEntityIds = [...new Set(entityIds)];
  const entries = await Promise.all(
    uniqueEntityIds.map(async (entityId) => {
      const entity = requireQueryEntity(await load(entityId), entityName);
      return [entityId, entity] as const;
    }),
  );

  return new Map(entries);
};
