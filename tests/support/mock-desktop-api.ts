import {
  DESKTOP_API_VERSION,
  type ApplicationSettingsResult,
  type GetRuntimeInfoResult,
  type ShowflowDesktopApi,
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

export const createMockDesktopApi = (
  runtimeInfoResult: GetRuntimeInfoResult = DEFAULT_RUNTIME_INFO_RESULT,
  initialSettingsResult: ApplicationSettingsResult = DEFAULT_APPLICATION_SETTINGS_RESULT,
): ShowflowDesktopApi => {
  let settingsResult = initialSettingsResult;

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
