import {
  APP_GET_RUNTIME_INFO_CHANNEL,
  SETTINGS_GET_APPLICATION_SETTINGS_CHANNEL,
  SETTINGS_UPDATE_NAVIGATION_CHANNEL,
  STUDIOS_CREATE_CHANNEL,
  STUDIOS_GET_CHANNEL,
  STUDIOS_LIST_CHANNEL,
  SHOWS_CREATE_CHANNEL,
  SHOWS_ARCHIVE_CHANNEL,
  SHOWS_DELETE_CHANNEL,
  SHOWS_GET_DESIGN_CHANNEL,
  SHOWS_LIST_CHANNEL,
  SHOWS_RENAME_CHANNEL,
  BLUEPRINTS_ADD_SEGMENT_CHANNEL,
  BLUEPRINTS_DUPLICATE_CHANNEL,
  BLUEPRINTS_REMOVE_CHANNEL,
  BLUEPRINTS_REORDER_CHANNEL,
  SEGMENTS_ARCHIVE_CHANNEL,
  SEGMENTS_CREATE_CHANNEL,
  EPISODES_CREATE_CHANNEL,
  EPISODES_CREATE_SEGMENT_CHANNEL,
  EPISODES_DUPLICATE_SEGMENT_CHANNEL,
  EPISODES_GET_CHANNEL,
  EPISODES_INSERT_SEGMENT_CHANNEL,
  EPISODES_LIST_CHANNEL,
  EPISODES_REMOVE_SEGMENT_CHANNEL,
  EPISODES_REORDER_CHANNEL,
  EPISODES_RESTORE_SEGMENT_CHANNEL,
  EPISODES_UPDATE_SEGMENT_CHANNEL,
  SEGMENTS_CREATE_FIELD_CHANNEL,
  SEGMENTS_DELETE_FIELD_CHANNEL,
  SEGMENTS_GET_EDITOR_CHANNEL,
  SEGMENTS_REORDER_FIELDS_CHANNEL,
  SEGMENTS_RESTORE_FIELD_CHANNEL,
  SEGMENTS_UPDATE_DETAILS_CHANNEL,
  SEGMENTS_UPDATE_FIELD_CHANNEL,
  RESOURCES_GET_URL_CHANNEL,
  RESOURCES_IMPORT_CHANNEL,
  RESOURCES_IMPORT_PATHS_CHANNEL,
  RESOURCES_LIST_CHANNEL,
  RESOURCES_LOCATE_CHANNEL,
  RESOURCES_REMOVE_CHANNEL,
  RESOURCES_RENAME_CHANNEL,
  RESOURCES_REPLACE_CHANNEL,
  RESOURCES_UPDATE_METADATA_CHANNEL,
  ImportResourcePathsRequestSchema,
  LAYOUTS_ARCHIVE_CHANNEL,
  LAYOUTS_CREATE_CHANNEL,
  LAYOUTS_DUPLICATE_CHANNEL,
  LAYOUTS_GET_CHANNEL,
  LAYOUTS_LIST_CHANNEL,
  LAYOUTS_RENAME_CHANNEL,
  LAYOUTS_UPDATE_CHANNEL,
} from "@showflow/contracts";
import { contextBridge, ipcRenderer, webUtils } from "electron";

import { createShowflowDesktopApi } from "./api.mjs";

