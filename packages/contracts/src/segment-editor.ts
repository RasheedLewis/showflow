import { z } from "zod";

import { ApiErrorSchema } from "./api-result.ts";

export const SEGMENTS_GET_EDITOR_CHANNEL =
  "showflow:v1:segments:get-editor" as const;
export const SEGMENTS_UPDATE_DETAILS_CHANNEL =
  "showflow:v1:segments:update-details" as const;
export const SEGMENTS_CREATE_FIELD_CHANNEL =
  "showflow:v1:segments:create-field" as const;
export const SEGMENTS_UPDATE_FIELD_CHANNEL =
  "showflow:v1:segments:update-field" as const;
export const SEGMENTS_DELETE_FIELD_CHANNEL =
  "showflow:v1:segments:delete-field" as const;
export const SEGMENTS_RESTORE_FIELD_CHANNEL =
  "showflow:v1:segments:restore-field" as const;
export const SEGMENTS_REORDER_FIELDS_CHANNEL =
  "showflow:v1:segments:reorder-fields" as const;

const CanonicalUtcTimestampSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) {
    return false;
  }
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
});

export const SegmentDataFieldTypeSchema = z.enum([
  "shortText",
  "longText",
  "number",
  "imageResource",
  "videoResource",
  "audioResource",
  "boolean",
]);

export const SegmentDataFieldDtoSchema = z
  .object({
    createdAt: CanonicalUtcTimestampSchema,
    defaultValue: z.json().nullable(),
    episodeValueUsageCount: z.number().int().nonnegative(),
    helpText: z.string().nullable(),
    id: z.string().uuid(),
    key: z.string().regex(/^[a-z][A-Za-z0-9]*$/u),
    label: z.string().trim().min(1).max(100),
    position: z.number().int().nonnegative(),
    required: z.boolean(),
    showSegmentId: z.string().uuid(),
    type: SegmentDataFieldTypeSchema,
    updatedAt: CanonicalUtcTimestampSchema,
  })
  .strict();

const LifecycleActionSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("preloadResource"),
      resourceId: z.string().uuid(),
    })
    .strict(),
  z
    .object({ kind: z.literal("activateLayout"), layoutId: z.string().uuid() })
    .strict(),
  z
    .object({ kind: z.literal("playSound"), resourceId: z.string().uuid() })
    .strict(),
  z
    .object({ kind: z.literal("startMedia"), resourceId: z.string().uuid() })
    .strict(),
  z
    .object({ kind: z.literal("stopMedia"), resourceId: z.string().uuid() })
    .strict(),
  z.object({ kind: z.literal("waitForAnimationCompletion") }).strict(),
  z
    .object({
      kind: z.literal("waitForMediaCompletion"),
      resourceId: z.string().uuid().optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("setActiveDefaults"),
      layoutId: z.string().uuid(),
    })
    .strict(),
  z.object({ kind: z.literal("clearTemporaryState") }).strict(),
]);

const SegmentLifecycleDtoSchema = z
  .object({
    active: z
      .object({
        availableLayoutIds: z.array(z.string().uuid()),
        defaultLayoutId: z.string().uuid().nullable(),
        hostCueIds: z.array(z.string().uuid()),
      })
      .strict(),
    cleanup: z.array(LifecycleActionSchema),
    enter: z.array(LifecycleActionSchema),
    exit: z.array(LifecycleActionSchema),
    prepare: z.array(LifecycleActionSchema),
  })
  .strict();

const SegmentValidationIssueDtoSchema = z
  .object({
    code: z.enum([
      "SEGMENT_NAME_REQUIRED",
      "SEGMENT_FIELD_KEY_DUPLICATE",
      "SEGMENT_FIELD_DEFAULT_INVALID",
      "SEGMENT_DURATION_NEGATIVE",
    ]),
    fieldId: z.string().uuid().nullable(),
    message: z.string().min(1),
  })
  .strict();

