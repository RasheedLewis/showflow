import {
  ApplicationSettingsResultSchema,
  DESKTOP_API_VERSION,
  CreateStudioRequestSchema,
  CreateShowRequestSchema,
  GetShowDesignRequestSchema,
  GetStudioRequestSchema,
  GetRuntimeInfoResultSchema,
  StudioListResultSchema,
  StudioResultSchema,
  ShowDesignResultSchema,
  UpdateNavigationSettingsRequestSchema,
  type ShowflowDesktopApi,
} from "@showflow/contracts";

export interface DesktopApiTransports {
  readonly getApplicationSettings: () => Promise<unknown>;
  readonly getRuntimeInfo: () => Promise<unknown>;
  readonly createStudio: (request: unknown) => Promise<unknown>;
  readonly createShow: (request: unknown) => Promise<unknown>;
  readonly getShowDesign: (request: unknown) => Promise<unknown>;
  readonly getStudio: (request: unknown) => Promise<unknown>;
  readonly listStudios: () => Promise<unknown>;
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
  const studiosApi = Object.freeze({
    create: async (request: unknown) => {
      const validRequest = CreateStudioRequestSchema.parse(request);
      return StudioResultSchema.parse(
        await transports.createStudio(validRequest),
      );
    },
    get: async (request: unknown) => {
      const validRequest = GetStudioRequestSchema.parse(request);
      return StudioResultSchema.parse(await transports.getStudio(validRequest));
    },
    list: async () =>
      StudioListResultSchema.parse(await transports.listStudios()),
  });
  const showsApi = Object.freeze({
    create: async (request: unknown) => {
      const validRequest = CreateShowRequestSchema.parse(request);
      return ShowDesignResultSchema.parse(
        await transports.createShow(validRequest),
      );
    },
    getDesign: async (request: unknown) => {
      const validRequest = GetShowDesignRequestSchema.parse(request);
      return ShowDesignResultSchema.parse(
        await transports.getShowDesign(validRequest),
      );
    },
  });

  return Object.freeze({
    apiVersion: DESKTOP_API_VERSION,
    app: appApi,
    studios: studiosApi,
    shows: showsApi,
  });
};