const showflowDesktopApi = createShowflowDesktopApi({
  archiveLayout: (request) =>
    ipcRenderer.invoke(LAYOUTS_ARCHIVE_CHANNEL, request),
  createLayout: (request) =>
    ipcRenderer.invoke(LAYOUTS_CREATE_CHANNEL, request),
  duplicateLayout: (request) =>
    ipcRenderer.invoke(LAYOUTS_DUPLICATE_CHANNEL, request),
  getLayout: (request) => ipcRenderer.invoke(LAYOUTS_GET_CHANNEL, request),
  listLayouts: (request) => ipcRenderer.invoke(LAYOUTS_LIST_CHANNEL, request),
  renameLayout: (request) =>
    ipcRenderer.invoke(LAYOUTS_RENAME_CHANNEL, request),
  updateLayout: (request) =>
    ipcRenderer.invoke(LAYOUTS_UPDATE_CHANNEL, request),
  addBlueprintSegment: (request) =>
    ipcRenderer.invoke(BLUEPRINTS_ADD_SEGMENT_CHANNEL, request),
  archiveSegment: (request) =>
    ipcRenderer.invoke(SEGMENTS_ARCHIVE_CHANNEL, request),
  archiveShow: (request) => ipcRenderer.invoke(SHOWS_ARCHIVE_CHANNEL, request),
  createShow: (request) => ipcRenderer.invoke(SHOWS_CREATE_CHANNEL, request),
  createSegment: (request) =>
    ipcRenderer.invoke(SEGMENTS_CREATE_CHANNEL, request),
  createSegmentField: (request) =>
    ipcRenderer.invoke(SEGMENTS_CREATE_FIELD_CHANNEL, request),
  deleteSegmentField: (request) =>
    ipcRenderer.invoke(SEGMENTS_DELETE_FIELD_CHANNEL, request),
  getSegmentEditor: (request) =>
    ipcRenderer.invoke(SEGMENTS_GET_EDITOR_CHANNEL, request),
  reorderSegmentFields: (request) =>
    ipcRenderer.invoke(SEGMENTS_REORDER_FIELDS_CHANNEL, request),
  restoreSegmentField: (request) =>
    ipcRenderer.invoke(SEGMENTS_RESTORE_FIELD_CHANNEL, request),
  updateSegmentDetails: (request) =>
    ipcRenderer.invoke(SEGMENTS_UPDATE_DETAILS_CHANNEL, request),
  updateSegmentField: (request) =>
    ipcRenderer.invoke(SEGMENTS_UPDATE_FIELD_CHANNEL, request),
  duplicateBlueprintPlacement: (request) =>
    ipcRenderer.invoke(BLUEPRINTS_DUPLICATE_CHANNEL, request),
  deleteShow: (request) => ipcRenderer.invoke(SHOWS_DELETE_CHANNEL, request),
  createStudio: (request) =>
    ipcRenderer.invoke(STUDIOS_CREATE_CHANNEL, request),
  getApplicationSettings: () =>
    ipcRenderer.invoke(SETTINGS_GET_APPLICATION_SETTINGS_CHANNEL, undefined),
  getRuntimeInfo: () =>
    ipcRenderer.invoke(APP_GET_RUNTIME_INFO_CHANNEL, undefined),
  getStudio: (request) => ipcRenderer.invoke(STUDIOS_GET_CHANNEL, request),
  getShowDesign: (request) =>
    ipcRenderer.invoke(SHOWS_GET_DESIGN_CHANNEL, request),
  listShows: (request) => ipcRenderer.invoke(SHOWS_LIST_CHANNEL, request),
  listStudios: () => ipcRenderer.invoke(STUDIOS_LIST_CHANNEL, undefined),
  renameShow: (request) => ipcRenderer.invoke(SHOWS_RENAME_CHANNEL, request),
  removeBlueprintPlacement: (request) =>
    ipcRenderer.invoke(BLUEPRINTS_REMOVE_CHANNEL, request),
  reorderBlueprint: (request) =>
    ipcRenderer.invoke(BLUEPRINTS_REORDER_CHANNEL, request),
  updateNavigation: (request) =>
    ipcRenderer.invoke(SETTINGS_UPDATE_NAVIGATION_CHANNEL, request),
  createEpisode: (request) =>
    ipcRenderer.invoke(EPISODES_CREATE_CHANNEL, request),
  createEpisodeSegment: (request) =>
    ipcRenderer.invoke(EPISODES_CREATE_SEGMENT_CHANNEL, request),
  duplicateEpisodeSegment: (request) =>
    ipcRenderer.invoke(EPISODES_DUPLICATE_SEGMENT_CHANNEL, request),
  getEpisode: (request) => ipcRenderer.invoke(EPISODES_GET_CHANNEL, request),
  insertEpisodeSegment: (request) =>
    ipcRenderer.invoke(EPISODES_INSERT_SEGMENT_CHANNEL, request),
  listEpisodes: (request) => ipcRenderer.invoke(EPISODES_LIST_CHANNEL, request),
  removeEpisodeSegment: (request) =>
    ipcRenderer.invoke(EPISODES_REMOVE_SEGMENT_CHANNEL, request),
  reorderEpisode: (request) =>
    ipcRenderer.invoke(EPISODES_REORDER_CHANNEL, request),
  restoreEpisodeSegment: (request) =>
    ipcRenderer.invoke(EPISODES_RESTORE_SEGMENT_CHANNEL, request),
  updateEpisodeSegment: (request) =>
    ipcRenderer.invoke(EPISODES_UPDATE_SEGMENT_CHANNEL, request),
  getResourceUrl: (request) =>
    ipcRenderer.invoke(RESOURCES_GET_URL_CHANNEL, request),
  importResources: (request) =>
    ipcRenderer.invoke(RESOURCES_IMPORT_CHANNEL, request),
  importDroppedResources: (request, files) =>
    ipcRenderer.invoke(
      RESOURCES_IMPORT_PATHS_CHANNEL,
      ImportResourcePathsRequestSchema.parse({
        ...(request as object),
        filePaths: files.map((file) => webUtils.getPathForFile(file as File)),
      }),
    ),
  listResources: (request) =>
    ipcRenderer.invoke(RESOURCES_LIST_CHANNEL, request),
  locateResource: (request) =>
    ipcRenderer.invoke(RESOURCES_LOCATE_CHANNEL, request),
  removeResource: (request) =>
    ipcRenderer.invoke(RESOURCES_REMOVE_CHANNEL, request),
  renameResource: (request) =>
    ipcRenderer.invoke(RESOURCES_RENAME_CHANNEL, request),
  replaceResource: (request) =>
    ipcRenderer.invoke(RESOURCES_REPLACE_CHANNEL, request),
  updateResourceMetadata: (request) =>
    ipcRenderer.invoke(RESOURCES_UPDATE_METADATA_CHANNEL, request),
});

contextBridge.exposeInMainWorld("showflow", showflowDesktopApi);
