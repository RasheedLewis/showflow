import path from "node:path";
import { pathToFileURL } from "node:url";

import { app, BrowserWindow, shell, type Session } from "electron";

import {
  createSecureWebPreferences,
  getTrustedDevelopmentUrl,
  isApprovedExternalUrl,
  isTrustedApplicationNavigation,
} from "./security.mjs";
import { registerRuntimeInfoIpc } from "./runtime-info-ipc.mjs";

let mainWindow: BrowserWindow | null = null;
const securedSessions = new WeakSet<Session>();

type MainWindowContent =
  | Readonly<{ kind: "file"; path: string; trustedUrl: string }>
  | Readonly<{ kind: "url"; url: string; trustedUrl: string }>;

const getMainWindowContent = (): MainWindowContent => {
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const url = getTrustedDevelopmentUrl(MAIN_WINDOW_VITE_DEV_SERVER_URL);

    return { kind: "url", url, trustedUrl: url };
  }

  const rendererPath = path.join(
    __dirname,
    `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`,
  );

  return {
    kind: "file",
    path: rendererPath,
    trustedUrl: pathToFileURL(rendererPath).href,
  };
};

const configurePermissionPolicy = (electronSession: Session): void => {
  if (securedSessions.has(electronSession)) {
    return;
  }

  electronSession.setPermissionCheckHandler(() => false);
  electronSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false),
  );
  electronSession.setDevicePermissionHandler(() => false);
  securedSessions.add(electronSession);
};

const openApprovedExternalUrl = (url: string): void => {
  if (!isApprovedExternalUrl(url)) {
    return;
  }

  void shell.openExternal(url).catch((error: unknown) => {
    console.error("Showflow could not open the external link.", error);
  });
};

const configureNavigationPolicy = (
  window: BrowserWindow,
  trustedEntryUrl: string,
): void => {
  window.webContents.setWindowOpenHandler(({ url }) => {
    openApprovedExternalUrl(url);

    return { action: "deny" };
  });

  const preventUnexpectedNavigation = (
    event: Electron.Event,
    url: string,
  ): void => {
    if (isTrustedApplicationNavigation(url, trustedEntryUrl)) {
      return;
    }

    event.preventDefault();
    openApprovedExternalUrl(url);
  };

  window.webContents.on("will-navigate", preventUnexpectedNavigation);
  window.webContents.on("will-redirect", preventUnexpectedNavigation);
  window.webContents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
};

const createMainWindow = async (): Promise<void> => {
  const content = getMainWindowContent();
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    webPreferences: createSecureWebPreferences(
      path.join(__dirname, "preload.js"),
    ),
  });

  configurePermissionPolicy(window.webContents.session);
  configureNavigationPolicy(window, content.trustedUrl);
  registerRuntimeInfoIpc(window, content.trustedUrl);

  window.once("ready-to-show", () => {
    window.show();
  });

  if (content.kind === "url") {
    await window.loadURL(content.url);
  } else {
    await window.loadFile(content.path);
  }

  mainWindow = window;
};

app
  .whenReady()
  .then(async () => {
    await createMainWindow();

    app.on("activate", () => {
      if (mainWindow === null) {
        void createMainWindow();
      }
    });
  })
  .catch((error: unknown) => {
    console.error("Showflow failed to start.", error);
    app.quit();
  });

app.on("window-all-closed", () => {
  mainWindow = null;

  if (process.platform !== "darwin") {
    app.quit();
  }
});
