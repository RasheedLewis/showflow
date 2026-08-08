import {
  ApplicationSettingsResultSchema,
  DESKTOP_API_VERSION,
  CreateStudioRequestSchema,
  CreateShowRequestSchema,
  CreateSegmentRequestSchema,
  ArchiveSegmentRequestSchema,
  AddBlueprintSegmentRequestSchema,
  BlueprintPlacementMutationRequestSchema,
  ReorderBlueprintRequestSchema,
  GetShowDesignRequestSchema,
  ListShowsRequestSchema,
  RenameShowRequestSchema,
  ShowDeleteResultSchema,
  GetStudioRequestSchema,
  GetRuntimeInfoResultSchema,
  StudioListResultSchema,
  StudioResultSchema,
  ShowDesignResultSchema,
  ShowListResultSchema,
  ShowMutationRequestSchema,
  ShowResultSchema,
  UpdateNavigationSettingsRequestSchema,
  CreateEpisodeRequestSchema,
  CreateEpisodeSegmentRequestSchema,
  EpisodeListResultSchema,
  EpisodeSegmentMutationRequestSchema,
  EpisodeStoryboardResultSchema,
  GetEpisodeRequestSchema,
  InsertEpisodeSegmentRequestSchema,
  ListEpisodesRequestSchema,
  ReorderEpisodeRequestSchema,
  RestoreEpisodeSegmentRequestSchema,
  UpdateEpisodeSegmentRequestSchema,
  type ShowflowDesktopApi,
  CreateSegmentFieldRequestSchema,
  DeleteSegmentFieldRequestSchema,
  GetSegmentEditorRequestSchema,
  ReorderSegmentFieldsRequestSchema,
  RestoreSegmentFieldRequestSchema,
  ShowSegmentEditorResultSchema,
  UpdateSegmentDetailsRequestSchema,
  UpdateSegmentFieldRequestSchema,
  GetResourceUrlRequestSchema,
  ImportResourcesRequestSchema,
  ListResourcesRequestSchema,
  RemoveResourceRequestSchema,
  RenameResourceRequestSchema,
  RepairResourceRequestSchema,
  ResourceListResultSchema,
  ResourceUrlResultSchema,
  UpdateResourceMetadataRequestSchema,
  type DroppedResourceFile,
  CreateLayoutRequestSchema,
  GetLayoutRequestSchema,
  LayoutCatalogResultSchema,
  LayoutMutationRequestSchema,
  LayoutResultSchema,
  ListLayoutsRequestSchema,
  RenameLayoutRequestSchema,
  UpdateLayoutRequestSchema,
} from "@showflow/contracts";

