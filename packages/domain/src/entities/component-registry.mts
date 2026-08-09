import type {
  Component,
  ComponentPlacement,
  ComponentPropertyDefinition,
} from "./component.mjs";
import type {
  AnimationConfig,
  ComponentType,
  SlotRole,
} from "./composition.mjs";
import type { JsonObject } from "./core.mjs";
import { createEntityMetadata } from "./entity-metadata.mjs";
import type { Slot } from "./layout.mjs";
import type { DomainFactoryDependencies } from "./factories.mjs";
import type { ShowId } from "../identity/entity-id.mjs";

export const BUILT_IN_COMPONENT_TYPES = Object.freeze([
  "camera",
  "video",
  "image",
  "text",
  "background",
  "logo",
  "lowerThird",
] as const satisfies readonly ComponentType[]);

export type BuiltInComponentType = (typeof BUILT_IN_COMPONENT_TYPES)[number];
export type ComponentRendererId = BuiltInComponentType;

export const LOWER_THIRD_STYLE_PRESETS = Object.freeze([
  { label: "Quiet gold", value: "quietGold" },
  { label: "Neutral panel", value: "neutralPanel" },
  { label: "High contrast", value: "highContrast" },
] as const);

export interface BuiltInComponentDefinition {
  readonly type: BuiltInComponentType;
  readonly name: string;
  readonly description: string;
  readonly renderer: ComponentRendererId;
  readonly propertySchema: readonly ComponentPropertyDefinition[];
  readonly defaults: JsonObject;
  readonly supportedSlotRoles: readonly SlotRole[];
  readonly defaultEnterAnimation: AnimationConfig;
  readonly defaultExitAnimation: AnimationConfig;
}

const noMotion: AnimationConfig = Object.freeze({
  preset: "none",
  durationMs: 0,
  delayMs: 0,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
});
const fade: AnimationConfig = Object.freeze({
  preset: "fade",
  durationMs: 220,
  delayMs: 0,
  easing: "cubic-bezier(0, 0, 0.2, 1)",
});
const slideUp: AnimationConfig = Object.freeze({
  preset: "slideUp",
  durationMs: 300,
  delayMs: 0,
  easing: "cubic-bezier(0, 0, 0.2, 1)",
});
const slideDown: AnimationConfig = Object.freeze({
  preset: "slideDown",
  durationMs: 250,
  delayMs: 0,
  easing: "cubic-bezier(0.4, 0, 1, 1)",
});

const property = (
  value: ComponentPropertyDefinition,
): ComponentPropertyDefinition => Object.freeze(value);

