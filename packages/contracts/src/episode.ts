import { z } from "zod";

import { ApiErrorSchema } from "./api-result.ts";
import { ShowDtoSchema, ShowSegmentDtoSchema } from "./show.ts";

export const EPISODES_CREATE_CHANNEL = "showflow:v1:episodes:create" as const;
export const EPISODES_GET_CHANNEL = "showflow:v1:episodes:get" as const;
export const EPISODES_LIST_CHANNEL = "showflow:v1:episodes:list" as const;
export const EPISODES_REORDER_CHANNEL = "showflow:v1:episodes:reorder" as const;
export const EPISODES_DUPLICATE_SEGMENT_CHANNEL =
  "showflow:v1:episodes:duplicate-segment" as const;
export const EPISODES_REMOVE_SEGMENT_CHANNEL =
  "showflow:v1:episodes:remove-segment" as const;
export const EPISODES_INSERT_SEGMENT_CHANNEL =
  "showflow:v1:episodes:insert-segment" as const;
export const EPISODES_CREATE_SEGMENT_CHANNEL =
  "showflow:v1:episodes:create-segment" as const;
export const EPISODES_RESTORE_SEGMENT_CHANNEL =
  "showflow:v1:episodes:restore-segment" as const;

const CanonicalUtcTimestampSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) {
    return false;
  }
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
});
const DateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .refine(
    (value) => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()),
  );
const JsonObjectSchema = z.record(z.string(), z.unknown());

export const FixedResourceReplacementDtoSchema = z
  .object({
    componentPlacementId: z.string().uuid(),
    propertyKey: z.string().min(1),
    resourceId: z.string().uuid(),
  })
  .strict();

export const EpisodeSegmentDtoSchema = z
  .object({
    createdAt: CanonicalUtcTimestampSchema,
    defaultLayoutOverrideId: z.string().uuid().nullable(),
    episodeId: z.string().uuid(),
    expectedDurationOverrideMs: z.number().int().nonnegative().nullable(),
    fieldValues: JsonObjectSchema,
    fixedResourceReplacements: z.array(FixedResourceReplacementDtoSchema),
    id: z.string().uuid(),
    label: z.string().nullable(),
    notes: z.string(),
    position: z.number().int().nonnegative(),
    sourceShowSegmentId: z.string().uuid(),
    updatedAt: CanonicalUtcTimestampSchema,
  })
  .strict();

export const EpisodeDtoSchema = z
  .object({
    createdAt: CanonicalUtcTimestampSchema,
    description: z.string().nullable(),
    episodeNumber: z.number().int().nonnegative().nullable(),
    guestNames: z.array(z.string()),
    id: z.string().uuid(),
    internalNotes: z.string(),
    plannedAt: CanonicalUtcTimestampSchema.nullable(),
    segmentCount: z.number().int().nonnegative(),
    showId: z.string().uuid(),
    sponsorInformation: z.string().nullable(),
    status: z.enum(["draft", "ready"]),
    subtitle: z.string().nullable(),
    title: z.string().min(1).max(200),
    updatedAt: CanonicalUtcTimestampSchema,
  })
  .strict();

export const EpisodeProgressDtoSchema = z
  .object({
    estimatedRuntimeMs: z.number().int().nonnegative(),
    needsContentCount: z.number().int().nonnegative(),
    readyCount: z.number().int().nonnegative(),
    segmentCount: z.number().int().nonnegative(),
  })
  .strict();

export const EpisodeStoryboardItemDtoSchema = z
  .object({
    episodeSegment: EpisodeSegmentDtoSchema,
    expectedDurationMs: z.number().int().nonnegative().nullable(),
    readiness: z.enum(["needs-content", "ready", "has-warnings"]),
    sourceSegment: ShowSegmentDtoSchema,
    summary: z.string().nullable(),
    validationIssueCount: z.number().int().nonnegative(),
  })
  .strict();

