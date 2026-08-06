import {
  DESKTOP_API_VERSION,
  type ApplicationSettingsResult,
  type CreateStudioRequest,
  type GetRuntimeInfoResult,
  type GetStudioRequest,
  type ShowflowDesktopApi,
  type StudioDto,
  type StudioResult,
  type UpdateNavigationSettingsRequest,
} from "@showflow/contracts";
import type { Page } from "@playwright/test";

export const DEFAULT_RUNTIME_INFO_RESULT = {
  ok: true,
  data: {
    applicationVersion: "0.0.0-test",
    architecture: "arm64",
    desktopApiVersion: DESKTOP_API_VERSION,
    platform: "darwin",
  },
} as const satisfies GetRuntimeInfoResult;
export const DEFAULT_APPLICATION_SETTINGS_RESULT = {
  ok: true,
  data: {
    lastRoute: "/",
    lastStudioId: null,
    windowPreferences: null,
  },
} as const satisfies ApplicationSettingsResult;
export const DEFAULT_STUDIO_ID =
  "8d9df01f-2584-4b9a-ad13-a96d673918e9" as const;
export const SECOND_STUDIO_ID = "f4f47461-e2c8-44a8-a301-5465655aeb36" as const;
const DEFAULT_TIMESTAMP = "2026-08-06T14:30:00.000Z" as const;

export const createMockDesktopApi = (
  runtimeInfoResult: GetRuntimeInfoResult = DEFAULT_RUNTIME_INFO_RESULT,
  initialSettingsResult: ApplicationSettingsResult = DEFAULT_APPLICATION_SETTINGS_RESULT,
): ShowflowDesktopApi => {
  let settingsResult = initialSettingsResult;
  const studios = new Map<string, StudioDto>();
  const studioIds = [DEFAULT_STUDIO_ID, SECOND_STUDIO_ID] as const;

  const studioNotFound = (): StudioResult => ({
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "This Studio is no longer available. Return to Studio setup.",
    },
  });

  return Object.freeze({
    apiVersion: DESKTOP_API_VERSION,
    app: Object.freeze({
      getApplicationSettings: async () => settingsResult,
      getRuntimeInfo: async () => runtimeInfoResult,
      updateNavigation: async (request: UpdateNavigationSettingsRequest) => {
        if (settingsResult.ok) {
          settingsResult = {
            ok: true,
            data: { ...settingsResult.data, ...request },
          };
        }

        return settingsResult;
      },
    }),
    studios: Object.freeze({
      create: async (request: CreateStudioRequest) => {
        const studioId = studioIds[studios.size] ?? crypto.randomUUID();
        const studio = {
          archivedAt: null,
          createdAt: DEFAULT_TIMESTAMP,
          id: studioId,
          logoResourceId: null,
          name: request.name.trim(),
          updatedAt: DEFAULT_TIMESTAMP,
        } satisfies StudioDto;
        studios.set(studio.id, studio);
        return { ok: true, data: studio } as const;
      },
      get: async (request: GetStudioRequest) => {
        const studio = studios.get(request.studioId);
        return studio === undefined
          ? studioNotFound()
          : ({ ok: true, data: studio } as const);
      },
      list: async () => ({
        ok: true as const,
        data: [...studios.values()],
      }),
    }),
  });
};

export const installMockDesktopApi = async (
  page: Page,
  api: ShowflowDesktopApi = createMockDesktopApi(),
): Promise<void> => {
  const runtimeInfoResult = await api.app.getRuntimeInfo();
  const applicationSettingsResult = await api.app.getApplicationSettings();

  await page.addInitScript(
    ({ apiVersion, applicationSettings, runtimeInfo }) => {
      let settingsResult = applicationSettings;
      const studios = new Map();
      const studioIds = [
        "8d9df01f-2584-4b9a-ad13-a96d673918e9",
        "f4f47461-e2c8-44a8-a301-5465655aeb36",
      ];
      const timestamp = "2026-08-06T14:30:00.000Z";
      const mockApi = Object.freeze({
        apiVersion,
        app: Object.freeze({
          getApplicationSettings: async () => settingsResult,
          getRuntimeInfo: async () => runtimeInfo,
          updateNavigation: async (request: {
            lastRoute: string;
            lastStudioId: string | null;
          }) => {
            if (settingsResult.ok) {
              settingsResult = {
                ok: true,
                data: { ...settingsResult.data, ...request },
              };
            }

            return settingsResult;
          },
        }),
        studios: Object.freeze({
          create: async (request: { name: string }) => {
            const studioId = studioIds[studios.size] ?? crypto.randomUUID();
            const studio = {
              archivedAt: null,
              createdAt: timestamp,
              id: studioId,
              logoResourceId: null,
              name: request.name.trim(),
              updatedAt: timestamp,
            };
            studios.set(studio.id, studio);
            return { ok: true, data: studio };
          },
          get: async (request: { studioId: string }) => {
            const studio = studios.get(request.studioId);
            return studio === undefined
              ? {
                  ok: false,
                  error: {
                    code: "NOT_FOUND",
                    message:
                      "This Studio is no longer available. Return to Studio setup.",
                  },
                }
              : { ok: true, data: studio };
          },
          list: async () => ({ ok: true, data: [...studios.values()] }),
        }),
      });

      Object.defineProperty(window, "showflow", {
        configurable: false,
        enumerable: true,
        value: mockApi,
        writable: false,
      });
    },
    {
      apiVersion: api.apiVersion,
      applicationSettings: applicationSettingsResult,
      runtimeInfo: runtimeInfoResult,
    },
  );
};
