import { z } from "zod";

import {
  parseEntityId,
  parseUtcTimestamp,
  MINIMUM_SLOT_SIZE,
  type Layout,
  type ComponentPlacement,
  type Binding,
  type JsonObject,
  type Slot,
} from "@showflow/domain";

import type { DatabaseExecutor } from "../database/database-service.mjs";

export class StoredLayoutError extends Error {
  override readonly name = "StoredLayoutError";
  readonly code = "STORED_LAYOUT_INVALID" as const;

  constructor(cause: unknown) {
    super("Stored Layout data is invalid.", { cause });
  }
}

const CanvasAspectRatioSchema = z.enum(["16:9", "9:16"]);
const SlotAlignmentSchema = z.enum(["start", "center", "end", "stretch"]);
const SlotRoleSchema = z.enum([
  "background",
  "hostCamera",
  "guestCamera",
  "mainVideo",
  "pictureInPicture",
  "logo",
  "lowerThird",
  "banner",
  "chat",
  "center",
  "topCenter",
  "bottomCenter",
  "upperLeft",
  "upperRight",
  "lowerLeft",
  "lowerRight",
]);
const ComponentTypeSchema = z.enum([
  "camera",
  "video",
  "image",
  "text",
  "graphic",
  "logo",
  "background",
  "lowerThird",
  "timer",
  "countdown",
  "audioIndicator",
]);
const AllowedComponentTypesSchema = z
  .array(ComponentTypeSchema)
  .refine((values) => new Set(values).size === values.length);
const AnimationSchema = z
  .object({
    preset: z.enum([
      "none",
      "fade",
      "slideUp",
      "slideDown",
      "slideLeft",
      "slideRight",
      "scaleIn",
      "scaleOut",
      "pop",
      "wipe",
    ]),
    durationMs: z.number().int().nonnegative(),
    delayMs: z.number().int().nonnegative(),
    easing: z.string().min(1),
  })
  .strict();
const BindingSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("literal"), value: z.json() }).strict(),
  z.object({ kind: z.literal("resource"), resourceId: z.string() }).strict(),
  z
    .object({ kind: z.literal("segmentField"), fieldKey: z.string().min(1) })
    .strict(),
  z
    .object({ kind: z.literal("episodeMetadata"), field: z.string().min(1) })
    .strict(),
  z
    .object({ kind: z.literal("showMetadata"), field: z.string().min(1) })
    .strict(),
]);
const PlacementRowSchema = z
  .object({
    id: z.string(),
    layoutId: z.string(),
    componentId: z.string(),
    slotId: z.string(),
    fixedPropertiesJson: z.string(),
    bindingsJson: z.string(),
    visibleByDefault: z.union([z.literal(0), z.literal(1)]),
    layerOverride: z.number().int().nonnegative().nullable(),
    enterAnimationOverrideJson: z.string().nullable(),
    exitAnimationOverrideJson: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

const LayoutRowSchema = z
  .object({
    archivedAt: z.string().nullable(),
    aspectRatio: CanvasAspectRatioSchema,
    canvasHeight: z.number().int().positive(),
    canvasWidth: z.number().int().positive(),
    createdAt: z.string(),
    id: z.string(),
    name: z
      .string()
      .max(200)
      .refine((value) => value.trim().length > 0),
    showId: z.string(),
    updatedAt: z.string(),
  })
  .strict();

const SlotRowSchema = z
  .object({
    alignment: SlotAlignmentSchema,
    allowedComponentTypesJson: z.string(),
    clipContent: z.union([z.literal(0), z.literal(1)]),
    createdAt: z.string(),
    height: z.number().min(MINIMUM_SLOT_SIZE).max(1),
    id: z.string(),
    layerOrder: z.number().int().nonnegative(),
    layoutId: z.string(),
    name: z
      .string()
      .max(200)
      .refine((value) => value.trim().length > 0),
    role: SlotRoleSchema,
    safeMarginBottom: z.number().min(0).max(1),
    safeMarginLeft: z.number().min(0).max(1),
    safeMarginRight: z.number().min(0).max(1),
    safeMarginTop: z.number().min(0).max(1),
    updatedAt: z.string(),
    width: z.number().min(MINIMUM_SLOT_SIZE).max(1),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  })
  .strict()
  .refine((row) => row.x + row.width <= 1)
  .refine((row) => row.y + row.height <= 1);

const parseLayoutRow = (value: unknown): Layout => {
  try {
    const row = LayoutRowSchema.parse(value);
    const createdAt = parseUtcTimestamp(row.createdAt);
    const updatedAt = parseUtcTimestamp(row.updatedAt);
    if (updatedAt < createdAt) {
      throw new RangeError("Invalid Layout timestamps.");
    }
    const archivedAt =
      row.archivedAt === null ? null : parseUtcTimestamp(row.archivedAt);
    if (archivedAt !== null && archivedAt < createdAt) {
      throw new RangeError("Invalid Layout archive timestamp.");
    }
    const expectedRatio =
      row.aspectRatio === "16:9"
        ? row.canvasWidth * 9 === row.canvasHeight * 16
        : row.canvasWidth * 16 === row.canvasHeight * 9;
    if (!expectedRatio) {
      throw new RangeError("Layout canvas dimensions do not match its ratio.");
    }

    return {
      id: parseEntityId<"layout">(row.id),
      showId: parseEntityId<"show">(row.showId),
      name: row.name,
      aspectRatio: row.aspectRatio,
      canvas: { width: row.canvasWidth, height: row.canvasHeight },
      slots: [],
      componentPlacements: [],
      ...(archivedAt === null ? {} : { archivedAt }),
      createdAt,
      updatedAt,
    };
  } catch (error) {
    throw new StoredLayoutError(error);
  }
};

const parseSlotRow = (value: unknown): Slot => {
  try {
    const row = SlotRowSchema.parse(value);
    const createdAt = parseUtcTimestamp(row.createdAt);
    const updatedAt = parseUtcTimestamp(row.updatedAt);
    if (updatedAt < createdAt) {
      throw new RangeError("Invalid Slot timestamps.");
    }
    const allowedComponentTypes = AllowedComponentTypesSchema.parse(
      JSON.parse(row.allowedComponentTypesJson) as unknown,
    );

    return {
      id: parseEntityId<"slot">(row.id),
      layoutId: parseEntityId<"layout">(row.layoutId),
      name: row.name,
      role: row.role,
      bounds: {
        x: row.x,
        y: row.y,
        width: row.width,
        height: row.height,
      },
      alignment: row.alignment,
      safeMargins: {
        top: row.safeMarginTop,
        right: row.safeMarginRight,
        bottom: row.safeMarginBottom,
        left: row.safeMarginLeft,
      },
      layerOrder: row.layerOrder,
      clipContent: row.clipContent === 1,
      allowedComponentTypes,
      createdAt,
      updatedAt,
    };
  } catch (error) {
    throw new StoredLayoutError(error);
  }
};

const parsePlacementRow = (value: unknown): ComponentPlacement => {
  try {
    const row = PlacementRowSchema.parse(value);
    const createdAt = parseUtcTimestamp(row.createdAt);
    const updatedAt = parseUtcTimestamp(row.updatedAt);
    if (updatedAt < createdAt)
      throw new RangeError("Invalid Component Placement timestamps.");
    const fixedProperties = z
      .record(z.string(), z.json())
      .parse(JSON.parse(row.fixedPropertiesJson) as unknown) as JsonObject;
    const storedBindings = z
      .record(z.string(), BindingSchema)
      .parse(JSON.parse(row.bindingsJson) as unknown);
    const bindings: Readonly<Record<string, Binding>> = Object.fromEntries(
      Object.entries(storedBindings).map(([key, binding]) => {
        if (binding.kind === "resource")
          return [
            key,
            {
              kind: binding.kind,
              resourceId: parseEntityId<"resource">(binding.resourceId),
            },
          ];
        return [key, binding];
      }),
    ) as Readonly<Record<string, Binding>>;
    return {
      id: parseEntityId<"componentPlacement">(row.id),
      layoutId: parseEntityId<"layout">(row.layoutId),
      componentId: parseEntityId<"component">(row.componentId),
      slotId: parseEntityId<"slot">(row.slotId),
      fixedProperties,
      bindings,
      visibleByDefault: row.visibleByDefault === 1,
      ...(row.layerOverride === null
        ? {}
        : { layerOverride: row.layerOverride }),
      ...(row.enterAnimationOverrideJson === null
        ? {}
        : {
            enterAnimationOverride: AnimationSchema.parse(
              JSON.parse(row.enterAnimationOverrideJson) as unknown,
            ),
          }),
      ...(row.exitAnimationOverrideJson === null
        ? {}
        : {
            exitAnimationOverride: AnimationSchema.parse(
              JSON.parse(row.exitAnimationOverrideJson) as unknown,
            ),
          }),
      createdAt,
      updatedAt,
    };
  } catch (error) {
    throw new StoredLayoutError(error);
  }
};

export const LayoutRowParser = { parse: parseLayoutRow };
export const SlotRowParser = { parse: parseSlotRow };
export const ComponentPlacementRowParser = { parse: parsePlacementRow };

export const LAYOUT_COLUMNS = `
  id,
  show_id AS showId,
  name,
  aspect_ratio AS aspectRatio,
  canvas_width AS canvasWidth,
  canvas_height AS canvasHeight,
  archived_at AS archivedAt,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

export const SLOT_COLUMNS = `
  id,
  layout_id AS layoutId,
  name,
  role,
  x,
  y,
  width,
  height,
  alignment,
  safe_margin_top AS safeMarginTop,
  safe_margin_right AS safeMarginRight,
  safe_margin_bottom AS safeMarginBottom,
  safe_margin_left AS safeMarginLeft,
  layer_order AS layerOrder,
  clip_content AS clipContent,
  allowed_component_types_json AS allowedComponentTypesJson,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

export const COMPONENT_PLACEMENT_COLUMNS = `
  id,
  layout_id AS layoutId,
  component_id AS componentId,
  slot_id AS slotId,
  fixed_properties_json AS fixedPropertiesJson,
  bindings_json AS bindingsJson,
  visible_by_default AS visibleByDefault,
  layer_override AS layerOverride,
  enter_animation_override_json AS enterAnimationOverrideJson,
  exit_animation_override_json AS exitAnimationOverrideJson,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

export const readLayoutDetails = (
  database: DatabaseExecutor,
  layout: Layout,
): Layout => {
  const slots = database.queryAll(
    `SELECT ${SLOT_COLUMNS}
     FROM slots
     WHERE layout_id = ?
     ORDER BY layer_order, id`,
    SlotRowParser,
    [layout.id],
  );
  const componentPlacements = database.queryAll(
    `SELECT ${COMPONENT_PLACEMENT_COLUMNS}
     FROM component_placements
     WHERE layout_id = ?
     ORDER BY COALESCE(layer_override, 2147483647), id`,
    ComponentPlacementRowParser,
    [layout.id],
  );
  return { ...layout, slots, componentPlacements };
};

const validateSlotForLayout = (slot: Slot, layoutId: Layout["id"]): Slot => {
  if (slot.layoutId !== layoutId) {
    throw new StoredLayoutError(
      new Error("A Slot must belong to the Layout being saved."),
    );
  }

  return parseSlotRow({
    alignment: slot.alignment,
    allowedComponentTypesJson: JSON.stringify(slot.allowedComponentTypes),
    clipContent: slot.clipContent ? 1 : 0,
    createdAt: slot.createdAt,
    height: slot.bounds.height,
    id: slot.id,
    layerOrder: slot.layerOrder,
    layoutId: slot.layoutId,
    name: slot.name,
    role: slot.role,
    safeMarginBottom: slot.safeMargins.bottom,
    safeMarginLeft: slot.safeMargins.left,
    safeMarginRight: slot.safeMargins.right,
    safeMarginTop: slot.safeMargins.top,
    updatedAt: slot.updatedAt,
    width: slot.bounds.width,
    x: slot.bounds.x,
    y: slot.bounds.y,
  });
};

const writeSlot = (database: DatabaseExecutor, slot: Slot): void => {
  database.run(
    `INSERT INTO slots (
       id, layout_id, name, role, x, y, width, height, alignment,
       safe_margin_top, safe_margin_right, safe_margin_bottom, safe_margin_left,
       layer_order, clip_content, allowed_component_types_json,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       layout_id = excluded.layout_id,
       name = excluded.name,
       role = excluded.role,
       x = excluded.x,
       y = excluded.y,
       width = excluded.width,
       height = excluded.height,
       alignment = excluded.alignment,
       safe_margin_top = excluded.safe_margin_top,
       safe_margin_right = excluded.safe_margin_right,
       safe_margin_bottom = excluded.safe_margin_bottom,
       safe_margin_left = excluded.safe_margin_left,
       layer_order = excluded.layer_order,
       clip_content = excluded.clip_content,
       allowed_component_types_json = excluded.allowed_component_types_json,
       updated_at = excluded.updated_at`,
    [
      slot.id,
      slot.layoutId,
      slot.name,
      slot.role,
      slot.bounds.x,
      slot.bounds.y,
      slot.bounds.width,
      slot.bounds.height,
      slot.alignment,
      slot.safeMargins.top,
      slot.safeMargins.right,
      slot.safeMargins.bottom,
      slot.safeMargins.left,
      slot.layerOrder,
      slot.clipContent ? 1 : 0,
      JSON.stringify(slot.allowedComponentTypes),
      slot.createdAt,
      slot.updatedAt,
    ],
  );
};

const writePlacement = (
  database: DatabaseExecutor,
  placement: ComponentPlacement,
): void => {
  const valid = parsePlacementRow({
    id: placement.id,
    layoutId: placement.layoutId,
    componentId: placement.componentId,
    slotId: placement.slotId,
    fixedPropertiesJson: JSON.stringify(placement.fixedProperties),
    bindingsJson: JSON.stringify(placement.bindings),
    visibleByDefault: placement.visibleByDefault ? 1 : 0,
    layerOverride: placement.layerOverride ?? null,
    enterAnimationOverrideJson:
      placement.enterAnimationOverride === undefined
        ? null
        : JSON.stringify(placement.enterAnimationOverride),
    exitAnimationOverrideJson:
      placement.exitAnimationOverride === undefined
        ? null
        : JSON.stringify(placement.exitAnimationOverride),
    createdAt: placement.createdAt,
    updatedAt: placement.updatedAt,
  });
  database.run(
    `INSERT INTO component_placements (
       id, layout_id, component_id, slot_id, fixed_properties_json,
       bindings_json, visible_by_default, layer_override,
       enter_animation_override_json, exit_animation_override_json,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       layout_id = excluded.layout_id,
       component_id = excluded.component_id,
       slot_id = excluded.slot_id,
       fixed_properties_json = excluded.fixed_properties_json,
       bindings_json = excluded.bindings_json,
       visible_by_default = excluded.visible_by_default,
       layer_override = excluded.layer_override,
       enter_animation_override_json = excluded.enter_animation_override_json,
       exit_animation_override_json = excluded.exit_animation_override_json,
       updated_at = excluded.updated_at`,
    [
      valid.id,
      valid.layoutId,
      valid.componentId,
      valid.slotId,
      JSON.stringify(valid.fixedProperties),
      JSON.stringify(valid.bindings),
      valid.visibleByDefault ? 1 : 0,
      valid.layerOverride ?? null,
      valid.enterAnimationOverride === undefined
        ? null
        : JSON.stringify(valid.enterAnimationOverride),
      valid.exitAnimationOverride === undefined
        ? null
        : JSON.stringify(valid.exitAnimationOverride),
      valid.createdAt,
      valid.updatedAt,
    ],
  );
};

export const writeLayout = (
  database: DatabaseExecutor,
  layout: Layout,
): void => {
  const validLayout = parseLayoutRow({
    archivedAt: layout.archivedAt ?? null,
    aspectRatio: layout.aspectRatio,
    canvasHeight: layout.canvas.height,
    canvasWidth: layout.canvas.width,
    createdAt: layout.createdAt,
    id: layout.id,
    name: layout.name,
    showId: layout.showId,
    updatedAt: layout.updatedAt,
  });
  const validSlots = layout.slots.map((slot) =>
    validateSlotForLayout(slot, validLayout.id),
  );

  database.run(
    `INSERT INTO layouts (
       id, show_id, name, aspect_ratio, canvas_width, canvas_height,
       archived_at, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       show_id = excluded.show_id,
       name = excluded.name,
       aspect_ratio = excluded.aspect_ratio,
       canvas_width = excluded.canvas_width,
       canvas_height = excluded.canvas_height,
       archived_at = excluded.archived_at,
       updated_at = excluded.updated_at`,
    [
      validLayout.id,
      validLayout.showId,
      validLayout.name,
      validLayout.aspectRatio,
      validLayout.canvas.width,
      validLayout.canvas.height,
      validLayout.archivedAt ?? null,
      validLayout.createdAt,
      validLayout.updatedAt,
    ],
  );
  const slotIds = new Set(validSlots.map(({ id }) => id));
  const storedSlotIds = database.queryAll(
    "SELECT id FROM slots WHERE layout_id = ?",
    { parse: (value: unknown) => z.object({ id: z.string() }).parse(value) },
    [validLayout.id],
  );
  for (const { id } of storedSlotIds) {
    if (!slotIds.has(id as Slot["id"]))
      database.run("DELETE FROM slots WHERE id = ?", [id]);
  }
  for (const slot of validSlots) {
    writeSlot(database, slot);
  }
  const placementIds = new Set(layout.componentPlacements.map(({ id }) => id));
  const storedPlacementIds = database.queryAll(
    "SELECT id FROM component_placements WHERE layout_id = ?",
    { parse: (value: unknown) => z.object({ id: z.string() }).parse(value) },
    [validLayout.id],
  );
  for (const { id } of storedPlacementIds) {
    if (!placementIds.has(id as ComponentPlacement["id"]))
      database.run("DELETE FROM component_placements WHERE id = ?", [id]);
  }
  for (const placement of layout.componentPlacements) {
    if (
      placement.layoutId !== validLayout.id ||
      !slotIds.has(placement.slotId)
    ) {
      throw new StoredLayoutError(
        new Error("A Component Placement must reference a Slot in its Layout."),
      );
    }
    writePlacement(database, placement);
  }
};
