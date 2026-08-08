import {
  LAYOUTS_ARCHIVE_CHANNEL,
  LAYOUTS_CREATE_CHANNEL,
  LAYOUTS_DUPLICATE_CHANNEL,
  LAYOUTS_GET_CHANNEL,
  LAYOUTS_LIST_CHANNEL,
  LAYOUTS_RENAME_CHANNEL,
  LAYOUTS_UPDATE_CHANNEL,
  type LayoutCatalogResult,
  type LayoutResult,
} from "@showflow/contracts";
import { ipcMain, type BrowserWindow } from "electron";

import {
  handleArchiveLayoutRequest,
  handleCreateLayoutRequest,
  handleDuplicateLayoutRequest,
  handleGetLayoutRequest,
  handleListLayoutsRequest,
  handleRenameLayoutRequest,
  handleUpdateLayoutRequest,
  type LayoutOperations,
} from "./layout-handler.mjs";
import { isTrustedIpcSender } from "./ipc-sender.mjs";

export const registerLayoutIpc = (
  window: BrowserWindow,
  trustedEntryUrl: string,
  operations: LayoutOperations,
): void => {
  const trusted = (event: Electron.IpcMainInvokeEvent) =>
    isTrustedIpcSender(event, window, trustedEntryUrl);
  const handlers: readonly [
    string,
    (
      request: unknown,
      trusted: boolean,
      operations: LayoutOperations,
    ) => Promise<LayoutResult | LayoutCatalogResult>,
  ][] = [
    [LAYOUTS_LIST_CHANNEL, handleListLayoutsRequest],
    [LAYOUTS_GET_CHANNEL, handleGetLayoutRequest],
    [LAYOUTS_CREATE_CHANNEL, handleCreateLayoutRequest],
    [LAYOUTS_DUPLICATE_CHANNEL, handleDuplicateLayoutRequest],
    [LAYOUTS_RENAME_CHANNEL, handleRenameLayoutRequest],
    [LAYOUTS_ARCHIVE_CHANNEL, handleArchiveLayoutRequest],
    [LAYOUTS_UPDATE_CHANNEL, handleUpdateLayoutRequest],
  ];
  for (const [channel, handler] of handlers) {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, (event, request: unknown) =>
      handler(request, trusted(event), operations),
    );
  }
};
