import type { EntityMetadata } from "./entity-metadata.mjs";
import type { Uuid } from "../identity/entity-id.mjs";
import type { UtcTimestamp } from "../time/clock.mjs";

export type JsonPrimitive = boolean | null | number | string;

export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

export type JsonObject = Readonly<{
  [key: string]: JsonValue;
}>;

export interface DomainEntity<TId extends Uuid> extends EntityMetadata {
  readonly id: TId;
}

export interface Archivable {
  readonly archivedAt?: UtcTimestamp;
}

export interface PixelDimensions {
  readonly height: number;
  readonly width: number;
}
