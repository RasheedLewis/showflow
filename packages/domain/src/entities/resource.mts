import type { DomainEntity, PixelDimensions } from "./core.mjs";
import type {
  EpisodeId,
  ResourceId,
  ShowId,
  StudioId,
} from "../identity/entity-id.mjs";
import type { UtcTimestamp } from "../time/clock.mjs";

export type ResourceCategory =
  | "image"
  | "video"
  | "audio"
  | "font"
  | "cameraInput"
  | "microphoneInput"
  | "screenCapture"
  | "textDocument"
  | "structuredData"
  | "animatedGraphic";

export type ResourceOwner =
  | { readonly scope: "studio"; readonly studioId: StudioId }
  | { readonly scope: "show"; readonly showId: ShowId }
  | { readonly scope: "episode"; readonly episodeId: EpisodeId };

export type ResourceAvailability =
  "available" | "missing" | "unavailable" | "unsupported";

export interface Resource extends DomainEntity<ResourceId> {
  readonly owner: ResourceOwner;
  readonly displayName: string;
  readonly category: ResourceCategory;
  readonly mimeType: string;
  readonly availability: ResourceAvailability;
  readonly originalFilename?: string;
  readonly localPath?: string;
  readonly fileSizeBytes?: number;
  readonly sourceModifiedAt?: UtcTimestamp;
  readonly contentHash?: string;
  readonly dimensions?: PixelDimensions;
  readonly durationMs?: number;
  readonly thumbnailCacheKey?: string;
}
