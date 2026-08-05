import {
  DESKTOP_API_VERSION,
  type GetRuntimeInfoResult,
  type ShowflowDesktopApi,
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

export const createMockDesktopApi = (
  runtimeInfoResult: GetRuntimeInfoResult = DEFAULT_RUNTIME_INFO_RESULT,
): ShowflowDesktopApi =>
  Object.freeze({
    apiVersion: DESKTOP_API_VERSION,
    app: Object.freeze({
      getRuntimeInfo: async () => runtimeInfoResult,
    }),
  });

export const installMockDesktopApi = async (
  page: Page,
  api: ShowflowDesktopApi = createMockDesktopApi(),
): Promise<void> => {
  const runtimeInfoResult = await api.app.getRuntimeInfo();

  await page.addInitScript(
    ({ apiVersion, result }) => {
      const mockApi = Object.freeze({
        apiVersion,
        app: Object.freeze({
          getRuntimeInfo: async () => result,
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
      result: runtimeInfoResult,
    },
  );
};
