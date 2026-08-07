import type { Archivable, DomainEntity, JsonValue } from "./core.mjs";
import type { EntityMetadata } from "./entity-metadata.mjs";
import type { HostCue } from "./host-cue.mjs";
import type {
  HostCueId,
  LayoutId,
  ResourceId,
  SegmentDataFieldId,
  ShowId,
  ShowSegmentId,
} from "../identity/entity-id.mjs";

export type SegmentDataFieldType =
  | "shortText"
  | "longText"
  | "number"
  | "imageResource"
  | "videoResource"
  | "audioResource"
  | "boolean";

export const SEGMENT_DATA_FIELD_TYPES = Object.freeze([
  "shortText",
  "longText",
  "number",
  "imageResource",
  "videoResource",
  "audioResource",
  "boolean",
] as const satisfies readonly SegmentDataFieldType[]);

export interface SegmentDataField extends DomainEntity<SegmentDataFieldId> {
  readonly showSegmentId: ShowSegmentId;
  readonly key: string;
  readonly label: string;
  readonly type: SegmentDataFieldType;
  readonly required: boolean;
  readonly defaultValue?: JsonValue;
  readonly helpText?: string;
  readonly position: number;
}

export type LifecycleAction =
  | { readonly kind: "preloadResource"; readonly resourceId: ResourceId }
  | { readonly kind: "activateLayout"; readonly layoutId: LayoutId }
  | { readonly kind: "playSound"; readonly resourceId: ResourceId }
  | { readonly kind: "startMedia"; readonly resourceId: ResourceId }
  | { readonly kind: "stopMedia"; readonly resourceId: ResourceId }
  | { readonly kind: "waitForAnimationCompletion" }
  | {
      readonly kind: "waitForMediaCompletion";
      readonly resourceId?: ResourceId;
    }
  | { readonly kind: "setActiveDefaults"; readonly layoutId: LayoutId }
  | { readonly kind: "clearTemporaryState" };

export interface ActiveSegmentConfiguration {
  readonly defaultLayoutId?: LayoutId;
  readonly availableLayoutIds: readonly LayoutId[];
  readonly hostCueIds: readonly HostCueId[];
}

export interface SegmentLifecycle extends EntityMetadata {
  readonly showSegmentId: ShowSegmentId;
  readonly prepare: readonly LifecycleAction[];
  readonly enter: readonly LifecycleAction[];
  readonly active: ActiveSegmentConfiguration;
  readonly exit: readonly LifecycleAction[];
  readonly cleanup: readonly LifecycleAction[];
}

export interface ShowSegment extends DomainEntity<ShowSegmentId>, Archivable {
  readonly showId: ShowId;
  readonly name: string;
  readonly description?: string;
  readonly dataFields: readonly SegmentDataField[];
  readonly lifecycle: SegmentLifecycle;
  readonly layoutIds: readonly LayoutId[];
  readonly hostCues: readonly HostCue[];
  readonly expectedDurationMs?: number;
  readonly notesTemplate: string;
}
