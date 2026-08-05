import { describe, expect, test } from "vitest";

import {
  ApplicationSettingsResultSchema,
  UpdateNavigationSettingsRequestSchema,
} from "./application-settings.ts";

describe("application settings contracts", () => {
  test("accepts serializable settings and navigation updates", () => {
    expect(
      ApplicationSettingsResultSchema.safeParse({
        ok: true,
        data: {
          lastRoute: "/studio/8d9df01f-2584-4b9a-ad13-a96d673918e9",
          lastStudioId: "8d9df01f-2584-4b9a-ad13-a96d673918e9",
          windowPreferences: {
            height: 800,
            isMaximized: false,
            width: 1280,
          },
        },
      }).success,
    ).toBe(true);
    expect(
      UpdateNavigationSettingsRequestSchema.safeParse({
        lastRoute: "/studio/new",
        lastStudioId: null,
      }).success,
    ).toBe(true);
  });

  test("rejects invalid UUIDs, external routes, and window bounds", () => {
    expect(
      ApplicationSettingsResultSchema.safeParse({
        ok: true,
        data: {
          lastRoute: "https://example.com",
          lastStudioId: "Studio One",
          windowPreferences: {
            height: -1,
            isMaximized: false,
            width: 0,
          },
        },
      }).success,
    ).toBe(false);
  });
});
