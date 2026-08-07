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
import type {
  CreateEpisodeRequest,
  CreateEpisodeSegmentRequest,
  EpisodeListResult,
  EpisodeSegmentMutationRequest,
  EpisodeStoryboardResult,
  GetEpisodeRequest,
  InsertEpisodeSegmentRequest,
  ListEpisodesRequest,
  ReorderEpisodeRequest,
  RestoreEpisodeSegmentRequest,
} from "./episode.ts";
import type {
  CreateSegmentFieldRequest,
  DeleteSegmentFieldRequest,
  GetSegmentEditorRequest,
  ReorderSegmentFieldsRequest,
  RestoreSegmentFieldRequest,
  ShowSegmentEditorResult,
  UpdateSegmentDetailsRequest,
  UpdateSegmentFieldRequest,
} from "./segment-editor.ts";

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
    createField: (
      request: CreateSegmentFieldRequest,
    ) => Promise<ShowSegmentEditorResult>;
    deleteField: (
      request: DeleteSegmentFieldRequest,
    ) => Promise<ShowSegmentEditorResult>;
    getEditor: (
      request: GetSegmentEditorRequest,
    ) => Promise<ShowSegmentEditorResult>;
    reorderFields: (
      request: ReorderSegmentFieldsRequest,
    ) => Promise<ShowSegmentEditorResult>;
    restoreField: (
      request: RestoreSegmentFieldRequest,
    ) => Promise<ShowSegmentEditorResult>;
    updateDetails: (
      request: UpdateSegmentDetailsRequest,
    ) => Promise<ShowSegmentEditorResult>;
    updateField: (
      request: UpdateSegmentFieldRequest,
    ) => Promise<ShowSegmentEditorResult>;
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
  readonly episodes: Readonly<{
    create: (request: CreateEpisodeRequest) => Promise<EpisodeStoryboardResult>;
    createSegment: (
      request: CreateEpisodeSegmentRequest,
    ) => Promise<EpisodeStoryboardResult>;
    duplicateSegment: (
      request: EpisodeSegmentMutationRequest,
    ) => Promise<EpisodeStoryboardResult>;
    get: (request: GetEpisodeRequest) => Promise<EpisodeStoryboardResult>;
    insertSegment: (
      request: InsertEpisodeSegmentRequest,
    ) => Promise<EpisodeStoryboardResult>;
    list: (request: ListEpisodesRequest) => Promise<EpisodeListResult>;
    removeSegment: (
      request: EpisodeSegmentMutationRequest,
    ) => Promise<EpisodeStoryboardResult>;
    reorder: (
      request: ReorderEpisodeRequest,
    ) => Promise<EpisodeStoryboardResult>;
    restoreSegment: (
      request: RestoreEpisodeSegmentRequest,
    ) => Promise<EpisodeStoryboardResult>;
  }>;
}
