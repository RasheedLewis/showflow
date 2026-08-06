import type {
  ApplicationSettingsResult,
  UpdateNavigationSettingsRequest,
} from "./application-settings.ts";
import type {
  DESKTOP_API_VERSION,
  GetRuntimeInfoResult,
} from "./app-runtime.ts";
import type {
  CreateStudioRequest,
  GetStudioRequest,
  StudioListResult,
  StudioResult,
} from "./studio.ts";

export interface ShowflowDesktopApi {
  readonly apiVersion: typeof DESKTOP_API_VERSION;
  readonly app: Readonly<{
    getApplicationSettings: () => Promise<ApplicationSettingsResult>;
    getRuntimeInfo: () => Promise<GetRuntimeInfoResult>;
    updateNavigation: (
      request: UpdateNavigationSettingsRequest,
    ) => Promise<ApplicationSettingsResult>;
  }>;
  readonly studios: Readonly<{
    create: (request: CreateStudioRequest) => Promise<StudioResult>;
    get: (request: GetStudioRequest) => Promise<StudioResult>;
    list: () => Promise<StudioListResult>;
  }>;
}
