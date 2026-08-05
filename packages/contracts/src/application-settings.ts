import { z } from "zod";

import { ApiErrorSchema } from "./api-result.ts";

export const SETTINGS_GET_APPLICATION_SETTINGS_CHANNEL =
  "showflow:v1:settings:get-application-settings" as const;
export const SETTINGS_UPDATE_NAVIGATION_CHANNEL =
  "showflow:v1:settings:update-navigation" as const;

export const ApplicationRouteSchema = z
  .string()
  .min(1)
  .max(2_048)
  .regex(/^\/(?!\/)[^\s#]*$/u, "Route must be an internal hash-router path.");
export const WindowPreferencesSchema = z
  .object({
    height: z.number().int().min(640).max(16_384),
    isMaximized: z.boolean(),
    width: z.number().int().min(960).max(16_384),
  })
  .strict();
export const ApplicationSettingsSchema = z
  .object({
    lastRoute: ApplicationRouteSchema,
    lastStudioId: z.string().uuid().nullable(),
    windowPreferences: WindowPreferencesSchema.nullable(),
  })
  .strict();

export const GetApplicationSettingsRequestSchema = z.undefined();
export const UpdateNavigationSettingsRequestSchema =
  ApplicationSettingsSchema.pick({
    lastRoute: true,
    lastStudioId: true,
  });

export const ApplicationSettingsResultSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      data: ApplicationSettingsSchema,
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      error: ApiErrorSchema,
    })
    .strict(),
]);

export type ApplicationSettingsDto = z.infer<typeof ApplicationSettingsSchema>;
export type ApplicationSettingsResult = z.infer<
  typeof ApplicationSettingsResultSchema
>;
export type UpdateNavigationSettingsRequest = z.infer<
  typeof UpdateNavigationSettingsRequestSchema
>;
