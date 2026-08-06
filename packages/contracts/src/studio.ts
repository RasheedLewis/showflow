import { z } from "zod";

import { ApiErrorSchema } from "./api-result.ts";

export const STUDIOS_CREATE_CHANNEL = "showflow:v1:studios:create" as const;
export const STUDIOS_GET_CHANNEL = "showflow:v1:studios:get" as const;
export const STUDIOS_LIST_CHANNEL = "showflow:v1:studios:list" as const;

const CanonicalUtcTimestampSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
});

const StoredStudioNameSchema = z
  .string()
  .max(200)
  .refine((value) => value.trim().length > 0);

export const StudioDtoSchema = z
  .object({
    archivedAt: CanonicalUtcTimestampSchema.nullable(),
    createdAt: CanonicalUtcTimestampSchema,
    id: z.string().uuid(),
    logoResourceId: z.string().uuid().nullable(),
    name: StoredStudioNameSchema,
    updatedAt: CanonicalUtcTimestampSchema,
  })
  .strict();

export const CreateStudioRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
  })
  .strict();

export const GetStudioRequestSchema = z
  .object({
    studioId: z.string().uuid(),
  })
  .strict();

export const ListStudiosRequestSchema = z.undefined();

export const StudioResultSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      data: StudioDtoSchema,
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      error: ApiErrorSchema,
    })
    .strict(),
]);

export const StudioListResultSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      data: z.array(StudioDtoSchema),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      error: ApiErrorSchema,
    })
    .strict(),
]);

export type CreateStudioRequest = z.infer<typeof CreateStudioRequestSchema>;
export type GetStudioRequest = z.infer<typeof GetStudioRequestSchema>;
export type StudioListResult = z.infer<typeof StudioListResultSchema>;
export type StudioDto = z.infer<typeof StudioDtoSchema>;
export type StudioResult = z.infer<typeof StudioResultSchema>;
