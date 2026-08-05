import type { BrowserWindow, IpcMainInvokeEvent } from "electron";

import { isTrustedApplicationNavigation } from "./security.mjs";

export const isTrustedIpcSender = (
  event: IpcMainInvokeEvent,
  window: BrowserWindow,
  trustedEntryUrl: string,
): boolean => {
  const senderFrame = event.senderFrame;

  return (
    !window.isDestroyed() &&
    event.sender === window.webContents &&
    senderFrame !== null &&
    senderFrame === window.webContents.mainFrame &&
    isTrustedApplicationNavigation(senderFrame.url, trustedEntryUrl)
  );
};
