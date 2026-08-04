import assert from "node:assert/strict";
import test from "node:test";

import { DESKTOP_API_VERSION } from "@showflow/contracts";

import { handleGetRuntimeInfoRequest } from "./runtime-info-handler.mts";

const validRuntime = {
  applicationVersion: "0.0.0",
  platform: "darwin",
  architecture: "arm64",
} as const;

test("the handler returns validated runtime information", () => {
  assert.deepEqual(handleGetRuntimeInfoRequest(undefined, true, validRuntime), {
    ok: true,
    data: {
      applicationVersion: "0.0.0",
      desktopApiVersion: DESKTOP_API_VERSION,
      platform: "darwin",
      architecture: "arm64",
    },
  });
});

test("the handler rejects an untrusted sender", () => {
  const result = handleGetRuntimeInfoRequest(undefined, false, validRuntime);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "IPC_UNTRUSTED_SENDER");
  }
});

test("the handler rejects an unexpected request payload", () => {
  const result = handleGetRuntimeInfoRequest(
    { genericChannel: "anything" },
    true,
    validRuntime,
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "IPC_INVALID_REQUEST");
  }
});

test("the handler returns a structured error for an invalid response", () => {
  const result = handleGetRuntimeInfoRequest(undefined, true, {
    applicationVersion: "",
    platform: "browser",
    architecture: "unknown",
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "IPC_INVALID_RESPONSE");
  }
});
