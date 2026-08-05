import { describe, expect, test } from "vitest";

import {
  ApplicationSettingsService,
  PersistenceFailureError,
  type ApplicationSettings,
  type ApplicationSettingsRepository,
  type UpdateNavigationSettings,
  type WindowPreferences,
} from "@showflow/application";

import {
  handleGetApplicationSettingsRequest,
  handleUpdateNavigationSettingsRequest,
} from "./application-settings-handler.mjs";

class MemorySettingsRepository implements ApplicationSettingsRepository {
  settings: ApplicationSettings = {
    lastRoute: "/",
    lastStudioId: null,
    windowPreferences: null,
  };

  async get(): Promise<ApplicationSettings> {
    return this.settings;
  }

  async updateNavigation(
    navigation: UpdateNavigationSettings,
  ): Promise<ApplicationSettings> {
    this.settings = { ...this.settings, ...navigation };
    return this.settings;
  }

  async updateWindowPreferences(
    windowPreferences: WindowPreferences,
  ): Promise<ApplicationSettings> {
    this.settings = { ...this.settings, windowPreferences };
    return this.settings;
  }
}

describe("application settings handlers", () => {
  test("updates and queries settings through the application service", async () => {
    const service = new ApplicationSettingsService(
      new MemorySettingsRepository(),
    );
    const update = await handleUpdateNavigationSettingsRequest(
      { lastRoute: "/studio/new", lastStudioId: null },
      true,
      service,
    );

    expect(update).toEqual({
      ok: true,
      data: {
        lastRoute: "/studio/new",
        lastStudioId: null,
        windowPreferences: null,
      },
    });
    await expect(
      handleGetApplicationSettingsRequest(undefined, true, service),
    ).resolves.toEqual(update);
  });

  test("rejects untrusted senders and malformed updates", async () => {
    const service = new ApplicationSettingsService(
      new MemorySettingsRepository(),
    );

    await expect(
      handleGetApplicationSettingsRequest(undefined, false, service),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "IPC_UNTRUSTED_SENDER" },
    });
    await expect(
      handleUpdateNavigationSettingsRequest(
        { lastRoute: "https://example.com", lastStudioId: "not-a-uuid" },
        true,
        service,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "IPC_INVALID_REQUEST" },
    });
  });

  test("returns renderer-safe persistence failures without SQL or stack details", async () => {
    const lowLevelFailure = new Error(
      "SQLITE_ERROR near SELECT * FROM app_settings\n at database-service.mts:99",
    );
    const repository = new MemorySettingsRepository();
    repository.get = async () => {
      throw new PersistenceFailureError("read", lowLevelFailure);
    };
    repository.updateNavigation = async () => {
      throw new PersistenceFailureError("write", lowLevelFailure);
    };
    const service = new ApplicationSettingsService(repository);

    const readResult = await handleGetApplicationSettingsRequest(
      undefined,
      true,
      service,
    );
    const writeResult = await handleUpdateNavigationSettingsRequest(
      { lastRoute: "/studio/new", lastStudioId: null },
      true,
      service,
    );

    expect(readResult).toEqual({
      ok: false,
      error: {
        code: "PERSISTENCE_FAILURE",
        message:
          "Showflow could not load application settings. Your saved settings were not changed. Restart Showflow and try again.",
      },
    });
    expect(writeResult).toEqual({
      ok: false,
      error: {
        code: "PERSISTENCE_FAILURE",
        message:
          "Showflow could not save navigation settings. Your previous settings are still saved. Try again.",
      },
    });
    expect(JSON.stringify({ readResult, writeResult })).not.toMatch(
      /SQLITE|SELECT|app_settings|database-service|stack/u,
    );
  });

  test("maps unexpected service failures to an internal error", async () => {
    const repository = new MemorySettingsRepository();
    repository.get = async () => {
      throw new Error("Unexpected private implementation detail.");
    };
    const service = new ApplicationSettingsService(repository);

    await expect(
      handleGetApplicationSettingsRequest(undefined, true, service),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "INTERNAL_ERROR" },
    });
  });
});
