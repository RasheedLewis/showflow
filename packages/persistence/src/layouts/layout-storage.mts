import { z } from "zod";

import {
  parseEntityId,
  parseUtcTimestamp,
  MINIMUM_SLOT_SIZE,
  type Layout,
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

export const LayoutRowParser = { parse: parseLayoutRow };
export const SlotRowParser = { parse: parseSlotRow };

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

export const readLayoutDetails = (
  database: DatabaseExecutor,
  layout: Layout,
): Layout => ({
  ...layout,
  slots: database.queryAll(
    `SELECT ${SLOT_COLUMNS}
     FROM slots
     WHERE layout_id = ?
     ORDER BY layer_order, id`,
    SlotRowParser,
    [layout.id],
  ),
});

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
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

export const writeLayout = (
  database: DatabaseExecutor,
  layout: Layout,
): void => {
  if (layout.componentPlacements.length > 0) {
    throw new StoredLayoutError(
      new Error(
        "Component Placements are not supported by this schema version.",
      ),
    );
  }

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
  database.run("DELETE FROM slots WHERE layout_id = ?", [validLayout.id]);
  for (const slot of validSlots) {
    writeSlot(database, slot);
  }
};
