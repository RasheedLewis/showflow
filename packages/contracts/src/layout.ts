import { z } from "zod";

import { ApiErrorSchema } from "./api-result.ts";

export const LAYOUTS_LIST_CHANNEL = "showflow:v1:layouts:list" as const;
export const LAYOUTS_GET_CHANNEL = "showflow:v1:layouts:get" as const;
export const LAYOUTS_CREATE_CHANNEL = "showflow:v1:layouts:create" as const;
export const LAYOUTS_DUPLICATE_CHANNEL =
  "showflow:v1:layouts:duplicate" as const;
export const LAYOUTS_RENAME_CHANNEL = "showflow:v1:layouts:rename" as const;
export const LAYOUTS_ARCHIVE_CHANNEL = "showflow:v1:layouts:archive" as const;
export const LAYOUTS_UPDATE_CHANNEL = "showflow:v1:layouts:update" as const;

const CanonicalUtcTimestampSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value))
    return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
});

export const CanvasAspectRatioSchema = z.enum(["16:9", "9:16"]);
export const LayoutPresetIdSchema = z.enum([
  "blank",
  "host",
  "hostVideo",
  "fullscreenVideo",
]);
export const SlotRoleSchema = z.enum([
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
export const ComponentTypeSchema = z.enum([
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
const NormalizedValueSchema = z.number().finite().min(0).max(1);
export const NormalizedRectSchema = z
  .object({
    x: NormalizedValueSchema,
    y: NormalizedValueSchema,
    width: NormalizedValueSchema.positive(),
    height: NormalizedValueSchema.positive(),
  })
  .strict()
  .refine(({ x, width }) => x + width <= 1)
  .refine(({ y, height }) => y + height <= 1);
const SafeMarginsSchema = z
  .object({
    top: NormalizedValueSchema,
    right: NormalizedValueSchema,
    bottom: NormalizedValueSchema,
    left: NormalizedValueSchema,
  })
  .strict();

export const SlotDraftDtoSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(200),
    role: SlotRoleSchema,
    bounds: NormalizedRectSchema,
    alignment: z.enum(["start", "center", "end", "stretch"]),
    safeMargins: SafeMarginsSchema,
    layerOrder: z.number().int().nonnegative(),
    clipContent: z.boolean(),
    allowedComponentTypes: z.array(ComponentTypeSchema),
  })
  .strict();

export const SlotDtoSchema = SlotDraftDtoSchema.extend({
  id: z.string().uuid(),
  layoutId: z.string().uuid(),
  createdAt: CanonicalUtcTimestampSchema,
  updatedAt: CanonicalUtcTimestampSchema,
}).strict();

export const LayoutDtoSchema = z
  .object({
    id: z.string().uuid(),
    showId: z.string().uuid(),
    name: z.string().trim().min(1).max(200),
    aspectRatio: CanvasAspectRatioSchema,
    canvas: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .strict(),
    slots: z.array(SlotDtoSchema),
    archivedAt: CanonicalUtcTimestampSchema.nullable(),
    createdAt: CanonicalUtcTimestampSchema,
    updatedAt: CanonicalUtcTimestampSchema,
  })
  .strict();

export const LayoutCatalogItemDtoSchema = z
  .object({
    layout: LayoutDtoSchema,
    usageCount: z.number().int().nonnegative(),
  })
  .strict();

const LayoutScopeSchema = z
  .object({
    studioId: z.string().uuid(),
    showId: z.string().uuid(),
  })
  .strict();
export const ListLayoutsRequestSchema = LayoutScopeSchema;
export const GetLayoutRequestSchema = LayoutScopeSchema.extend({
  layoutId: z.string().uuid(),
}).strict();
export const CreateLayoutRequestSchema = z
  .object({
    context: z.discriminatedUnion("scope", [
      z
        .object({
          scope: z.literal("show"),
          studioId: z.string().uuid(),
          showId: z.string().uuid(),
        })
        .strict(),
      z
        .object({
          scope: z.literal("episode"),
          studioId: z.string().uuid(),
          showId: z.string().uuid(),
          episodeId: z.string().uuid(),
          episodeSegmentId: z.string().uuid(),
        })
        .strict(),
    ]),
    name: z.string().trim().min(1).max(200),
    aspectRatio: CanvasAspectRatioSchema,
    presetId: LayoutPresetIdSchema,
  })
  .strict();
export const LayoutMutationRequestSchema = GetLayoutRequestSchema;
export const RenameLayoutRequestSchema = GetLayoutRequestSchema.extend({
  name: z.string().trim().min(1).max(200),
}).strict();
export const UpdateLayoutRequestSchema = GetLayoutRequestSchema.extend({
  expectedUpdatedAt: CanonicalUtcTimestampSchema,
  name: z.string().trim().min(1).max(200),
  slots: z.array(SlotDraftDtoSchema),
}).strict();

export const LayoutResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: LayoutDtoSchema }).strict(),
  z.object({ ok: z.literal(false), error: ApiErrorSchema }).strict(),
]);
export const LayoutCatalogResultSchema = z.discriminatedUnion("ok", [
  z
    .object({ ok: z.literal(true), data: z.array(LayoutCatalogItemDtoSchema) })
    .strict(),
  z.object({ ok: z.literal(false), error: ApiErrorSchema }).strict(),
]);

export type LayoutDto = z.infer<typeof LayoutDtoSchema>;
export type SlotDto = z.infer<typeof SlotDtoSchema>;
export type SlotDraftDto = z.infer<typeof SlotDraftDtoSchema>;
export type LayoutCatalogItemDto = z.infer<typeof LayoutCatalogItemDtoSchema>;
export type LayoutResult = z.infer<typeof LayoutResultSchema>;
export type LayoutCatalogResult = z.infer<typeof LayoutCatalogResultSchema>;
export type ListLayoutsRequest = z.infer<typeof ListLayoutsRequestSchema>;
export type GetLayoutRequest = z.infer<typeof GetLayoutRequestSchema>;
export type CreateLayoutRequest = z.infer<typeof CreateLayoutRequestSchema>;
export type LayoutMutationRequest = z.infer<typeof LayoutMutationRequestSchema>;
export type RenameLayoutRequest = z.infer<typeof RenameLayoutRequestSchema>;
export type UpdateLayoutRequest = z.infer<typeof UpdateLayoutRequestSchema>;
