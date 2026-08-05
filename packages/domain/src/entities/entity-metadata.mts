import { currentUtcTimestamp } from "../time/clock.mjs";
import type { Clock, UtcTimestamp } from "../time/clock.mjs";

export interface EntityMetadata {
  readonly createdAt: UtcTimestamp;
  readonly updatedAt: UtcTimestamp;
}

export const createEntityMetadata = (clock: Clock): EntityMetadata => {
  const timestamp = currentUtcTimestamp(clock);

  return {
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export const updateEntityMetadata = (
  metadata: EntityMetadata,
  clock: Clock,
): EntityMetadata => {
  const updatedAt = currentUtcTimestamp(clock);

  if (updatedAt < metadata.createdAt) {
    throw new RangeError("An entity cannot be updated before it was created.");
  }

  return {
    createdAt: metadata.createdAt,
    updatedAt,
  };
};
