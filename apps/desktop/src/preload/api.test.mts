import assert from "node:assert/strict";
import test from "node:test";

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

  assert.deepEqual(await api.app.getRuntimeInfo(), validResult);
});

test("the preload API rejects an invalid runtime response", async () => {
  const api = createShowflowDesktopApi(async () => ({
    ok: true,
    data: { platform: "browser" },
  }));

  await assert.rejects(api.app.getRuntimeInfo());
});

test("the preload exposes no generic invocation surface", () => {
  const api = createShowflowDesktopApi(async () => validResult);

  assert.deepEqual(Object.keys(api), ["apiVersion", "app"]);
  assert.deepEqual(Object.keys(api.app), ["getRuntimeInfo"]);
  assert.equal("invoke" in api, false);
  assert.equal("invoke" in api.app, false);
  assert.equal(Object.isFrozen(api), true);
  assert.equal(Object.isFrozen(api.app), true);
});
