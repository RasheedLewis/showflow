import {
  BLUEPRINTS_ADD_SEGMENT_CHANNEL,
  BLUEPRINTS_DUPLICATE_CHANNEL,
  BLUEPRINTS_REMOVE_CHANNEL,
  BLUEPRINTS_REORDER_CHANNEL,
  SEGMENTS_ARCHIVE_CHANNEL,
  SEGMENTS_CREATE_CHANNEL,
  type ShowDesignResult,
} from "@showflow/contracts";
import { ipcMain, type BrowserWindow } from "electron";

import {
  handleAddBlueprintSegmentRequest,
  handleArchiveSegmentRequest,
  handleCreateSegmentRequest,
  handleDuplicateBlueprintPlacementRequest,
  handleRemoveBlueprintPlacementRequest,
  handleReorderBlueprintRequest,
  type DesignShowOperations,
} from "./design-show-handler.mjs";
import { isTrustedIpcSender } from "./ipc-sender.mjs";

export const registerDesignShowIpc = (
  window: BrowserWindow,
  trustedEntryUrl: string,
  operations: DesignShowOperations,
): void => {
  const trusted = (event: Electron.IpcMainInvokeEvent): boolean =>
    isTrustedIpcSender(event, window, trustedEntryUrl);

  ipcMain.removeHandler(SEGMENTS_CREATE_CHANNEL);
  ipcMain.handle(
    SEGMENTS_CREATE_CHANNEL,
    (event, request: unknown): Promise<ShowDesignResult> =>
      handleCreateSegmentRequest(request, trusted(event), operations),
  );
  ipcMain.removeHandler(SEGMENTS_ARCHIVE_CHANNEL);
  ipcMain.handle(
    SEGMENTS_ARCHIVE_CHANNEL,
    (event, request: unknown): Promise<ShowDesignResult> =>
      handleArchiveSegmentRequest(request, trusted(event), operations),
  );
  ipcMain.removeHandler(BLUEPRINTS_ADD_SEGMENT_CHANNEL);
  ipcMain.handle(
    BLUEPRINTS_ADD_SEGMENT_CHANNEL,
    (event, request: unknown): Promise<ShowDesignResult> =>
      handleAddBlueprintSegmentRequest(request, trusted(event), operations),
  );
  ipcMain.removeHandler(BLUEPRINTS_REORDER_CHANNEL);
  ipcMain.handle(
    BLUEPRINTS_REORDER_CHANNEL,
    (event, request: unknown): Promise<ShowDesignResult> =>
      handleReorderBlueprintRequest(request, trusted(event), operations),
  );
  ipcMain.removeHandler(BLUEPRINTS_DUPLICATE_CHANNEL);
  ipcMain.handle(
    BLUEPRINTS_DUPLICATE_CHANNEL,
    (event, request: unknown): Promise<ShowDesignResult> =>
      handleDuplicateBlueprintPlacementRequest(
        request,
        trusted(event),
        operations,
      ),
  );
  ipcMain.removeHandler(BLUEPRINTS_REMOVE_CHANNEL);
  ipcMain.handle(
    BLUEPRINTS_REMOVE_CHANNEL,
    (event, request: unknown): Promise<ShowDesignResult> =>
      handleRemoveBlueprintPlacementRequest(
        request,
        trusted(event),
        operations,
      ),
  );
};
