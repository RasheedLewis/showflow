import type { DomainEntity, JsonObject } from "./core.mjs";
import type {
  ComponentPlacementId,
  EpisodeId,
  EpisodeSegmentId,
  LayoutId,
  ResourceId,
  ShowId,
  ShowSegmentId,
} from "../identity/entity-id.mjs";
import type { UtcTimestamp } from "../time/clock.mjs";

export type EpisodeStatus = "draft" | "ready";

export interface FixedResourceReplacement {
  readonly componentPlacementId: ComponentPlacementId;
  readonly propertyKey: string;
  readonly resourceId: ResourceId;
}

export interface EpisodeSegment extends DomainEntity<EpisodeSegmentId> {
  readonly episodeId: EpisodeId;
  readonly sourceShowSegmentId: ShowSegmentId;
  readonly position: number;
  readonly label?: string;
  readonly fieldValues: JsonObject;
  readonly notes: string;
  readonly expectedDurationOverrideMs?: number;
  readonly defaultLayoutOverrideId?: LayoutId;
  readonly fixedResourceReplacements: readonly FixedResourceReplacement[];
}

export interface Episode extends DomainEntity<EpisodeId> {
  readonly showId: ShowId;
  readonly title: string;
  readonly subtitle?: string;
  readonly episodeNumber?: number;
  readonly description?: string;
  readonly plannedAt?: UtcTimestamp;
  readonly status: EpisodeStatus;
  readonly guestNames: readonly string[];
  readonly sponsorInformation?: string;
  readonly internalNotes: string;
  readonly segments: readonly EpisodeSegment[];
}
