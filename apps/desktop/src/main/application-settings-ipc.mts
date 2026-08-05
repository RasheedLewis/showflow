import type { ApplicationSettingsService } from "@showflow/application";
import {
  SETTINGS_GET_APPLICATION_SETTINGS_CHANNEL,
  SETTINGS_UPDATE_NAVIGATION_CHANNEL,
  type ApplicationSettingsResult,
} from "@showflow/contracts";
import { ipcMain, type BrowserWindow } from "electron";

import {
  handleGetApplicationSettingsRequest,
  handleUpdateNavigationSettingsRequest,
} from "./application-settings-handler.mjs";
import { isTrustedIpcSender } from "./ipc-sender.mjs";

export const registerApplicationSettingsIpc = (
  window: BrowserWindow,
  trustedEntryUrl: string,
  service: ApplicationSettingsService,
): void => {
  ipcMain.removeHandler(SETTINGS_GET_APPLICATION_SETTINGS_CHANNEL);
  ipcMain.handle(
    SETTINGS_GET_APPLICATION_SETTINGS_CHANNEL,
    (event, request: unknown): Promise<ApplicationSettingsResult> =>
      handleGetApplicationSettingsRequest(
        request,
        isTrustedIpcSender(event, window, trustedEntryUrl),
        service,
      ),
  );

  ipcMain.removeHandler(SETTINGS_UPDATE_NAVIGATION_CHANNEL);
  ipcMain.handle(
    SETTINGS_UPDATE_NAVIGATION_CHANNEL,
    (event, request: unknown): Promise<ApplicationSettingsResult> =>
      handleUpdateNavigationSettingsRequest(
        request,
        isTrustedIpcSender(event, window, trustedEntryUrl),
        service,
      ),
  );
};
