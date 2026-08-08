import { describe, expect, test } from "vitest";

import { ApplicationError } from "@showflow/application";
import type { BrowserWindow } from "electron";

import {
  handleGetResourceUrlRequest,
  handleNativeImportResourcesRequest,
  type ResourceOperations,
} from "./resource-handler.mjs";

const operations = {
  accessUrls: {
    issueUrl: async () => {
      throw new ApplicationError(
        "NOT_FOUND",
        "Resource is not available in this Studio.",
      );
    },
  },
  delete: { execute: async () => undefined },
  import: { execute: async () => [] },
  list: { execute: async () => [] },
  repair: {
    execute: async () => {
      throw new Error("not used");
    },
  },
  rename: {
    execute: async () => {
      throw new Error("not used");
    },
  },
  updateMetadata: {
    execute: async () => {
      throw new Error("not used");
    },
  },
} satisfies ResourceOperations;

describe("Resource IPC handlers", () => {
  test("9.T5 returns a controlled error for an unknown Resource", async () => {
    const result = await handleGetResourceUrlRequest(
      {
        resourceId: "514ad6df-710d-4301-9bff-b096e9db3dd4",
        studioId: "8d9df01f-2584-4b9a-ad13-a96d673918e9",
        variant: "content",
      },
      true,
      operations,
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Resource is not available in this Studio.",
      },
    });
  });

  test("9.T13 explains how to recover when file permission is denied", async () => {
    const result = await handleNativeImportResourcesRequest(
      {
        context: {
          scope: "studio",
          studioId: "8d9df01f-2584-4b9a-ad13-a96d673918e9",
        },
      },
      true,
      operations,
      {
        selectFiles: async () => {
          throw new ApplicationError(
            "PERMISSION_DENIED",
            "Showflow does not have permission to read artwork.png. Choose the file again or update its file permissions.",
          );
        },
      },
      {} as BrowserWindow,
    );

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "PERMISSION_DENIED",
        message: expect.stringContaining("Choose the file again"),
      },
    });
  });
});
