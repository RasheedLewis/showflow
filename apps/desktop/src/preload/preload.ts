import { APP_GET_RUNTIME_INFO_CHANNEL } from "@showflow/contracts";
import { contextBridge, ipcRenderer } from "electron";

import { createShowflowDesktopApi } from "./api.mjs";

const showflowDesktopApi = createShowflowDesktopApi(() =>
  ipcRenderer.invoke(APP_GET_RUNTIME_INFO_CHANNEL, undefined),
);

contextBridge.exposeInMainWorld("showflow", showflowDesktopApi);
