import type { DomainEntity, JsonObject } from "./core.mjs";
import type {
  BlueprintSegmentPlacementId,
  ShowBlueprintId,
  ShowId,
  ShowSegmentId,
} from "../identity/entity-id.mjs";

export interface BlueprintSegmentPlacement extends DomainEntity<BlueprintSegmentPlacementId> {
  readonly showBlueprintId: ShowBlueprintId;
  readonly showSegmentId: ShowSegmentId;
  readonly position: number;
  readonly label?: string;
  readonly defaultData: JsonObject;
  readonly defaultDurationMs?: number;
  readonly placementOverrides?: JsonObject;
}

export interface ShowBlueprint extends DomainEntity<ShowBlueprintId> {
  readonly showId: ShowId;
  readonly placements: readonly BlueprintSegmentPlacement[];
}
