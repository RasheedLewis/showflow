import type { JsonValue } from "./core.mjs";
import type { ResourceId } from "../identity/entity-id.mjs";

export type CanvasAspectRatio = "16:9" | "9:16";

export interface NormalizedRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface NormalizedEdgeInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export type SlotAlignment = "center" | "end" | "start" | "stretch";

export type SlotRole =
  | "background"
  | "hostCamera"
  | "guestCamera"
  | "mainVideo"
  | "pictureInPicture"
  | "logo"
  | "lowerThird"
  | "banner"
  | "chat"
  | "center"
  | "topCenter"
  | "bottomCenter"
  | "upperLeft"
  | "upperRight"
  | "lowerLeft"
  | "lowerRight";

export type ComponentType =
  | "camera"
  | "video"
  | "image"
  | "text"
  | "graphic"
  | "logo"
  | "background"
  | "lowerThird"
  | "timer"
  | "countdown"
  | "audioIndicator";

export type AnimationPreset =
  | "none"
  | "fade"
  | "slideUp"
  | "slideDown"
  | "slideLeft"
  | "slideRight"
  | "scaleIn"
  | "scaleOut"
  | "pop"
  | "wipe";

export interface AnimationConfig {
  readonly preset: AnimationPreset;
  readonly durationMs: number;
  readonly delayMs: number;
  readonly easing: string;
}

export type Binding =
  | { readonly kind: "literal"; readonly value: JsonValue }
  | { readonly kind: "resource"; readonly resourceId: ResourceId }
  | { readonly kind: "segmentField"; readonly fieldKey: string }
  | { readonly kind: "episodeMetadata"; readonly field: string }
  | { readonly kind: "showMetadata"; readonly field: string };
