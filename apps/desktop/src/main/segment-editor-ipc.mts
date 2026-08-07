import {
  SEGMENTS_CREATE_FIELD_CHANNEL,
  SEGMENTS_DELETE_FIELD_CHANNEL,
  SEGMENTS_GET_EDITOR_CHANNEL,
  SEGMENTS_REORDER_FIELDS_CHANNEL,
  SEGMENTS_RESTORE_FIELD_CHANNEL,
  SEGMENTS_UPDATE_DETAILS_CHANNEL,
  SEGMENTS_UPDATE_FIELD_CHANNEL,
  type ShowSegmentEditorResult,
} from "@showflow/contracts";
import { ipcMain, type BrowserWindow } from "electron";

import {
  handleCreateSegmentFieldRequest,
  handleDeleteSegmentFieldRequest,
  handleGetSegmentEditorRequest,
  handleReorderSegmentFieldsRequest,
  handleRestoreSegmentFieldRequest,
  handleUpdateSegmentDetailsRequest,
  handleUpdateSegmentFieldRequest,
  type SegmentEditorOperations,
} from "./segment-editor-handler.mjs";
import { isTrustedIpcSender } from "./ipc-sender.mjs";

export const registerSegmentEditorIpc = (
  window: BrowserWindow,
  trustedEntryUrl: string,
  operations: SegmentEditorOperations,
): void => {
  const trusted = (event: Electron.IpcMainInvokeEvent): boolean =>
    isTrustedIpcSender(event, window, trustedEntryUrl);
  const handlers = [
    [SEGMENTS_GET_EDITOR_CHANNEL, handleGetSegmentEditorRequest],
    [SEGMENTS_UPDATE_DETAILS_CHANNEL, handleUpdateSegmentDetailsRequest],
    [SEGMENTS_CREATE_FIELD_CHANNEL, handleCreateSegmentFieldRequest],
    [SEGMENTS_UPDATE_FIELD_CHANNEL, handleUpdateSegmentFieldRequest],
    [SEGMENTS_DELETE_FIELD_CHANNEL, handleDeleteSegmentFieldRequest],
    [SEGMENTS_RESTORE_FIELD_CHANNEL, handleRestoreSegmentFieldRequest],
    [SEGMENTS_REORDER_FIELDS_CHANNEL, handleReorderSegmentFieldsRequest],
  ] as const;
  for (const [channel, handler] of handlers) {
    ipcMain.removeHandler(channel);
    ipcMain.handle(
      channel,
      (event, request: unknown): Promise<ShowSegmentEditorResult> =>
        handler(request, trusted(event), operations),
    );
  }
};
