import {
  APP_GET_RUNTIME_INFO_CHANNEL,
  SETTINGS_GET_APPLICATION_SETTINGS_CHANNEL,
  SETTINGS_UPDATE_NAVIGATION_CHANNEL,
  STUDIOS_CREATE_CHANNEL,
  STUDIOS_GET_CHANNEL,
  STUDIOS_LIST_CHANNEL,
  SHOWS_CREATE_CHANNEL,
  SHOWS_GET_DESIGN_CHANNEL,
} from "@showflow/contracts";
import { contextBridge, ipcRenderer } from "electron";

import { createShowflowDesktopApi } from "./api.mjs";

const showflowDesktopApi = createShowflowDesktopApi({
  createShow: (request) => ipcRenderer.invoke(SHOWS_CREATE_CHANNEL, request),
  createStudio: (request) =>
    ipcRenderer.invoke(STUDIOS_CREATE_CHANNEL, request),
  getApplicationSettings: () =>
    ipcRenderer.invoke(SETTINGS_GET_APPLICATION_SETTINGS_CHANNEL, undefined),
  getRuntimeInfo: () =>
    ipcRenderer.invoke(APP_GET_RUNTIME_INFO_CHANNEL, undefined),
  getStudio: (request) => ipcRenderer.invoke(STUDIOS_GET_CHANNEL, request),
  getShowDesign: (request) =>
    ipcRenderer.invoke(SHOWS_GET_DESIGN_CHANNEL, request),
  listStudios: () => ipcRenderer.invoke(STUDIOS_LIST_CHANNEL, undefined),
  updateNavigation: (request) =>
    ipcRenderer.invoke(SETTINGS_UPDATE_NAVIGATION_CHANNEL, request),
});

contextBridge.exposeInMainWorld("showflow", showflowDesktopApi);
