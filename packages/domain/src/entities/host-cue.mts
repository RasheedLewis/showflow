import type { DomainEntity } from "./core.mjs";
import type {
  ComponentPlacementId,
  HostCueId,
  LayoutId,
  ResourceId,
  ShowSegmentId,
} from "../identity/entity-id.mjs";

export type CueAction =
  | { readonly kind: "activateLayout"; readonly layoutId: LayoutId }
  | {
      readonly kind: "setComponentVisibility";
      readonly componentPlacementId: ComponentPlacementId;
      readonly visible: boolean;
    }
  | { readonly kind: "playSound"; readonly resourceId: ResourceId }
  | {
      readonly kind: "controlMedia";
      readonly resourceId: ResourceId;
      readonly command: "pause" | "restart" | "start" | "stop";
    }
  | {
      readonly kind: "resetTimer";
      readonly componentPlacementId: ComponentPlacementId;
    };

export type CueLifetime =
  | { readonly kind: "untilDismissed" }
  | { readonly kind: "fixedDuration"; readonly durationMs: number }
  | { readonly kind: "untilSegmentExits" };

export type CueCompletionBehavior =
  | { readonly kind: "none" }
  | {
      readonly kind: "runTargetExit";
      readonly componentPlacementId: ComponentPlacementId;
    }
  | {
      readonly kind: "hideTarget";
      readonly componentPlacementId: ComponentPlacementId;
    }
  | { readonly kind: "restorePriorLayout" }
  | { readonly kind: "restoreActiveDefaultLayout" }
  | { readonly kind: "stopMedia"; readonly resourceId: ResourceId }
  | { readonly kind: "restoreAudioLevel"; readonly resourceId: ResourceId };

export type CueRetriggerBehavior =
  | "restartLifetime"
  | "dismiss"
  | "ignore"
  | "restartPlayback"
  | "allowAnotherInstance";

/** Host Cues are manually triggered; the model intentionally has no auto-trigger. */
export interface HostCue extends DomainEntity<HostCueId> {
  readonly showSegmentId: ShowSegmentId;
  readonly name: string;
  readonly actions: readonly CueAction[];
  readonly lifetime: CueLifetime;
  readonly completionBehavior: CueCompletionBehavior;
  readonly retriggerBehavior: CueRetriggerBehavior;
  readonly keyboardShortcut?: string;
}
