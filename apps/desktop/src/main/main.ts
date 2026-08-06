import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  ApplicationSettingsService,
  ArchiveShowCommand,
  CreateStudioCommand,
  CreateShowCommand,
  DeleteShowCommand,
  GetShowDesignQuery,
  GetStudioQuery,
  ListStudiosQuery,
  ListStudioShowsQuery,
  RenameShowCommand,
} from "@showflow/application";
import {
  initializePersistence,
  SqliteApplicationSettingsRepository,
  SqliteShowBlueprintRepository,
  SqliteShowCreationRepository,
  SqliteShowRepository,
  SqliteStudioRepository,
  type InitializedPersistence,
  type MigrationLogger,
} from "@showflow/persistence";
import { app, BrowserWindow, shell, type Session } from "electron";

import { registerApplicationSettingsIpc } from "./application-settings-ipc.mjs";
import {
  createSecureWebPreferences,
  getTrustedDevelopmentUrl,
  isApprovedExternalUrl,
  isTrustedApplicationNavigation,
} from "./security.mjs";
import { runRequestedNodeSqliteSpike } from "./node-sqlite-spike-entry.mjs";
import { registerRuntimeInfoIpc } from "./runtime-info-ipc.mjs";
import { registerStudioIpc, type StudioIpcOperations } from "./studio-ipc.mjs";
import { registerShowIpc, type ShowIpcOperations } from "./show-ipc.mjs";

let mainWindow: BrowserWindow | null = null;
let initializedPersistence: InitializedPersistence | null = null;
const securedSessions = new WeakSet<Session>();
const MVP_BACKUP_RETENTION_COUNT = 5;

interface DesktopServices {
  readonly applicationSettings: ApplicationSettingsService;
  readonly persistence: InitializedPersistence;
  readonly studios: StudioIpcOperations;
  readonly shows: ShowIpcOperations;
}

const migrationLogger: MigrationLogger = {
  log(event): void {
    if (event.type === "migration-failed") {
      console.error("Showflow migration failed.", event);
      return;
    }

    console.info("Showflow migration event.", event);
  },
};

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

const getMigrationsDirectory = (): string =>
  app.isPackaged
    ? path.join(process.resourcesPath, "migrations")
    : path.resolve(app.getAppPath(), "../../migrations");

const initializeDesktopServices = async (): Promise<DesktopServices> => {
  const userDataDirectory = app.getPath("userData");
  const persistence = await initializePersistence({
    backup: {
      backupsDirectory: path.join(userDataDirectory, "backups"),
      retentionCount: MVP_BACKUP_RETENTION_COUNT,
    },
    databasePath: path.join(userDataDirectory, "showflow.sqlite"),
    logger: migrationLogger,
    migrationsDirectory: getMigrationsDirectory(),
  });
  const settingsRepository = new SqliteApplicationSettingsRepository(
    persistence.database,
  );
  const studioRepository = new SqliteStudioRepository(persistence.database);
  const showRepository = new SqliteShowRepository(persistence.database);
  const blueprintRepository = new SqliteShowBlueprintRepository(
    persistence.database,
  );

  return {
    applicationSettings: new ApplicationSettingsService(settingsRepository),
    persistence,
    studios: {
      create: new CreateStudioCommand(studioRepository),
      get: new GetStudioQuery(studioRepository),
      list: new ListStudiosQuery(studioRepository),
    },
    shows: {
      archive: new ArchiveShowCommand(showRepository),
      create: new CreateShowCommand({
        studios: studioRepository,
        showCreation: new SqliteShowCreationRepository(persistence.database),
      }),
      delete: new DeleteShowCommand({
        shows: showRepository,
        showDeletion: showRepository,
      }),
      getDesign: new GetShowDesignQuery({
        shows: showRepository,
        blueprints: blueprintRepository,
      }),
      list: new ListStudioShowsQuery({
        studios: studioRepository,
        shows: showRepository,
      }),
      rename: new RenameShowCommand(showRepository),
    },
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

const createMainWindow = async (
  applicationSettings: ApplicationSettingsService,
  studios: StudioIpcOperations,
  shows: ShowIpcOperations,
): Promise<void> => {
  const content = getMainWindowContent();
  const settings = await applicationSettings.get();
  const windowPreferences = settings.windowPreferences;
  const window = new BrowserWindow({
    width: windowPreferences?.width ?? 1280,
    height: windowPreferences?.height ?? 800,
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
  registerApplicationSettingsIpc(
    window,
    content.trustedUrl,
    applicationSettings,
  );
  registerStudioIpc(window, content.trustedUrl, studios);
  registerShowIpc(window, content.trustedUrl, shows);

  window.on("close", () => {
    const bounds = window.getNormalBounds();

    void applicationSettings
      .updateWindowPreferences({
        height: bounds.height,
        isMaximized: window.isMaximized(),
        width: bounds.width,
      })
      .catch((error: unknown) => {
        console.error("Showflow could not save window preferences.", error);
      });
  });

  window.once("ready-to-show", () => {
    if (windowPreferences?.isMaximized === true) {
      window.maximize();
    }

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
    if (await runRequestedNodeSqliteSpike()) {
      app.quit();
      return;
    }

    const services = await initializeDesktopServices();
    initializedPersistence = services.persistence;
    await createMainWindow(
      services.applicationSettings,
      services.studios,
      services.shows,
    );

    app.on("activate", () => {
      if (mainWindow === null) {
        void createMainWindow(
          services.applicationSettings,
          services.studios,
          services.shows,
        ).catch((error: unknown) => {
          console.error("Showflow could not reopen its window.", error);
        });
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

app.on("will-quit", () => {
  initializedPersistence?.database.close();
  initializedPersistence = null;
});
