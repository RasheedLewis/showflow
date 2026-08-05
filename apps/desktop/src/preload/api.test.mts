import { expect, test } from "vitest";

import { DESKTOP_API_VERSION } from "@showflow/contracts";

import { createShowflowDesktopApi } from "./api.mts";

const validResult = {
  ok: true,
  data: {
    applicationVersion: "0.0.0",
    desktopApiVersion: DESKTOP_API_VERSION,
    platform: "darwin",
    architecture: "arm64",
  },
} as const;

test("the preload API validates and returns runtime information", async () => {
  const api = createShowflowDesktopApi(async () => validResult);

  await expect(api.app.getRuntimeInfo()).resolves.toEqual(validResult);
});

test("the preload API rejects an invalid runtime response", async () => {
  const api = createShowflowDesktopApi(async () => ({
    ok: true,
    data: { platform: "browser" },
  }));

  await expect(api.app.getRuntimeInfo()).rejects.toThrow();
});

test("the preload exposes no generic invocation surface", () => {
  const api = createShowflowDesktopApi(async () => validResult);

  expect(Object.keys(api)).toEqual(["apiVersion", "app"]);
  expect(Object.keys(api.app)).toEqual(["getRuntimeInfo"]);
  expect("invoke" in api).toBe(false);
  expect("invoke" in api.app).toBe(false);
  expect(Object.isFrozen(api)).toBe(true);
  expect(Object.isFrozen(api.app)).toBe(true);
});
