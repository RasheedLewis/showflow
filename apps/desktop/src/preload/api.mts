import {
  ApplicationSettingsResultSchema,
  DESKTOP_API_VERSION,
  GetRuntimeInfoResultSchema,
  UpdateNavigationSettingsRequestSchema,
  type ShowflowDesktopApi,
} from "@showflow/contracts";

export interface DesktopApiTransports {
  readonly getApplicationSettings: () => Promise<unknown>;
  readonly getRuntimeInfo: () => Promise<unknown>;
  readonly updateNavigation: (request: unknown) => Promise<unknown>;
}

export const createShowflowDesktopApi = (
  transports: DesktopApiTransports,
): ShowflowDesktopApi => {
  const appApi = Object.freeze({
    getApplicationSettings: async () =>
      ApplicationSettingsResultSchema.parse(
        await transports.getApplicationSettings(),
      ),
    getRuntimeInfo: async () =>
      GetRuntimeInfoResultSchema.parse(await transports.getRuntimeInfo()),
    updateNavigation: async (request: unknown) => {
      const validRequest = UpdateNavigationSettingsRequestSchema.parse(request);
      return ApplicationSettingsResultSchema.parse(
        await transports.updateNavigation(validRequest),
      );
    },
  });

  return Object.freeze({
    apiVersion: DESKTOP_API_VERSION,
    app: appApi,
  });
};
