import {
  ApplicationError,
  type ApplicationSettingsService,
} from "@showflow/application";
import {
  ApplicationSettingsResultSchema,
  GetApplicationSettingsRequestSchema,
  UpdateNavigationSettingsRequestSchema,
  type ApiErrorCode,
  type ApplicationSettingsResult,
} from "@showflow/contracts";

const createErrorResult = (
  code: ApiErrorCode,
  message: string,
): ApplicationSettingsResult =>
  ApplicationSettingsResultSchema.parse({
    ok: false,
    error: { code, message },
  });

const getApplicationErrorCode = (error: unknown): ApiErrorCode =>
  error instanceof ApplicationError ? error.code : "INTERNAL_ERROR";

const createSuccessResult = (value: unknown): ApplicationSettingsResult => {
  const result = ApplicationSettingsResultSchema.safeParse({
    ok: true,
    data: value,
  });

  return result.success
    ? result.data
    : createErrorResult(
        "IPC_INVALID_RESPONSE",
        "Showflow could not validate application settings.",
      );
};

export const handleGetApplicationSettingsRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  service: ApplicationSettingsService,
): Promise<ApplicationSettingsResult> => {
  if (!senderIsTrusted) {
    return createErrorResult(
      "IPC_UNTRUSTED_SENDER",
      "The settings request did not come from Showflow.",
    );
  }

  if (!GetApplicationSettingsRequestSchema.safeParse(request).success) {
    return createErrorResult(
      "IPC_INVALID_REQUEST",
      "The settings request was invalid.",
    );
  }

  try {
    return createSuccessResult(await service.get());
  } catch (error) {
    return createErrorResult(
      getApplicationErrorCode(error),
      "Showflow could not load application settings. Your saved settings were not changed. Restart Showflow and try again.",
    );
  }
};

export const handleUpdateNavigationSettingsRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  service: ApplicationSettingsService,
): Promise<ApplicationSettingsResult> => {
  if (!senderIsTrusted) {
    return createErrorResult(
      "IPC_UNTRUSTED_SENDER",
      "The settings request did not come from Showflow.",
    );
  }

  const validRequest = UpdateNavigationSettingsRequestSchema.safeParse(request);
  if (!validRequest.success) {
    return createErrorResult(
      "IPC_INVALID_REQUEST",
      "The navigation settings request was invalid.",
    );
  }

  try {
    return createSuccessResult(
      await service.updateNavigation(validRequest.data),
    );
  } catch (error) {
    return createErrorResult(
      getApplicationErrorCode(error),
      "Showflow could not save navigation settings. Your previous settings are still saved. Try again.",
    );
  }
};
