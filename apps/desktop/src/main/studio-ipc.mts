import type {
  CreateStudioCommand,
  GetStudioQuery,
  ListStudiosQuery,
} from "@showflow/application";
import {
  STUDIOS_CREATE_CHANNEL,
  STUDIOS_GET_CHANNEL,
  STUDIOS_LIST_CHANNEL,
  type StudioListResult,
  type StudioResult,
} from "@showflow/contracts";
import { ipcMain, type BrowserWindow } from "electron";

import {
  handleCreateStudioRequest,
  handleGetStudioRequest,
  handleListStudiosRequest,
} from "./studio-handler.mjs";
import { isTrustedIpcSender } from "./ipc-sender.mjs";

export interface StudioIpcOperations {
  readonly create: CreateStudioCommand;
  readonly get: GetStudioQuery;
  readonly list: ListStudiosQuery;
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

  ipcMain.removeHandler(STUDIOS_LIST_CHANNEL);
  ipcMain.handle(
    STUDIOS_LIST_CHANNEL,
    (event, request: unknown): Promise<StudioListResult> =>
      handleListStudiosRequest(
        request,
        isTrustedIpcSender(event, window, trustedEntryUrl),
        operations.list,
      ),
  );
};
