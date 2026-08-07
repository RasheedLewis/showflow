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
import type {
  CreateShowRequest,
  CreateSegmentRequest,
  ArchiveSegmentRequest,
  AddBlueprintSegmentRequest,
  ReorderBlueprintRequest,
  BlueprintPlacementMutationRequest,
  GetShowDesignRequest,
  ListShowsRequest,
  RenameShowRequest,
  ShowDeleteResult,
  ShowDesignResult,
  ShowListResult,
  ShowMutationRequest,
  ShowResult,
} from "./show.ts";

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
  readonly shows: Readonly<{
    archive: (request: ShowMutationRequest) => Promise<ShowResult>;
    create: (request: CreateShowRequest) => Promise<ShowDesignResult>;
    delete: (request: ShowMutationRequest) => Promise<ShowDeleteResult>;
    getDesign: (request: GetShowDesignRequest) => Promise<ShowDesignResult>;
    list: (request: ListShowsRequest) => Promise<ShowListResult>;
    rename: (request: RenameShowRequest) => Promise<ShowResult>;
  }>;
  readonly segments: Readonly<{
    archive: (request: ArchiveSegmentRequest) => Promise<ShowDesignResult>;
    create: (request: CreateSegmentRequest) => Promise<ShowDesignResult>;
  }>;
  readonly blueprints: Readonly<{
    addSegment: (
      request: AddBlueprintSegmentRequest,
    ) => Promise<ShowDesignResult>;
    duplicatePlacement: (
      request: BlueprintPlacementMutationRequest,
    ) => Promise<ShowDesignResult>;
    removePlacement: (
      request: BlueprintPlacementMutationRequest,
    ) => Promise<ShowDesignResult>;
    reorder: (request: ReorderBlueprintRequest) => Promise<ShowDesignResult>;
  }>;
}
