import { z } from "zod";

import { ApiErrorSchema } from "./api-result.ts";

export const SHOWS_CREATE_CHANNEL = "showflow:v1:shows:create" as const;
export const SHOWS_GET_DESIGN_CHANNEL = "showflow:v1:shows:get-design" as const;
export const SHOWS_LIST_CHANNEL = "showflow:v1:shows:list" as const;
export const SHOWS_RENAME_CHANNEL = "showflow:v1:shows:rename" as const;
export const SHOWS_ARCHIVE_CHANNEL = "showflow:v1:shows:archive" as const;
export const SHOWS_DELETE_CHANNEL = "showflow:v1:shows:delete" as const;
export const SEGMENTS_CREATE_CHANNEL = "showflow:v1:segments:create" as const;
export const SEGMENTS_ARCHIVE_CHANNEL = "showflow:v1:segments:archive" as const;
export const BLUEPRINTS_ADD_SEGMENT_CHANNEL =
  "showflow:v1:blueprints:add-segment" as const;
export const BLUEPRINTS_REORDER_CHANNEL =
  "showflow:v1:blueprints:reorder" as const;
export const BLUEPRINTS_DUPLICATE_CHANNEL =
  "showflow:v1:blueprints:duplicate" as const;
export const BLUEPRINTS_REMOVE_CHANNEL =
  "showflow:v1:blueprints:remove" as const;

const CanonicalUtcTimestampSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) {
    return false;
  }
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
});

export const ShowDtoSchema = z
  .object({
    archivedAt: CanonicalUtcTimestampSchema.nullable(),
    createdAt: CanonicalUtcTimestampSchema,
    description: z.string().nullable(),
    id: z.string().uuid(),
    name: z
      .string()
      .max(200)
      .refine((value) => value.trim().length > 0),
    studioId: z.string().uuid(),
    thumbnailResourceId: z.string().uuid().nullable(),
    updatedAt: CanonicalUtcTimestampSchema,
  })
  .strict();

export const ShowSegmentDtoSchema = z
  .object({
    archivedAt: CanonicalUtcTimestampSchema.nullable(),
    createdAt: CanonicalUtcTimestampSchema,
    description: z.string().nullable(),
    expectedDurationMs: z.number().int().nonnegative().nullable(),
    id: z.string().uuid(),
    name: z.string().min(1).max(200),
    showId: z.string().uuid(),
    updatedAt: CanonicalUtcTimestampSchema,
  })
  .strict();

const JsonObjectSchema = z.record(z.string(), z.unknown());

export const BlueprintPlacementDtoSchema = z
  .object({
    createdAt: CanonicalUtcTimestampSchema,
    defaultData: JsonObjectSchema,
    defaultDurationMs: z.number().int().nonnegative().nullable(),
    id: z.string().uuid(),
    label: z.string().nullable(),
    placementOverrides: JsonObjectSchema.nullable(),
    position: z.number().int().nonnegative(),
    showBlueprintId: z.string().uuid(),
    showSegmentId: z.string().uuid(),
    updatedAt: CanonicalUtcTimestampSchema,
  })
  .strict();

export const ShowBlueprintDtoSchema = z
  .object({
    createdAt: CanonicalUtcTimestampSchema,
    id: z.string().uuid(),
    placementCount: z.number().int().nonnegative(),
    placements: z.array(BlueprintPlacementDtoSchema),
    showId: z.string().uuid(),
    updatedAt: CanonicalUtcTimestampSchema,
  })
  .strict();

export const SegmentCatalogItemDtoSchema = z
  .object({
    blueprintUsageCount: z.number().int().nonnegative(),
    segment: ShowSegmentDtoSchema,
  })
  .strict();

export const ShowDesignDtoSchema = z
  .object({
    blueprint: ShowBlueprintDtoSchema,
    segments: z.array(SegmentCatalogItemDtoSchema),
    show: ShowDtoSchema,
  })
  .strict();

export const CreateShowRequestSchema = z
  .object({
    description: z.string().trim().optional(),
    name: z.string().trim().min(1).max(200),
    studioId: z.string().uuid(),
  })
  .strict();

export const GetShowDesignRequestSchema = z
  .object({
    showId: z.string().uuid(),
    studioId: z.string().uuid(),
  })
  .strict();

export const ListShowsRequestSchema = z
  .object({ studioId: z.string().uuid() })
  .strict();

export const RenameShowRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    showId: z.string().uuid(),
    studioId: z.string().uuid(),
  })
  .strict();

