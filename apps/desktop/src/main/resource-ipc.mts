import {
  RESOURCES_GET_URL_CHANNEL,
  RESOURCES_IMPORT_CHANNEL,
  RESOURCES_IMPORT_PATHS_CHANNEL,
  RESOURCES_LIST_CHANNEL,
  RESOURCES_LOCATE_CHANNEL,
  RESOURCES_REMOVE_CHANNEL,
  RESOURCES_RENAME_CHANNEL,
  RESOURCES_REPLACE_CHANNEL,
  RESOURCES_UPDATE_METADATA_CHANNEL,
  type ResourceListResult,
  type ResourceUrlResult,
} from "@showflow/contracts";
import { dialog, ipcMain, type BrowserWindow } from "electron";

import {
  handleGetResourceUrlRequest,
  handleImportResourcePathsRequest,
  handleListResourcesRequest,
  handleNativeImportResourcesRequest,
  handleRemoveResourceRequest,
  handleRenameResourceRequest,
  handleRepairResourceRequest,
  handleUpdateResourceMetadataRequest,
  type ResourceDialogPort,
  type ResourceOperations,
} from "./resource-handler.mjs";
import { isTrustedIpcSender } from "./ipc-sender.mjs";

const nativeDialogs: ResourceDialogPort = {
  async selectFiles(window, options) {
    const result = await dialog.showOpenDialog(window, {
      filters: [
        {
          name: "Supported media",
          extensions: [
            "png",
            "jpg",
            "jpeg",
            "gif",
            "webp",
            "mp4",
            "webm",
            "mp3",
            "wav",
            "ogg",
            "m4a",
          ],
        },
      ],
      properties: options.multiple
        ? ["openFile", "multiSelections"]
        : ["openFile"],
    });
    return result.canceled ? null : result.filePaths;
  },
};

export const registerResourceIpc = (
  window: BrowserWindow,
  trustedEntryUrl: string,
  operations: ResourceOperations,
  dialogs: ResourceDialogPort = nativeDialogs,
): void => {
  const trusted = (event: Electron.IpcMainInvokeEvent): boolean =>
    isTrustedIpcSender(event, window, trustedEntryUrl);
  const listHandler = (
    channel: string,
    handler: (
      request: unknown,
      trusted: boolean,
      operations: ResourceOperations,
    ) => Promise<ResourceListResult>,
  ): void => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, (event, request: unknown) =>
      handler(request, trusted(event), operations),
    );
  };

  listHandler(RESOURCES_LIST_CHANNEL, handleListResourcesRequest);
  listHandler(RESOURCES_IMPORT_PATHS_CHANNEL, handleImportResourcePathsRequest);
  listHandler(RESOURCES_REMOVE_CHANNEL, handleRemoveResourceRequest);
  listHandler(RESOURCES_RENAME_CHANNEL, handleRenameResourceRequest);
  listHandler(
    RESOURCES_UPDATE_METADATA_CHANNEL,
    handleUpdateResourceMetadataRequest,
  );

  ipcMain.removeHandler(RESOURCES_IMPORT_CHANNEL);
  ipcMain.handle(
    RESOURCES_IMPORT_CHANNEL,
    (event, request: unknown): Promise<ResourceListResult> =>
      handleNativeImportResourcesRequest(
        request,
        trusted(event),
        operations,
        dialogs,
        window,
      ),
  );
  for (const [channel, mode] of [
    [RESOURCES_LOCATE_CHANNEL, "locate"],
    [RESOURCES_REPLACE_CHANNEL, "replace"],
  ] as const) {
    ipcMain.removeHandler(channel);
    ipcMain.handle(
      channel,
      (event, request: unknown): Promise<ResourceListResult> =>
        handleRepairResourceRequest(
          request,
          trusted(event),
          operations,
          dialogs,
          window,
          mode,
        ),
    );
  }
  ipcMain.removeHandler(RESOURCES_GET_URL_CHANNEL);
  ipcMain.handle(
    RESOURCES_GET_URL_CHANNEL,
    (event, request: unknown): Promise<ResourceUrlResult> =>
      handleGetResourceUrlRequest(request, trusted(event), operations),
  );
};
