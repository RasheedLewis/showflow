import type {
  CreateShowCommand,
  ArchiveShowCommand,
  DeleteShowCommand,
  GetShowDesignQuery,
  ListStudioShowsQuery,
  RenameShowCommand,
} from "@showflow/application";
import {
  SHOWS_CREATE_CHANNEL,
  SHOWS_ARCHIVE_CHANNEL,
  SHOWS_DELETE_CHANNEL,
  SHOWS_GET_DESIGN_CHANNEL,
  SHOWS_LIST_CHANNEL,
  SHOWS_RENAME_CHANNEL,
  type ShowDeleteResult,
  type ShowDesignResult,
  type ShowListResult,
  type ShowResult,
} from "@showflow/contracts";
import { ipcMain, type BrowserWindow } from "electron";

import {
  handleCreateShowRequest,
  handleArchiveShowRequest,
  handleDeleteShowRequest,
  handleGetShowDesignRequest,
  handleListShowsRequest,
  handleRenameShowRequest,
} from "./show-handler.mjs";
import { isTrustedIpcSender } from "./ipc-sender.mjs";

export interface ShowIpcOperations {
  readonly archive: ArchiveShowCommand;
  readonly create: CreateShowCommand;
  readonly delete: DeleteShowCommand;
  readonly getDesign: GetShowDesignQuery;
  readonly list: ListStudioShowsQuery;
  readonly rename: RenameShowCommand;
}

export const registerShowIpc = (
  window: BrowserWindow,
  trustedEntryUrl: string,
  operations: ShowIpcOperations,
): void => {
  ipcMain.removeHandler(SHOWS_CREATE_CHANNEL);
  ipcMain.handle(
    SHOWS_CREATE_CHANNEL,
    (event, request: unknown): Promise<ShowDesignResult> =>
      handleCreateShowRequest(
        request,
        isTrustedIpcSender(event, window, trustedEntryUrl),
        operations.create,
      ),
  );
  ipcMain.removeHandler(SHOWS_GET_DESIGN_CHANNEL);
  ipcMain.handle(
    SHOWS_GET_DESIGN_CHANNEL,
    (event, request: unknown): Promise<ShowDesignResult> =>
      handleGetShowDesignRequest(
        request,
        isTrustedIpcSender(event, window, trustedEntryUrl),
        operations.getDesign,
      ),
  );
  ipcMain.removeHandler(SHOWS_LIST_CHANNEL);
  ipcMain.handle(
    SHOWS_LIST_CHANNEL,
    (event, request: unknown): Promise<ShowListResult> =>
      handleListShowsRequest(
        request,
        isTrustedIpcSender(event, window, trustedEntryUrl),
        operations.list,
      ),
  );
  ipcMain.removeHandler(SHOWS_RENAME_CHANNEL);
  ipcMain.handle(
    SHOWS_RENAME_CHANNEL,
    (event, request: unknown): Promise<ShowResult> =>
      handleRenameShowRequest(
        request,
        isTrustedIpcSender(event, window, trustedEntryUrl),
        operations.rename,
      ),
  );
  ipcMain.removeHandler(SHOWS_ARCHIVE_CHANNEL);
  ipcMain.handle(
    SHOWS_ARCHIVE_CHANNEL,
    (event, request: unknown): Promise<ShowResult> =>
      handleArchiveShowRequest(
        request,
        isTrustedIpcSender(event, window, trustedEntryUrl),
        operations.archive,
      ),
  );
  ipcMain.removeHandler(SHOWS_DELETE_CHANNEL);
  ipcMain.handle(
    SHOWS_DELETE_CHANNEL,
    (event, request: unknown): Promise<ShowDeleteResult> =>
      handleDeleteShowRequest(
        request,
        isTrustedIpcSender(event, window, trustedEntryUrl),
        operations.delete,
      ),
  );
};
