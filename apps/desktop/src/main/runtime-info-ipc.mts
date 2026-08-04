import {
  APP_GET_RUNTIME_INFO_CHANNEL,
  type GetRuntimeInfoResult,
} from "@showflow/contracts";
import {
  app,
  ipcMain,
  type BrowserWindow,
  type IpcMainInvokeEvent,
} from "electron";

import { handleGetRuntimeInfoRequest } from "./runtime-info-handler.mjs";
import { isTrustedApplicationNavigation } from "./security.mjs";

const isTrustedIpcSender = (
  event: IpcMainInvokeEvent,
  window: BrowserWindow,
  trustedEntryUrl: string,
): boolean => {
  const senderFrame = event.senderFrame;

  return (
    !window.isDestroyed() &&
    event.sender === window.webContents &&
    senderFrame !== null &&
    senderFrame === window.webContents.mainFrame &&
    isTrustedApplicationNavigation(senderFrame.url, trustedEntryUrl)
  );
};

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
