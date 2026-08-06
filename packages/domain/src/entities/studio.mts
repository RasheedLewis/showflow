import type { Archivable, DomainEntity, JsonObject } from "./core.mjs";
import type { ResourceId, ShowId, StudioId } from "../identity/entity-id.mjs";

export interface Studio extends DomainEntity<StudioId>, Archivable {
  readonly name: string;
  readonly logoResourceId?: ResourceId;
}

export interface Show extends DomainEntity<ShowId>, Archivable {
  readonly studioId: StudioId;
  readonly name: string;
  readonly description?: string;
  readonly thumbnailResourceId?: ResourceId;
  readonly styleDefaults: JsonObject;
}
