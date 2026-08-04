import { z } from "zod";

export const DESKTOP_API_VERSION = "1.0.0" as const;
export const APP_GET_RUNTIME_INFO_CHANNEL =
  "showflow:v1:app:get-runtime-info" as const;

export const GetRuntimeInfoRequestSchema = z.undefined();

export const RuntimeInfoSchema = z
  .object({
    applicationVersion: z.string().min(1),
    desktopApiVersion: z.literal(DESKTOP_API_VERSION),
    platform: z.enum([
      "aix",
      "android",
      "darwin",
      "freebsd",
      "linux",
      "openbsd",
      "sunos",
      "win32",
    ]),
    architecture: z.enum([
      "arm",
      "arm64",
      "ia32",
      "loong64",
      "mips",
      "mipsel",
      "ppc",
      "ppc64",
      "riscv64",
      "s390",
      "s390x",
      "x64",
    ]),
  })
  .strict();

export const ApiErrorSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const GetRuntimeInfoResultSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      data: RuntimeInfoSchema,
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      error: ApiErrorSchema,
    })
    .strict(),
]);

export type RuntimeInfo = z.infer<typeof RuntimeInfoSchema>;
export type GetRuntimeInfoResult = z.infer<
  typeof GetRuntimeInfoResultSchema
>;

export interface ShowflowDesktopApi {
  readonly apiVersion: typeof DESKTOP_API_VERSION;
  readonly app: Readonly<{
    getRuntimeInfo: () => Promise<GetRuntimeInfoResult>;
  }>;
}
