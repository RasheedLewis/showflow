import type { ApplicationSettingsService } from "@showflow/application";
import {
  ApplicationSettingsResultSchema,
  GetApplicationSettingsRequestSchema,
  UpdateNavigationSettingsRequestSchema,
  type ApplicationSettingsResult,
} from "@showflow/contracts";

const createErrorResult = (
  code: string,
  message: string,
): ApplicationSettingsResult =>
  ApplicationSettingsResultSchema.parse({
    ok: false,
    error: { code, message },
  });

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
  } catch {
    return createErrorResult(
      "SETTINGS_READ_FAILED",
      "Showflow could not load application settings.",
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
  } catch {
    return createErrorResult(
      "SETTINGS_WRITE_FAILED",
      "Showflow could not save navigation settings.",
    );
  }
};
