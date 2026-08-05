import { describe, expect, test } from "vitest";

import {
  ApplicationSettingsService,
  type ApplicationSettings,
  type ApplicationSettingsRepository,
  type UpdateNavigationSettings,
  type WindowPreferences,
} from "./application-settings.mjs";

const initialSettings: ApplicationSettings = {
  lastRoute: "/",
  lastStudioId: null,
  windowPreferences: null,
};

class CapturingSettingsRepository implements ApplicationSettingsRepository {
  settings = initialSettings;

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

describe("ApplicationSettingsService", () => {
  test("queries settings through the repository port", async () => {
    const repository = new CapturingSettingsRepository();
    const service = new ApplicationSettingsService(repository);

    await expect(service.get()).resolves.toEqual(initialSettings);
  });

  test("persists navigation and window preferences through the repository port", async () => {
    const repository = new CapturingSettingsRepository();
    const service = new ApplicationSettingsService(repository);
    const navigation = {
      lastRoute: "/studio/8d9df01f-2584-4b9a-ad13-a96d673918e9",
      lastStudioId: "8d9df01f-2584-4b9a-ad13-a96d673918e9",
    } as const;
    const windowPreferences = {
      height: 800,
      isMaximized: false,
      width: 1280,
    } as const;

    await expect(service.updateNavigation(navigation)).resolves.toMatchObject(
      navigation,
    );
    await expect(
      service.updateWindowPreferences(windowPreferences),
    ).resolves.toMatchObject({ windowPreferences });
  });
});
