import type {
  CanvasAspectRatio,
  ComponentType,
  NormalizedEdgeInsets,
  NormalizedRect,
  SlotAlignment,
  SlotRole,
} from "./composition.mjs";
import type { Archivable, DomainEntity, PixelDimensions } from "./core.mjs";
import type { ComponentPlacement } from "./component.mjs";
import type { LayoutId, ShowId, SlotId } from "../identity/entity-id.mjs";

export interface Slot extends DomainEntity<SlotId> {
  readonly layoutId: LayoutId;
  readonly name: string;
  readonly role: SlotRole;
  readonly bounds: NormalizedRect;
  readonly alignment: SlotAlignment;
  readonly safeMargins: NormalizedEdgeInsets;
  readonly layerOrder: number;
  readonly clipContent: boolean;
  readonly allowedComponentTypes: readonly ComponentType[];
}

export interface Layout extends DomainEntity<LayoutId>, Archivable {
  readonly showId: ShowId;
  readonly name: string;
  readonly aspectRatio: CanvasAspectRatio;
  readonly canvas: PixelDimensions;
  readonly slots: readonly Slot[];
  readonly componentPlacements: readonly ComponentPlacement[];
}
