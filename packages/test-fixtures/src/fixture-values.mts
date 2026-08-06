import { parseEntityId, parseUtcTimestamp } from "@showflow/domain";
import type { EntityId, EntityIdKind, EntityMetadata } from "@showflow/domain";

export const FIXTURE_TIMESTAMP = parseUtcTimestamp("2026-01-15T12:00:00.000Z");

export const fixtureId = <TEntity extends EntityIdKind>(
  sequence: number,
): EntityId<TEntity> => {
  if (
    !Number.isSafeInteger(sequence) ||
    sequence < 0 ||
    sequence > 0xffffffffffff
  ) {
    throw new RangeError(
      "Fixture ID sequence must be a non-negative 12-digit hexadecimal integer.",
    );
  }

  return parseEntityId<TEntity>(
    `01942c1f-ae8f-7e42-b900-${sequence.toString(16).padStart(12, "0")}`,
  );
};

export const fixtureMetadata = (): EntityMetadata => ({
  createdAt: FIXTURE_TIMESTAMP,
  updatedAt: FIXTURE_TIMESTAMP,
});
