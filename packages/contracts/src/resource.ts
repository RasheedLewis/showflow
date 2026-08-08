import { z } from "zod";

import { ApiErrorSchema } from "./api-result.ts";

export const RESOURCES_LIST_CHANNEL = "showflow:v1:resources:list" as const;
export const RESOURCES_IMPORT_CHANNEL = "showflow:v1:resources:import" as const;
export const RESOURCES_IMPORT_PATHS_CHANNEL =
  "showflow:v1:resources:import-paths" as const;
export const RESOURCES_LOCATE_CHANNEL = "showflow:v1:resources:locate" as const;
export const RESOURCES_REPLACE_CHANNEL =
  "showflow:v1:resources:replace" as const;
export const RESOURCES_REMOVE_CHANNEL = "showflow:v1:resources:remove" as const;
export const RESOURCES_RENAME_CHANNEL = "showflow:v1:resources:rename" as const;
export const RESOURCES_UPDATE_METADATA_CHANNEL =
  "showflow:v1:resources:update-metadata" as const;
export const RESOURCES_GET_URL_CHANNEL =
  "showflow:v1:resources:get-url" as const;

const CanonicalUtcTimestampSchema = z.string().datetime({ offset: true });

export const ResourceContextSchema = z.discriminatedUnion("scope", [
  z
    .object({ scope: z.literal("studio"), studioId: z.string().uuid() })
    .strict(),
  z
    .object({
      scope: z.literal("show"),
      showId: z.string().uuid(),
      studioId: z.string().uuid(),
    })
    .strict(),
  z
    .object({
      episodeId: z.string().uuid(),
      scope: z.literal("episode"),
      showId: z.string().uuid(),
      studioId: z.string().uuid(),
    })
    .strict(),
]);

export const ResourceUsageDtoSchema = z
  .object({
    episodeId: z.string().uuid(),
    episodeSegmentId: z.string().uuid(),
    episodeTitle: z.string(),
    fieldKey: z.string(),
    segmentName: z.string(),
    showId: z.string().uuid(),
  })
  .strict();

export const ResourceDtoSchema = z
  .object({
    availability: z.enum([
      "available",
      "missing",
      "unavailable",
      "unsupported",
    ]),
    category: z.enum([
      "image",
      "video",
      "audio",
      "font",
      "cameraInput",
      "microphoneInput",
      "screenCapture",
      "textDocument",
      "structuredData",
      "animatedGraphic",
    ]),
    contentHash: z.string().nullable(),
    createdAt: CanonicalUtcTimestampSchema,
    dimensions: z
      .object({
        height: z.number().int().positive(),
        width: z.number().int().positive(),
      })
      .strict()
      .nullable(),
    displayName: z.string().min(1).max(255),
    durationMs: z.number().int().nonnegative().nullable(),
    fileSizeBytes: z.number().int().nonnegative().nullable(),
    id: z.string().uuid(),
    mimeType: z.string().min(1),
    originalFilename: z.string().nullable(),
    owner: z.discriminatedUnion("scope", [
      z
        .object({ scope: z.literal("studio"), studioId: z.string().uuid() })
        .strict(),
      z
        .object({ scope: z.literal("show"), showId: z.string().uuid() })
        .strict(),
      z
        .object({ scope: z.literal("episode"), episodeId: z.string().uuid() })
        .strict(),
    ]),
    sourceModifiedAt: CanonicalUtcTimestampSchema.nullable(),
    thumbnailCacheKey: z.string().nullable(),
    updatedAt: CanonicalUtcTimestampSchema,
    usage: z.array(ResourceUsageDtoSchema),
  })
  .strict();

export const ListResourcesRequestSchema = z
  .object({ context: ResourceContextSchema })
  .strict();
export const ImportResourcesRequestSchema = ListResourcesRequestSchema;
export const ImportResourcePathsRequestSchema =
  ListResourcesRequestSchema.extend({
    filePaths: z.array(z.string().min(1)).min(1),
  }).strict();
export const RepairResourceRequestSchema = ListResourcesRequestSchema.extend({
  resourceId: z.string().uuid(),
}).strict();
export const RepairResourcePathRequestSchema =
  RepairResourceRequestSchema.extend({
    filePath: z.string().min(1),
  }).strict();
export const RemoveResourceRequestSchema = RepairResourceRequestSchema;
export const RenameResourceRequestSchema = RepairResourceRequestSchema.extend({
  displayName: z.string().trim().min(1).max(255),
}).strict();
export const UpdateResourceMetadataRequestSchema =
  RepairResourceRequestSchema.extend({
    dimensions: z
      .object({
        height: z.number().int().positive(),
        width: z.number().int().positive(),
      })
      .strict()
      .optional(),
    durationMs: z.number().finite().nonnegative().optional(),
    unsupported: z.boolean().optional(),
  }).strict();
export const GetResourceUrlRequestSchema = z
  .object({
    resourceId: z.string().uuid(),
    studioId: z.string().uuid(),
    variant: z.enum(["content", "thumbnail"]),
  })
  .strict();

export const ResourceListResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: z.array(ResourceDtoSchema) }).strict(),
  z.object({ ok: z.literal(false), error: ApiErrorSchema }).strict(),
]);
export const ResourceUrlResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: z.string().url() }).strict(),
  z.object({ ok: z.literal(false), error: ApiErrorSchema }).strict(),
]);

export interface DroppedResourceFile {
  readonly name: string;
}

export type ResourceContext = z.infer<typeof ResourceContextSchema>;
export type ResourceDto = z.infer<typeof ResourceDtoSchema>;
export type ListResourcesRequest = z.infer<typeof ListResourcesRequestSchema>;
export type ImportResourcesRequest = z.infer<
  typeof ImportResourcesRequestSchema
>;
export type ImportResourcePathsRequest = z.infer<
  typeof ImportResourcePathsRequestSchema
>;
export type RepairResourceRequest = z.infer<typeof RepairResourceRequestSchema>;
export type RepairResourcePathRequest = z.infer<
  typeof RepairResourcePathRequestSchema
>;
export type RemoveResourceRequest = z.infer<typeof RemoveResourceRequestSchema>;
export type RenameResourceRequest = z.infer<typeof RenameResourceRequestSchema>;
export type UpdateResourceMetadataRequest = z.infer<
  typeof UpdateResourceMetadataRequestSchema
>;
export type GetResourceUrlRequest = z.infer<typeof GetResourceUrlRequestSchema>;
export type ResourceListResult = z.infer<typeof ResourceListResultSchema>;
export type ResourceUrlResult = z.infer<typeof ResourceUrlResultSchema>;
