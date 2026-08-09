import {
  COMPONENTS_ASSIGN_CHANNEL,
  COMPONENTS_LIST_CHANNEL,
  COMPONENTS_REMOVE_PLACEMENT_CHANNEL,
  COMPONENTS_UPDATE_PLACEMENT_CHANNEL,
} from "@showflow/contracts";
import { ipcMain, type BrowserWindow } from "electron";

import {
  handleAssignComponentRequest,
  handleListComponentsRequest,
  handleRemoveComponentPlacementRequest,
  handleUpdateComponentPlacementRequest,
  type ComponentOperations,
} from "./component-handler.mjs";
import { isTrustedIpcSender } from "./ipc-sender.mjs";

export const registerComponentIpc = (
  window: BrowserWindow,
  trustedEntryUrl: string,
  operations: ComponentOperations,
): void => {
  const trusted = (event: Electron.IpcMainInvokeEvent) =>
    isTrustedIpcSender(event, window, trustedEntryUrl);
  const handlers = [
    [COMPONENTS_LIST_CHANNEL, handleListComponentsRequest],
    [COMPONENTS_ASSIGN_CHANNEL, handleAssignComponentRequest],
    [
      COMPONENTS_UPDATE_PLACEMENT_CHANNEL,
      handleUpdateComponentPlacementRequest,
    ],
    [
      COMPONENTS_REMOVE_PLACEMENT_CHANNEL,
      handleRemoveComponentPlacementRequest,
    ],
  ] as const;
  for (const [channel, handler] of handlers) {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, (event, request: unknown) =>
      handler(request, trusted(event), operations),
    );
  }
};