export const ShowMutationRequestSchema = z
  .object({
    showId: z.string().uuid(),
    studioId: z.string().uuid(),
  })
  .strict();

const DesignShowMutationRequestSchema = z
  .object({
    blueprintId: z.string().uuid(),
    showId: z.string().uuid(),
    studioId: z.string().uuid(),
  })
  .strict();

export const CreateSegmentRequestSchema = z
  .object({
    blueprintId: z.string().uuid().optional(),
    description: z.string().trim().optional(),
    name: z.string().trim().min(1).max(200),
    position: z.number().int().nonnegative().optional(),
    showId: z.string().uuid(),
    studioId: z.string().uuid(),
  })
  .strict()
  .refine(
    (value) => value.position === undefined || value.blueprintId !== undefined,
    { message: "A Blueprint is required for an insertion position." },
  );

export const ArchiveSegmentRequestSchema = z
  .object({
    showId: z.string().uuid(),
    showSegmentId: z.string().uuid(),
    studioId: z.string().uuid(),
  })
  .strict();

export const AddBlueprintSegmentRequestSchema =
  DesignShowMutationRequestSchema.extend({
    position: z.number().int().nonnegative().optional(),
    showSegmentId: z.string().uuid(),
  }).strict();

export const ReorderBlueprintRequestSchema =
  DesignShowMutationRequestSchema.extend({
    orderedPlacementIds: z.array(z.string().uuid()),
  }).strict();

export const BlueprintPlacementMutationRequestSchema =
  DesignShowMutationRequestSchema.extend({
    placementId: z.string().uuid(),
  }).strict();

export const ShowCardDtoSchema = z
  .object({
    episodeCount: z.number().int().nonnegative(),
    show: ShowDtoSchema,
  })
  .strict();

export const ShowResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: ShowDtoSchema }).strict(),
  z.object({ ok: z.literal(false), error: ApiErrorSchema }).strict(),
]);

export const ShowListResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: z.array(ShowCardDtoSchema) }).strict(),
  z.object({ ok: z.literal(false), error: ApiErrorSchema }).strict(),
]);

export const ShowDeleteResultSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      data: z.object({ showId: z.string().uuid() }).strict(),
    })
    .strict(),
  z.object({ ok: z.literal(false), error: ApiErrorSchema }).strict(),
]);

export const ShowDesignResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: ShowDesignDtoSchema }).strict(),
  z.object({ ok: z.literal(false), error: ApiErrorSchema }).strict(),
]);

export type CreateShowRequest = z.infer<typeof CreateShowRequestSchema>;
export type GetShowDesignRequest = z.infer<typeof GetShowDesignRequestSchema>;
export type ListShowsRequest = z.infer<typeof ListShowsRequestSchema>;
export type RenameShowRequest = z.infer<typeof RenameShowRequestSchema>;
export type ShowMutationRequest = z.infer<typeof ShowMutationRequestSchema>;
export type ShowCardDto = z.infer<typeof ShowCardDtoSchema>;
export type ShowDeleteResult = z.infer<typeof ShowDeleteResultSchema>;
export type ShowListResult = z.infer<typeof ShowListResultSchema>;
export type ShowResult = z.infer<typeof ShowResultSchema>;
export type ShowBlueprintDto = z.infer<typeof ShowBlueprintDtoSchema>;
export type ShowDesignDto = z.infer<typeof ShowDesignDtoSchema>;
export type ShowDesignResult = z.infer<typeof ShowDesignResultSchema>;
export type ShowDto = z.infer<typeof ShowDtoSchema>;
export type ShowSegmentDto = z.infer<typeof ShowSegmentDtoSchema>;
export type BlueprintPlacementDto = z.infer<typeof BlueprintPlacementDtoSchema>;
export type SegmentCatalogItemDto = z.infer<typeof SegmentCatalogItemDtoSchema>;
export type CreateSegmentRequest = z.infer<typeof CreateSegmentRequestSchema>;
export type ArchiveSegmentRequest = z.infer<typeof ArchiveSegmentRequestSchema>;
export type AddBlueprintSegmentRequest = z.infer<
  typeof AddBlueprintSegmentRequestSchema
>;
export type ReorderBlueprintRequest = z.infer<
  typeof ReorderBlueprintRequestSchema
>;
export type BlueprintPlacementMutationRequest = z.infer<
  typeof BlueprintPlacementMutationRequestSchema
>;
