import {
  DESKTOP_API_VERSION,
  GetRuntimeInfoRequestSchema,
  GetRuntimeInfoResultSchema,
  RuntimeInfoSchema,
  type GetRuntimeInfoResult,
} from "@showflow/contracts";

export interface RuntimeInfoSource {
  readonly applicationVersion: string;
  readonly platform: string;
  readonly architecture: string;
}

const createErrorResult = (
  code: string,
  message: string,
): GetRuntimeInfoResult =>
  GetRuntimeInfoResultSchema.parse({
    ok: false,
    error: { code, message },
  });

export const handleGetRuntimeInfoRequest = (
  request: unknown,
  senderIsTrusted: boolean,
  source: RuntimeInfoSource,
): GetRuntimeInfoResult => {
  if (!senderIsTrusted) {
    return createErrorResult(
      "IPC_UNTRUSTED_SENDER",
      "The runtime information request did not come from Showflow.",
    );
  }

  if (!GetRuntimeInfoRequestSchema.safeParse(request).success) {
    return createErrorResult(
      "IPC_INVALID_REQUEST",
      "The runtime information request was invalid.",
    );
  }

  const runtimeInfo = RuntimeInfoSchema.safeParse({
    applicationVersion: source.applicationVersion,
    desktopApiVersion: DESKTOP_API_VERSION,
    platform: source.platform,
    architecture: source.architecture,
  });

  if (!runtimeInfo.success) {
    return createErrorResult(
      "IPC_INVALID_RESPONSE",
      "Showflow could not validate its runtime information.",
    );
  }

  return GetRuntimeInfoResultSchema.parse({
    ok: true,
    data: runtimeInfo.data,
  });
};
