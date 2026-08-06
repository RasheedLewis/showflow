import type {
  CreateStudioCommand,
  GetStudioQuery,
} from "@showflow/application";
import {
  STUDIOS_CREATE_CHANNEL,
  STUDIOS_GET_CHANNEL,
  type StudioResult,
} from "@showflow/contracts";
import { ipcMain, type BrowserWindow } from "electron";

import {
  handleCreateStudioRequest,
  handleGetStudioRequest,
} from "./studio-handler.mjs";
import { isTrustedIpcSender } from "./ipc-sender.mjs";

export interface StudioIpcOperations {
  readonly create: CreateStudioCommand;
  readonly get: GetStudioQuery;
}

export const registerStudioIpc = (
  window: BrowserWindow,
  trustedEntryUrl: string,
  operations: StudioIpcOperations,
): void => {
  ipcMain.removeHandler(STUDIOS_CREATE_CHANNEL);
  ipcMain.handle(
    STUDIOS_CREATE_CHANNEL,
    (event, request: unknown): Promise<StudioResult> =>
      handleCreateStudioRequest(
        request,
        isTrustedIpcSender(event, window, trustedEntryUrl),
        operations.create,
      ),
  );

  ipcMain.removeHandler(STUDIOS_GET_CHANNEL);
  ipcMain.handle(
    STUDIOS_GET_CHANNEL,
    (event, request: unknown): Promise<StudioResult> =>
      handleGetStudioRequest(
        request,
        isTrustedIpcSender(event, window, trustedEntryUrl),
        operations.get,
      ),
  );
};