export const EpisodeStoryboardDtoSchema = z
  .object({
    episode: EpisodeDtoSchema,
    items: z.array(EpisodeStoryboardItemDtoSchema),
    progress: EpisodeProgressDtoSchema,
    show: ShowDtoSchema,
  })
  .strict();

export const EpisodeSummaryDtoSchema = EpisodeDtoSchema.extend({
  estimatedRuntimeMs: z.number().int().nonnegative(),
}).strict();

export const CreateEpisodeRequestSchema = z
  .object({
    episodeNumber: z.number().int().nonnegative().optional(),
    plannedDate: DateOnlySchema.optional(),
    showId: z.string().uuid(),
    source: z.enum(["blueprint", "blank"]),
    studioId: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
  })
  .strict();

export const GetEpisodeRequestSchema = z
  .object({
    episodeId: z.string().uuid(),
    showId: z.string().uuid(),
    studioId: z.string().uuid(),
  })
  .strict();

export const ListEpisodesRequestSchema = z
  .object({ showId: z.string().uuid(), studioId: z.string().uuid() })
  .strict();

const EpisodeMutationRequestSchema = GetEpisodeRequestSchema;

export const ReorderEpisodeRequestSchema = EpisodeMutationRequestSchema.extend({
  orderedEpisodeSegmentIds: z.array(z.string().uuid()),
}).strict();

export const EpisodeSegmentMutationRequestSchema =
  EpisodeMutationRequestSchema.extend({
    episodeSegmentId: z.string().uuid(),
  }).strict();

export const InsertEpisodeSegmentRequestSchema =
  EpisodeMutationRequestSchema.extend({
    position: z.number().int().nonnegative().optional(),
    showSegmentId: z.string().uuid(),
  }).strict();

export const CreateEpisodeSegmentRequestSchema =
  EpisodeMutationRequestSchema.extend({
    description: z.string().trim().optional(),
    name: z.string().trim().min(1).max(200),
    position: z.number().int().nonnegative().optional(),
  }).strict();

export const RestoreEpisodeSegmentRequestSchema =
  EpisodeMutationRequestSchema.extend({
    segment: EpisodeSegmentDtoSchema,
  }).strict();

export const EpisodeStoryboardResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: EpisodeStoryboardDtoSchema }).strict(),
  z.object({ ok: z.literal(false), error: ApiErrorSchema }).strict(),
]);

export const EpisodeListResultSchema = z.discriminatedUnion("ok", [
  z
    .object({ ok: z.literal(true), data: z.array(EpisodeSummaryDtoSchema) })
    .strict(),
  z.object({ ok: z.literal(false), error: ApiErrorSchema }).strict(),
]);

export type CreateEpisodeRequest = z.infer<typeof CreateEpisodeRequestSchema>;
export type GetEpisodeRequest = z.infer<typeof GetEpisodeRequestSchema>;
export type ListEpisodesRequest = z.infer<typeof ListEpisodesRequestSchema>;
export type ReorderEpisodeRequest = z.infer<typeof ReorderEpisodeRequestSchema>;
export type EpisodeSegmentMutationRequest = z.infer<
  typeof EpisodeSegmentMutationRequestSchema
>;
export type InsertEpisodeSegmentRequest = z.infer<
  typeof InsertEpisodeSegmentRequestSchema
>;
export type CreateEpisodeSegmentRequest = z.infer<
  typeof CreateEpisodeSegmentRequestSchema
>;
export type RestoreEpisodeSegmentRequest = z.infer<
  typeof RestoreEpisodeSegmentRequestSchema
>;
export type EpisodeDto = z.infer<typeof EpisodeDtoSchema>;
export type EpisodeSegmentDto = z.infer<typeof EpisodeSegmentDtoSchema>;
export type EpisodeStoryboardDto = z.infer<typeof EpisodeStoryboardDtoSchema>;
export type EpisodeStoryboardResult = z.infer<
  typeof EpisodeStoryboardResultSchema
>;
export type EpisodeSummaryDto = z.infer<typeof EpisodeSummaryDtoSchema>;
export type EpisodeListResult = z.infer<typeof EpisodeListResultSchema>;
