import {
  EPISODES_CREATE_CHANNEL,
  EPISODES_CREATE_SEGMENT_CHANNEL,
  EPISODES_DUPLICATE_SEGMENT_CHANNEL,
  EPISODES_GET_CHANNEL,
  EPISODES_INSERT_SEGMENT_CHANNEL,
  EPISODES_LIST_CHANNEL,
  EPISODES_REMOVE_SEGMENT_CHANNEL,
  EPISODES_REORDER_CHANNEL,
  EPISODES_RESTORE_SEGMENT_CHANNEL,
  type EpisodeListResult,
  type EpisodeStoryboardResult,
} from "@showflow/contracts";
import { ipcMain, type BrowserWindow } from "electron";

import {
  handleCreateEpisodeRequest,
  handleEpisodeMutationRequest,
  handleGetEpisodeRequest,
  handleListEpisodesRequest,
  type EpisodeOperations,
} from "./episode-handler.mjs";
import { isTrustedIpcSender } from "./ipc-sender.mjs";

export const registerEpisodeIpc = (
  window: BrowserWindow,
  trustedEntryUrl: string,
  operations: EpisodeOperations,
): void => {
  const trusted = (event: Electron.IpcMainInvokeEvent): boolean =>
    isTrustedIpcSender(event, window, trustedEntryUrl);
  const storyboardHandler = (
    channel: string,
    kind: "reorder" | "duplicate" | "remove" | "insert" | "create" | "restore",
  ): void => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(
      channel,
      (event, request: unknown): Promise<EpisodeStoryboardResult> =>
        handleEpisodeMutationRequest(request, trusted(event), operations, kind),
    );
  };

  ipcMain.removeHandler(EPISODES_CREATE_CHANNEL);
  ipcMain.handle(
    EPISODES_CREATE_CHANNEL,
    (event, request: unknown): Promise<EpisodeStoryboardResult> =>
      handleCreateEpisodeRequest(request, trusted(event), operations),
  );
  ipcMain.removeHandler(EPISODES_GET_CHANNEL);
  ipcMain.handle(
    EPISODES_GET_CHANNEL,
    (event, request: unknown): Promise<EpisodeStoryboardResult> =>
      handleGetEpisodeRequest(request, trusted(event), operations),
  );
  ipcMain.removeHandler(EPISODES_LIST_CHANNEL);
  ipcMain.handle(
    EPISODES_LIST_CHANNEL,
    (event, request: unknown): Promise<EpisodeListResult> =>
      handleListEpisodesRequest(request, trusted(event), operations),
  );
  storyboardHandler(EPISODES_REORDER_CHANNEL, "reorder");
  storyboardHandler(EPISODES_DUPLICATE_SEGMENT_CHANNEL, "duplicate");
  storyboardHandler(EPISODES_REMOVE_SEGMENT_CHANNEL, "remove");
  storyboardHandler(EPISODES_INSERT_SEGMENT_CHANNEL, "insert");
  storyboardHandler(EPISODES_CREATE_SEGMENT_CHANNEL, "create");
  storyboardHandler(EPISODES_RESTORE_SEGMENT_CHANNEL, "restore");
};
