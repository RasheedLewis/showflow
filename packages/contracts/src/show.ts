import { z } from "zod";

import { ApiErrorSchema } from "./api-result.ts";

export const SHOWS_CREATE_CHANNEL = "showflow:v1:shows:create" as const;
export const SHOWS_GET_DESIGN_CHANNEL = "showflow:v1:shows:get-design" as const;

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

export const ShowBlueprintDtoSchema = z
  .object({
    createdAt: CanonicalUtcTimestampSchema,
    id: z.string().uuid(),
    placementCount: z.number().int().nonnegative(),
    showId: z.string().uuid(),
    updatedAt: CanonicalUtcTimestampSchema,
  })
  .strict();

export const ShowDesignDtoSchema = z
  .object({
    blueprint: ShowBlueprintDtoSchema,
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

export const ShowDesignResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: ShowDesignDtoSchema }).strict(),
  z.object({ ok: z.literal(false), error: ApiErrorSchema }).strict(),
]);

export type CreateShowRequest = z.infer<typeof CreateShowRequestSchema>;
export type GetShowDesignRequest = z.infer<typeof GetShowDesignRequestSchema>;
export type ShowBlueprintDto = z.infer<typeof ShowBlueprintDtoSchema>;
export type ShowDesignDto = z.infer<typeof ShowDesignDtoSchema>;
export type ShowDesignResult = z.infer<typeof ShowDesignResultSchema>;
export type ShowDto = z.infer<typeof ShowDtoSchema>;
