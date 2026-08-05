import { describe, expect, test } from "vitest";

import {
  ApplicationSettingsService,
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
});
