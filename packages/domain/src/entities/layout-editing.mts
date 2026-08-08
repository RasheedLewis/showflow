import type {
  ComponentType,
  NormalizedRect,
  SlotAlignment,
  SlotRole,
} from "./composition.mjs";
import { createEntityMetadata } from "./entity-metadata.mjs";
import { createLayout } from "./factories.mjs";
import type {
  CreateLayoutInput,
  DomainFactoryDependencies,
} from "./factories.mjs";
import type { Layout, Slot } from "./layout.mjs";

export const MINIMUM_SLOT_SIZE = 0.02;

export type LayoutPresetId = "blank" | "host" | "hostVideo" | "fullscreenVideo";

export interface SlotDraft {
  readonly id?: Slot["id"];
  readonly name: string;
  readonly role: SlotRole;
  readonly bounds: NormalizedRect;
  readonly alignment: SlotAlignment;
  readonly safeMargins: Slot["safeMargins"];
  readonly layerOrder: number;
  readonly clipContent: boolean;
  readonly allowedComponentTypes: readonly ComponentType[];
}

export interface LayoutPresetSlot {
  readonly name: string;
  readonly role: SlotRole;
  readonly bounds: NormalizedRect;
  readonly allowedComponentTypes: readonly ComponentType[];
  readonly clipContent?: boolean;
}

export interface LayoutPreset {
  readonly id: LayoutPresetId;
  readonly name: string;
  readonly description: string;
  readonly slots: readonly LayoutPresetSlot[];
}

export const LAYOUT_PRESETS: readonly LayoutPreset[] = Object.freeze([
  {
    id: "blank",
    name: "Blank",
    description: "Start with an empty audience frame.",
    slots: [],
  },
  {
    id: "host",
    name: "Host",
    description:
      "A full-frame host composition with background and logo regions.",
    slots: [
      {
        name: "Background",
        role: "background",
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        allowedComponentTypes: ["background", "image", "video"],
        clipContent: true,
      },
      {
        name: "Host camera",
        role: "hostCamera",
        bounds: { x: 0.08, y: 0.08, width: 0.84, height: 0.84 },
        allowedComponentTypes: ["camera"],
        clipContent: true,
      },
      {
        name: "Logo",
        role: "logo",
        bounds: { x: 0.78, y: 0.06, width: 0.16, height: 0.16 },
        allowedComponentTypes: ["logo", "image"],
      },
      {
        name: "Lower third",
        role: "lowerThird",
        bounds: { x: 0.08, y: 0.72, width: 0.52, height: 0.18 },
        allowedComponentTypes: ["lowerThird", "text", "graphic"],
      },
    ],
  },
  {
    id: "hostVideo",
    name: "Host + Video",
    description: "A host region beside a larger featured video region.",
    slots: [
      {
        name: "Background",
        role: "background",
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        allowedComponentTypes: ["background", "image", "video"],
        clipContent: true,
      },
      {
        name: "Host camera",
        role: "hostCamera",
        bounds: { x: 0.05, y: 0.12, width: 0.3, height: 0.76 },
        allowedComponentTypes: ["camera"],
        clipContent: true,
      },
      {
        name: "Main video",
        role: "mainVideo",
        bounds: { x: 0.39, y: 0.08, width: 0.56, height: 0.84 },
        allowedComponentTypes: ["video", "image"],
        clipContent: true,
      },
      {
        name: "Lower third",
        role: "lowerThird",
        bounds: { x: 0.05, y: 0.72, width: 0.3, height: 0.16 },
        allowedComponentTypes: ["lowerThird", "text", "graphic"],
      },
    ],
  },
  {
    id: "fullscreenVideo",
    name: "Fullscreen Video",
    description: "One edge-to-edge video region.",
    slots: [
      {
        name: "Main video",
        role: "mainVideo",
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        allowedComponentTypes: ["video", "image"],
        clipContent: true,
      },
    ],
  },
]);

export const validateNormalizedRect = (bounds: NormalizedRect): void => {
  const values = [bounds.x, bounds.y, bounds.width, bounds.height];
  if (values.some((value) => !Number.isFinite(value))) {
    throw new TypeError("Slot geometry must use finite numbers.");
  }
  if (
    bounds.x < 0 ||
    bounds.y < 0 ||
    bounds.width < MINIMUM_SLOT_SIZE ||
    bounds.height < MINIMUM_SLOT_SIZE ||
    bounds.x + bounds.width > 1 ||
    bounds.y + bounds.height > 1
  ) {
    throw new RangeError(
      "Slots must remain inside the audience frame and meet the minimum size.",
    );
  }
};

export const validateSlotDraft = (draft: SlotDraft): void => {
  const name = draft.name.trim();
  if (name.length === 0 || name.length > 200) {
    throw new TypeError("Slot name must contain between 1 and 200 characters.");
  }
  validateNormalizedRect(draft.bounds);
  if (!Number.isInteger(draft.layerOrder) || draft.layerOrder < 0) {
    throw new RangeError("Slot layer must be a non-negative integer.");
  }
  const margins = Object.values(draft.safeMargins);
  if (
    margins.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
  ) {
    throw new RangeError("Slot safe margins must be normalized values.");
  }
  if (
    new Set(draft.allowedComponentTypes).size !==
    draft.allowedComponentTypes.length
  ) {
    throw new TypeError("Allowed Component categories must be unique.");
  }
};

export const createSlotFromDraft = (
  layoutId: Layout["id"],
  draft: SlotDraft,
  dependencies: DomainFactoryDependencies,
): Slot => {
  validateSlotDraft(draft);
  return {
    id: draft.id ?? dependencies.createId("slot"),
    layoutId,
    name: draft.name.trim(),
    role: draft.role,
    bounds: { ...draft.bounds },
    alignment: draft.alignment,
    safeMargins: { ...draft.safeMargins },
    layerOrder: draft.layerOrder,
    clipContent: draft.clipContent,
    allowedComponentTypes: [...draft.allowedComponentTypes],
    ...createEntityMetadata(dependencies.clock),
  };
};

export const createLayoutFromPreset = (
  input: CreateLayoutInput & { readonly presetId: LayoutPresetId },
  dependencies: DomainFactoryDependencies,
): Layout => {
  const preset = LAYOUT_PRESETS.find(({ id }) => id === input.presetId);
  if (preset === undefined)
    throw new TypeError("Layout preset is not available.");
  const layout = createLayout(input, dependencies);
  return {
    ...layout,
    slots: preset.slots.map((slot, layerOrder) =>
      createSlotFromDraft(
        layout.id,
        {
          ...slot,
          alignment: "stretch",
          safeMargins: { top: 0, right: 0, bottom: 0, left: 0 },
          layerOrder,
          clipContent: slot.clipContent ?? false,
        },
        dependencies,
      ),
    ),
  };
};
