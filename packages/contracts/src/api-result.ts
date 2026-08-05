import { z } from "zod";

export const API_ERROR_CODES = [
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "CONFLICT",
  "PERSISTENCE_FAILURE",
  "FILE_UNAVAILABLE",
  "UNSUPPORTED_MEDIA",
  "PERMISSION_DENIED",
  "DEVICE_UNAVAILABLE",
  "RUNTIME_FAILURE",
  "INTERNAL_ERROR",
  "IPC_UNTRUSTED_SENDER",
  "IPC_INVALID_REQUEST",
  "IPC_INVALID_RESPONSE",
] as const;

export const ApiErrorCodeSchema = z.enum(API_ERROR_CODES);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorSchema = z
  .object({
    code: ApiErrorCodeSchema,
    message: z.string().min(1),
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
