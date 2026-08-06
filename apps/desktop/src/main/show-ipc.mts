import type {
  CreateShowCommand,
  GetShowDesignQuery,
} from "@showflow/application";
import {
  SHOWS_CREATE_CHANNEL,
  SHOWS_GET_DESIGN_CHANNEL,
  type ShowDesignResult,
} from "@showflow/contracts";
import { ipcMain, type BrowserWindow } from "electron";

import {
  handleCreateShowRequest,
  handleGetShowDesignRequest,
} from "./show-handler.mjs";
import { isTrustedIpcSender } from "./ipc-sender.mjs";

export interface ShowIpcOperations {
  readonly create: CreateShowCommand;
  readonly getDesign: GetShowDesignQuery;
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
};
