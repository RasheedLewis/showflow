import {
  APP_GET_RUNTIME_INFO_CHANNEL,
  SETTINGS_GET_APPLICATION_SETTINGS_CHANNEL,
  SETTINGS_UPDATE_NAVIGATION_CHANNEL,
  STUDIOS_CREATE_CHANNEL,
  STUDIOS_GET_CHANNEL,
} from "@showflow/contracts";
import { contextBridge, ipcRenderer } from "electron";

import { createShowflowDesktopApi } from "./api.mjs";

const showflowDesktopApi = createShowflowDesktopApi({
  createStudio: (request) =>
    ipcRenderer.invoke(STUDIOS_CREATE_CHANNEL, request),
  getApplicationSettings: () =>
    ipcRenderer.invoke(SETTINGS_GET_APPLICATION_SETTINGS_CHANNEL, undefined),
  getRuntimeInfo: () =>
    ipcRenderer.invoke(APP_GET_RUNTIME_INFO_CHANNEL, undefined),
  getStudio: (request) => ipcRenderer.invoke(STUDIOS_GET_CHANNEL, request),
  updateNavigation: (request) =>
    ipcRenderer.invoke(SETTINGS_UPDATE_NAVIGATION_CHANNEL, request),
});

contextBridge.exposeInMainWorld("showflow", showflowDesktopApi);