const registry = {
  camera: {
    type: "camera",
    name: "Camera",
    description: "Show a logical camera input or its current status.",
    renderer: "camera",
    propertySchema: [
      property({
        key: "camera",
        label: "Camera",
        type: "cameraResource",
        required: true,
      }),
    ],
    defaults: {},
    supportedSlotRoles: ["hostCamera", "guestCamera", "pictureInPicture"],
    defaultEnterAnimation: noMotion,
    defaultExitAnimation: noMotion,
  },
  video: {
    type: "video",
    name: "Video",
    description: "Play or display a video Resource.",
    renderer: "video",
    propertySchema: [
      property({
        key: "media",
        label: "Video",
        type: "videoResource",
        required: true,
      }),
    ],
    defaults: {},
    supportedSlotRoles: ["mainVideo", "pictureInPicture", "background"],
    defaultEnterAnimation: noMotion,
    defaultExitAnimation: noMotion,
  },
  image: {
    type: "image",
    name: "Image",
    description: "Display a still image Resource.",
    renderer: "image",
    propertySchema: [
      property({
        key: "image",
        label: "Image",
        type: "imageResource",
        required: true,
      }),
    ],
    defaults: {},
    supportedSlotRoles: [
      "mainVideo",
      "pictureInPicture",
      "background",
      "logo",
      "center",
      "topCenter",
      "bottomCenter",
      "upperLeft",
      "upperRight",
      "lowerLeft",
      "lowerRight",
    ],
    defaultEnterAnimation: fade,
    defaultExitAnimation: fade,
  },
  text: {
    type: "text",
    name: "Text",
    description: "Display a concise title or label.",
    renderer: "text",
    propertySchema: [
      property({
        key: "text",
        label: "Text",
        type: "string",
        required: true,
        defaultValue: "Text",
      }),
    ],
    defaults: { text: "Text", stylePreset: "title" },
    supportedSlotRoles: [
      "banner",
      "chat",
      "center",
      "topCenter",
      "bottomCenter",
      "upperLeft",
      "upperRight",
      "lowerLeft",
      "lowerRight",
    ],
    defaultEnterAnimation: fade,
    defaultExitAnimation: fade,
  },
  background: {
    type: "background",
    name: "Background",
    description: "Fill the audience frame with a color or image.",
    renderer: "background",
    propertySchema: [
      property({
        key: "image",
        label: "Background image",
        type: "imageResource",
        required: false,
      }),
      property({
        key: "color",
        label: "Background style",
        type: "string",
        required: true,
        defaultValue: "canvas",
      }),
    ],
    defaults: { color: "canvas" },
    supportedSlotRoles: ["background"],
    defaultEnterAnimation: noMotion,
    defaultExitAnimation: noMotion,
  },
  logo: {
    type: "logo",
    name: "Logo",
    description: "Display the Show logo or another image Resource.",
    renderer: "logo",
    propertySchema: [
      property({
        key: "image",
        label: "Logo image",
        type: "imageResource",
        required: true,
      }),
    ],
    defaults: {},
    supportedSlotRoles: ["logo", "upperLeft", "upperRight"],
    defaultEnterAnimation: fade,
    defaultExitAnimation: fade,
  },
  lowerThird: {
    type: "lowerThird",
    name: "Lower Third",
    description: "Display a restrained title, subtitle, and optional image.",
    renderer: "lowerThird",
    propertySchema: [
      property({
        key: "title",
        label: "Title text",
        type: "string",
        required: true,
        defaultValue: "Guest name",
      }),
      property({
        key: "subtitle",
        label: "Subtitle text",
        type: "string",
        required: false,
        defaultValue: "Role or topic",
      }),
      property({
        key: "image",
        label: "Optional image or logo",
        type: "imageResource",
        required: false,
      }),
      property({
        key: "stylePreset",
        label: "Style preset",
        type: "string",
        required: true,
        defaultValue: "quietGold",
      }),
    ],
    defaults: {
      title: "Guest name",
      subtitle: "Role or topic",
      stylePreset: "quietGold",
    },
    supportedSlotRoles: ["lowerThird", "bottomCenter", "lowerLeft"],
    defaultEnterAnimation: slideUp,
    defaultExitAnimation: slideDown,
  },
} as const satisfies Readonly<
  Record<BuiltInComponentType, BuiltInComponentDefinition>
>;

export const BUILT_IN_COMPONENT_REGISTRY: Readonly<
  Record<BuiltInComponentType, BuiltInComponentDefinition>
> = Object.freeze(registry);

export const isBuiltInComponentType = (
  value: ComponentType,
): value is BuiltInComponentType =>
  (BUILT_IN_COMPONENT_TYPES as readonly ComponentType[]).includes(value);

export const getBuiltInComponentDefinition = (
  type: BuiltInComponentType,
): BuiltInComponentDefinition => BUILT_IN_COMPONENT_REGISTRY[type];

export const createBuiltInComponent = (
  showId: ShowId,
  type: BuiltInComponentType,
  dependencies: DomainFactoryDependencies,
): Component => {
  const definition = getBuiltInComponentDefinition(type);
  return {
    id: dependencies.createId("component"),
    showId,
    name: definition.name,
    type,
    propertySchema: definition.propertySchema.map((entry) => ({ ...entry })),
    defaultProperties: { ...definition.defaults },
    defaultEnterAnimation: { ...definition.defaultEnterAnimation },
    defaultExitAnimation: { ...definition.defaultExitAnimation },
    supportedSlotRoles: [...definition.supportedSlotRoles],
    validationRules: [],
    ...createEntityMetadata(dependencies.clock),
  };
};

export const assertComponentSlotCompatibility = (
  component: Pick<Component, "type" | "supportedSlotRoles">,
  slot: Pick<Slot, "allowedComponentTypes" | "role">,
): void => {
  if (
    !slot.allowedComponentTypes.includes(component.type) ||
    !component.supportedSlotRoles.includes(slot.role)
  ) {
    throw new TypeError(
      `The ${component.type} Component is not compatible with the ${slot.role} Slot.`,
    );
  }
};

export const assertPlacementMatchesLayout = (
  placement: ComponentPlacement,
  component: Component,
  slot: Slot,
): void => {
  if (
    placement.layoutId !== slot.layoutId ||
    placement.slotId !== slot.id ||
    placement.componentId !== component.id
  ) {
    throw new TypeError(
      "The Component Placement references another Layout object.",
    );
  }
  assertComponentSlotCompatibility(component, slot);
};