export const ShowSegmentEditorDtoSchema = z
  .object({
    archivedAt: CanonicalUtcTimestampSchema.nullable(),
    createdAt: CanonicalUtcTimestampSchema,
    dataFields: z.array(SegmentDataFieldDtoSchema),
    description: z.string().nullable(),
    expectedDurationMs: z.number().int().nonnegative().nullable(),
    id: z.string().uuid(),
    lifecycle: SegmentLifecycleDtoSchema,
    name: z.string().trim().min(1).max(200),
    notesTemplate: z.string(),
    showId: z.string().uuid(),
    updatedAt: CanonicalUtcTimestampSchema,
    validationIssues: z.array(SegmentValidationIssueDtoSchema),
  })
  .strict();

export const GetSegmentEditorRequestSchema = z
  .object({
    showId: z.string().uuid(),
    showSegmentId: z.string().uuid(),
    studioId: z.string().uuid(),
  })
  .strict();

const SegmentMutationScopeSchema = GetSegmentEditorRequestSchema.extend({
  expectedUpdatedAt: CanonicalUtcTimestampSchema,
}).strict();

export const UpdateSegmentDetailsRequestSchema =
  SegmentMutationScopeSchema.extend({
    expectedDurationMs: z.number().nonnegative().nullable(),
    name: z.string().trim().min(1).max(200),
    notesTemplate: z.string(),
  }).strict();

export const CreateSegmentFieldRequestSchema =
  SegmentMutationScopeSchema.extend({
    label: z.string().trim().min(1).max(100),
    type: SegmentDataFieldTypeSchema,
  }).strict();

export const UpdateSegmentFieldRequestSchema =
  SegmentMutationScopeSchema.extend({
    defaultValue: z.json().nullable(),
    fieldId: z.string().uuid(),
    helpText: z.string().nullable(),
    label: z.string().trim().min(1).max(100),
    required: z.boolean(),
    type: SegmentDataFieldTypeSchema,
  }).strict();

export const DeleteSegmentFieldRequestSchema =
  SegmentMutationScopeSchema.extend({ fieldId: z.string().uuid() }).strict();

export const RestoreSegmentFieldRequestSchema =
  SegmentMutationScopeSchema.extend({
    field: SegmentDataFieldDtoSchema.omit({ episodeValueUsageCount: true }),
  }).strict();

export const ReorderSegmentFieldsRequestSchema =
  SegmentMutationScopeSchema.extend({
    orderedFieldIds: z.array(z.string().uuid()),
  }).strict();

export const ShowSegmentEditorResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: ShowSegmentEditorDtoSchema }).strict(),
  z.object({ ok: z.literal(false), error: ApiErrorSchema }).strict(),
]);

export type SegmentDataFieldTypeDto = z.infer<
  typeof SegmentDataFieldTypeSchema
>;
export type SegmentDataFieldDto = z.infer<typeof SegmentDataFieldDtoSchema>;
export type ShowSegmentEditorDto = z.infer<typeof ShowSegmentEditorDtoSchema>;
export type ShowSegmentEditorResult = z.infer<
  typeof ShowSegmentEditorResultSchema
>;
export type GetSegmentEditorRequest = z.infer<
  typeof GetSegmentEditorRequestSchema
>;
export type UpdateSegmentDetailsRequest = z.infer<
  typeof UpdateSegmentDetailsRequestSchema
>;
export type CreateSegmentFieldRequest = z.infer<
  typeof CreateSegmentFieldRequestSchema
>;
export type UpdateSegmentFieldRequest = z.infer<
  typeof UpdateSegmentFieldRequestSchema
>;
export type DeleteSegmentFieldRequest = z.infer<
  typeof DeleteSegmentFieldRequestSchema
>;
export type RestoreSegmentFieldRequest = z.infer<
  typeof RestoreSegmentFieldRequestSchema
>;
export type ReorderSegmentFieldsRequest = z.infer<
  typeof ReorderSegmentFieldsRequestSchema
>;
