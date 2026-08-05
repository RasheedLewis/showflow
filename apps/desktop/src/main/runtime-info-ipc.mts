import {
  APP_GET_RUNTIME_INFO_CHANNEL,
  type GetRuntimeInfoResult,
} from "@showflow/contracts";
import { app, ipcMain, type BrowserWindow } from "electron";

import { handleGetRuntimeInfoRequest } from "./runtime-info-handler.mjs";
import { isTrustedIpcSender } from "./ipc-sender.mjs";

export const registerRuntimeInfoIpc = (
  window: BrowserWindow,
  trustedEntryUrl: string,
): void => {
  ipcMain.removeHandler(APP_GET_RUNTIME_INFO_CHANNEL);
  ipcMain.handle(
    APP_GET_RUNTIME_INFO_CHANNEL,
    (event, request: unknown): GetRuntimeInfoResult =>
      handleGetRuntimeInfoRequest(
        request,
        isTrustedIpcSender(event, window, trustedEntryUrl),
        {
          applicationVersion: app.getVersion(),
          platform: process.platform,
          architecture: process.arch,
        },
      ),
  );
};