export interface DesktopApiTransports {
  readonly getApplicationSettings: () => Promise<unknown>;
  readonly getRuntimeInfo: () => Promise<unknown>;
  readonly createStudio: (request: unknown) => Promise<unknown>;
  readonly createShow: (request: unknown) => Promise<unknown>;
  readonly archiveShow: (request: unknown) => Promise<unknown>;
  readonly deleteShow: (request: unknown) => Promise<unknown>;
  readonly getShowDesign: (request: unknown) => Promise<unknown>;
  readonly listShows: (request: unknown) => Promise<unknown>;
  readonly renameShow: (request: unknown) => Promise<unknown>;
  readonly getStudio: (request: unknown) => Promise<unknown>;
  readonly listStudios: () => Promise<unknown>;
  readonly updateNavigation: (request: unknown) => Promise<unknown>;
  readonly createSegment: (request: unknown) => Promise<unknown>;
  readonly archiveSegment: (request: unknown) => Promise<unknown>;
  readonly createSegmentField: (request: unknown) => Promise<unknown>;
  readonly deleteSegmentField: (request: unknown) => Promise<unknown>;
  readonly getSegmentEditor: (request: unknown) => Promise<unknown>;
  readonly reorderSegmentFields: (request: unknown) => Promise<unknown>;
  readonly restoreSegmentField: (request: unknown) => Promise<unknown>;
  readonly updateSegmentDetails: (request: unknown) => Promise<unknown>;
  readonly updateSegmentField: (request: unknown) => Promise<unknown>;
  readonly addBlueprintSegment: (request: unknown) => Promise<unknown>;
  readonly duplicateBlueprintPlacement: (request: unknown) => Promise<unknown>;
  readonly removeBlueprintPlacement: (request: unknown) => Promise<unknown>;
  readonly reorderBlueprint: (request: unknown) => Promise<unknown>;
  readonly createEpisode: (request: unknown) => Promise<unknown>;
  readonly createEpisodeSegment: (request: unknown) => Promise<unknown>;
  readonly duplicateEpisodeSegment: (request: unknown) => Promise<unknown>;
  readonly getEpisode: (request: unknown) => Promise<unknown>;
  readonly insertEpisodeSegment: (request: unknown) => Promise<unknown>;
  readonly listEpisodes: (request: unknown) => Promise<unknown>;
  readonly removeEpisodeSegment: (request: unknown) => Promise<unknown>;
  readonly reorderEpisode: (request: unknown) => Promise<unknown>;
  readonly restoreEpisodeSegment: (request: unknown) => Promise<unknown>;
  readonly updateEpisodeSegment: (request: unknown) => Promise<unknown>;
  readonly getResourceUrl: (request: unknown) => Promise<unknown>;
  readonly importResources: (request: unknown) => Promise<unknown>;
  readonly importDroppedResources: (
    request: unknown,
    files: readonly DroppedResourceFile[],
  ) => Promise<unknown>;
  readonly listResources: (request: unknown) => Promise<unknown>;
  readonly locateResource: (request: unknown) => Promise<unknown>;
  readonly removeResource: (request: unknown) => Promise<unknown>;
  readonly renameResource: (request: unknown) => Promise<unknown>;
  readonly replaceResource: (request: unknown) => Promise<unknown>;
  readonly updateResourceMetadata: (request: unknown) => Promise<unknown>;
  readonly archiveLayout: (request: unknown) => Promise<unknown>;
  readonly createLayout: (request: unknown) => Promise<unknown>;
  readonly duplicateLayout: (request: unknown) => Promise<unknown>;
  readonly getLayout: (request: unknown) => Promise<unknown>;
  readonly listLayouts: (request: unknown) => Promise<unknown>;
  readonly renameLayout: (request: unknown) => Promise<unknown>;
  readonly updateLayout: (request: unknown) => Promise<unknown>;
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
    archive: async (request: unknown) => {
      const validRequest = ShowMutationRequestSchema.parse(request);
      return ShowResultSchema.parse(await transports.archiveShow(validRequest));
    },
    create: async (request: unknown) => {
      const validRequest = CreateShowRequestSchema.parse(request);
      return ShowDesignResultSchema.parse(
        await transports.createShow(validRequest),
      );
    },
    delete: async (request: unknown) => {
      const validRequest = ShowMutationRequestSchema.parse(request);
      return ShowDeleteResultSchema.parse(
        await transports.deleteShow(validRequest),
      );
    },
    getDesign: async (request: unknown) => {
      const validRequest = GetShowDesignRequestSchema.parse(request);
      return ShowDesignResultSchema.parse(
        await transports.getShowDesign(validRequest),
      );
    },
    list: async (request: unknown) => {
      const validRequest = ListShowsRequestSchema.parse(request);
      return ShowListResultSchema.parse(
        await transports.listShows(validRequest),
      );
    },
    rename: async (request: unknown) => {
      const validRequest = RenameShowRequestSchema.parse(request);
      return ShowResultSchema.parse(await transports.renameShow(validRequest));
    },
  });
  const segmentsApi = Object.freeze({
    archive: async (request: unknown) => {
      const validRequest = ArchiveSegmentRequestSchema.parse(request);
      return ShowDesignResultSchema.parse(
        await transports.archiveSegment(validRequest),
      );
    },
    create: async (request: unknown) => {
      const validRequest = CreateSegmentRequestSchema.parse(request);
      return ShowDesignResultSchema.parse(
        await transports.createSegment(validRequest),
      );
    },
    createField: async (request: unknown) => {
      const validRequest = CreateSegmentFieldRequestSchema.parse(request);
      return ShowSegmentEditorResultSchema.parse(
        await transports.createSegmentField(validRequest),
      );
    },
    deleteField: async (request: unknown) => {
      const validRequest = DeleteSegmentFieldRequestSchema.parse(request);
      return ShowSegmentEditorResultSchema.parse(
        await transports.deleteSegmentField(validRequest),
      );
    },
    getEditor: async (request: unknown) => {
      const validRequest = GetSegmentEditorRequestSchema.parse(request);
      return ShowSegmentEditorResultSchema.parse(
        await transports.getSegmentEditor(validRequest),
      );
    },
    reorderFields: async (request: unknown) => {
      const validRequest = ReorderSegmentFieldsRequestSchema.parse(request);
      return ShowSegmentEditorResultSchema.parse(
        await transports.reorderSegmentFields(validRequest),
      );
    },
    restoreField: async (request: unknown) => {
      const validRequest = RestoreSegmentFieldRequestSchema.parse(request);
      return ShowSegmentEditorResultSchema.parse(
        await transports.restoreSegmentField(validRequest),
      );
    },
    updateDetails: async (request: unknown) => {
      const validRequest = UpdateSegmentDetailsRequestSchema.parse(request);
      return ShowSegmentEditorResultSchema.parse(
        await transports.updateSegmentDetails(validRequest),
      );
    },
    updateField: async (request: unknown) => {
      const validRequest = UpdateSegmentFieldRequestSchema.parse(request);
      return ShowSegmentEditorResultSchema.parse(
        await transports.updateSegmentField(validRequest),
      );
    },
  });
  const blueprintsApi = Object.freeze({
    addSegment: async (request: unknown) => {
      const validRequest = AddBlueprintSegmentRequestSchema.parse(request);
      return ShowDesignResultSchema.parse(
        await transports.addBlueprintSegment(validRequest),
      );
    },
    duplicatePlacement: async (request: unknown) => {
      const validRequest =
        BlueprintPlacementMutationRequestSchema.parse(request);
      return ShowDesignResultSchema.parse(
        await transports.duplicateBlueprintPlacement(validRequest),
      );
    },
    removePlacement: async (request: unknown) => {
      const validRequest =
        BlueprintPlacementMutationRequestSchema.parse(request);
      return ShowDesignResultSchema.parse(
        await transports.removeBlueprintPlacement(validRequest),
      );
    },
    reorder: async (request: unknown) => {
      const validRequest = ReorderBlueprintRequestSchema.parse(request);
      return ShowDesignResultSchema.parse(
        await transports.reorderBlueprint(validRequest),
      );
    },
  });
  const episodesApi = Object.freeze({
    create: async (request: unknown) => {
      const validRequest = CreateEpisodeRequestSchema.parse(request);
      return EpisodeStoryboardResultSchema.parse(
        await transports.createEpisode(validRequest),
      );
    },
    createSegment: async (request: unknown) => {
      const validRequest = CreateEpisodeSegmentRequestSchema.parse(request);
      return EpisodeStoryboardResultSchema.parse(
        await transports.createEpisodeSegment(validRequest),
      );
    },
    duplicateSegment: async (request: unknown) => {
      const validRequest = EpisodeSegmentMutationRequestSchema.parse(request);
      return EpisodeStoryboardResultSchema.parse(
        await transports.duplicateEpisodeSegment(validRequest),
      );
    },
    get: async (request: unknown) => {
      const validRequest = GetEpisodeRequestSchema.parse(request);
      return EpisodeStoryboardResultSchema.parse(
        await transports.getEpisode(validRequest),
      );
    },
    insertSegment: async (request: unknown) => {
      const validRequest = InsertEpisodeSegmentRequestSchema.parse(request);
      return EpisodeStoryboardResultSchema.parse(
        await transports.insertEpisodeSegment(validRequest),
      );
    },
    list: async (request: unknown) => {
      const validRequest = ListEpisodesRequestSchema.parse(request);
      return EpisodeListResultSchema.parse(
        await transports.listEpisodes(validRequest),
      );
    },
    removeSegment: async (request: unknown) => {
      const validRequest = EpisodeSegmentMutationRequestSchema.parse(request);
      return EpisodeStoryboardResultSchema.parse(
        await transports.removeEpisodeSegment(validRequest),
      );
    },
    reorder: async (request: unknown) => {
      const validRequest = ReorderEpisodeRequestSchema.parse(request);
      return EpisodeStoryboardResultSchema.parse(
        await transports.reorderEpisode(validRequest),
      );
    },
    restoreSegment: async (request: unknown) => {
      const validRequest = RestoreEpisodeSegmentRequestSchema.parse(request);
      return EpisodeStoryboardResultSchema.parse(
        await transports.restoreEpisodeSegment(validRequest),
      );
    },
    updateSegment: async (request: unknown) => {
      const validRequest = UpdateEpisodeSegmentRequestSchema.parse(request);
      return EpisodeStoryboardResultSchema.parse(
        await transports.updateEpisodeSegment(validRequest),
      );
    },
  });
  const resourcesApi = Object.freeze({
    getUrl: async (request: unknown) => {
      const validRequest = GetResourceUrlRequestSchema.parse(request);
      return ResourceUrlResultSchema.parse(
        await transports.getResourceUrl(validRequest),
      );
    },
    import: async (request: unknown) => {
      const validRequest = ImportResourcesRequestSchema.parse(request);
      return ResourceListResultSchema.parse(
        await transports.importResources(validRequest),
      );
    },
    importDropped: async (
      request: unknown,
      files: readonly DroppedResourceFile[],
    ) => {
      const validRequest = ImportResourcesRequestSchema.parse(request);
      return ResourceListResultSchema.parse(
        await transports.importDroppedResources(validRequest, files),
      );
    },
    list: async (request: unknown) => {
      const validRequest = ListResourcesRequestSchema.parse(request);
      return ResourceListResultSchema.parse(
        await transports.listResources(validRequest),
      );
    },
    locate: async (request: unknown) => {
      const validRequest = RepairResourceRequestSchema.parse(request);
      return ResourceListResultSchema.parse(
        await transports.locateResource(validRequest),
      );
    },
    remove: async (request: unknown) => {
      const validRequest = RemoveResourceRequestSchema.parse(request);
      return ResourceListResultSchema.parse(
        await transports.removeResource(validRequest),
      );
    },
    rename: async (request: unknown) => {
      const validRequest = RenameResourceRequestSchema.parse(request);
      return ResourceListResultSchema.parse(
        await transports.renameResource(validRequest),
      );
    },
    replace: async (request: unknown) => {
      const validRequest = RepairResourceRequestSchema.parse(request);
      return ResourceListResultSchema.parse(
        await transports.replaceResource(validRequest),
      );
    },
    updateMetadata: async (request: unknown) => {
      const validRequest = UpdateResourceMetadataRequestSchema.parse(request);
      return ResourceListResultSchema.parse(
        await transports.updateResourceMetadata(validRequest),
      );
    },
  });
  const layoutsApi = Object.freeze({
    archive: async (request: unknown) => {
      const validRequest = LayoutMutationRequestSchema.parse(request);
      return LayoutResultSchema.parse(
        await transports.archiveLayout(validRequest),
      );
    },
    create: async (request: unknown) => {
      const validRequest = CreateLayoutRequestSchema.parse(request);
      return LayoutResultSchema.parse(
        await transports.createLayout(validRequest),
      );
    },
    duplicate: async (request: unknown) => {
      const validRequest = LayoutMutationRequestSchema.parse(request);
      return LayoutResultSchema.parse(
        await transports.duplicateLayout(validRequest),
      );
    },
    get: async (request: unknown) => {
      const validRequest = GetLayoutRequestSchema.parse(request);
      return LayoutResultSchema.parse(await transports.getLayout(validRequest));
    },
    list: async (request: unknown) => {
      const validRequest = ListLayoutsRequestSchema.parse(request);
      return LayoutCatalogResultSchema.parse(
        await transports.listLayouts(validRequest),
      );
    },
    rename: async (request: unknown) => {
      const validRequest = RenameLayoutRequestSchema.parse(request);
      return LayoutResultSchema.parse(
        await transports.renameLayout(validRequest),
      );
    },
    update: async (request: unknown) => {
      const validRequest = UpdateLayoutRequestSchema.parse(request);
      return LayoutResultSchema.parse(
        await transports.updateLayout(validRequest),
      );
    },
  });

  return Object.freeze({
    apiVersion: DESKTOP_API_VERSION,
    app: appApi,
    studios: studiosApi,
    shows: showsApi,
    segments: segmentsApi,
    blueprints: blueprintsApi,
    episodes: episodesApi,
    layouts: layoutsApi,
    resources: resourcesApi,
  });
};
