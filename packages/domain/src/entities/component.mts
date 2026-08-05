import type {
  AnimationConfig,
  Binding,
  ComponentType,
  SlotRole,
} from "./composition.mjs";
import type {
  Archivable,
  DomainEntity,
  JsonObject,
  JsonValue,
} from "./core.mjs";
import type {
  ComponentId,
  ComponentPlacementId,
  LayoutId,
  ShowId,
  SlotId,
} from "../identity/entity-id.mjs";

export type ComponentPropertyType =
  | "string"
  | "number"
  | "boolean"
  | "imageResource"
  | "videoResource"
  | "audioResource";

export interface ComponentPropertyDefinition {
  readonly key: string;
  readonly label: string;
  readonly type: ComponentPropertyType;
  readonly required: boolean;
  readonly defaultValue?: JsonValue;
}

export interface ComponentValidationRule {
  readonly code: string;
  readonly propertyKey?: string;
  readonly configuration: JsonObject;
}

export interface Component extends DomainEntity<ComponentId>, Archivable {
  readonly showId: ShowId;
  readonly name: string;
  readonly type: ComponentType;
  readonly propertySchema: readonly ComponentPropertyDefinition[];
  readonly defaultProperties: JsonObject;
  readonly defaultEnterAnimation: AnimationConfig;
  readonly defaultExitAnimation: AnimationConfig;
  readonly supportedSlotRoles: readonly SlotRole[];
  readonly validationRules: readonly ComponentValidationRule[];
}

export interface ComponentPlacement extends DomainEntity<ComponentPlacementId> {
  readonly layoutId: LayoutId;
  readonly componentId: ComponentId;
  readonly slotId: SlotId;
  readonly fixedProperties: JsonObject;
  readonly bindings: Readonly<Record<string, Binding>>;
  readonly visibleByDefault: boolean;
  readonly layerOverride?: number;
  readonly enterAnimationOverride?: AnimationConfig;
  readonly exitAnimationOverride?: AnimationConfig;
}
