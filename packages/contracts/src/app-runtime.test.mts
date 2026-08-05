import { expect, test } from "vitest";

import {
  DESKTOP_API_VERSION,
  GetRuntimeInfoResultSchema,
} from "./app-runtime.ts";

test("a valid runtime-info result passes the shared response contract", () => {
  const result = GetRuntimeInfoResultSchema.parse({
    ok: true,
    data: {
      applicationVersion: "0.0.0",
      desktopApiVersion: DESKTOP_API_VERSION,
      platform: "darwin",
      architecture: "arm64",
    },
  });

  expect(result.ok).toBe(true);
});

test("an invalid runtime-info result is rejected", () => {
  const result = GetRuntimeInfoResultSchema.safeParse({
    ok: true,
    data: {
      applicationVersion: "",
      desktopApiVersion: "unversioned",
      platform: "browser",
      architecture: "unknown",
    },
  });

  expect(result.success).toBe(false);
});
