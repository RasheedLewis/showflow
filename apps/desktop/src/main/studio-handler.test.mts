import { describe, expect, test } from "vitest";

import {
  ApplicationError,
  PersistenceFailureError,
} from "@showflow/application";
import {
  parseEntityId,
  parseUtcTimestamp,
  type Studio,
  type StudioId,
} from "@showflow/domain";

import {
  handleCreateStudioRequest,
  handleGetStudioRequest,
} from "./studio-handler.mjs";

const STUDIO_ID = parseEntityId<"studio">(
  "8d9df01f-2584-4b9a-ad13-a96d673918e9",
);
const TIMESTAMP = parseUtcTimestamp("2026-08-06T14:30:00.000Z");
const studio = {
  id: STUDIO_ID,
  name: "Public Sphere",
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
} satisfies Studio;

describe("Studio IPC handlers", () => {
  test("creates and loads a Studio through application operations", async () => {
    const create = {
      execute: async ({ name }: { readonly name: string }) => ({
        ...studio,
        name,
      }),
    };
    const get = {
      execute: async (studioId: StudioId) => ({ ...studio, id: studioId }),
    };

    await expect(
      handleCreateStudioRequest({ name: "  Public Sphere  " }, true, create),
    ).resolves.toEqual({
      ok: true,
      data: {
        archivedAt: null,
        createdAt: TIMESTAMP,
        id: STUDIO_ID,
        logoResourceId: null,
        name: "Public Sphere",
        updatedAt: TIMESTAMP,
      },
    });
    await expect(
      handleGetStudioRequest({ studioId: STUDIO_ID }, true, get),
    ).resolves.toMatchObject({
      ok: true,
      data: { id: STUDIO_ID, name: "Public Sphere" },
    });
  });

  test("rejects untrusted senders and malformed requests", async () => {
    const create = { execute: async () => studio };
    const get = { execute: async () => studio };

    await expect(
      handleCreateStudioRequest({ name: "Public Sphere" }, false, create),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "IPC_UNTRUSTED_SENDER" },
    });
    await expect(
      handleCreateStudioRequest({ name: "   " }, true, create),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "IPC_INVALID_REQUEST" },
    });
    await expect(
      handleGetStudioRequest({ studioId: "missing" }, true, get),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "IPC_INVALID_REQUEST" },
    });
  });

  test("returns renderer-safe application and persistence failures", async () => {
    const create = {
      execute: async (): Promise<Studio> => {
        throw new PersistenceFailureError(
          "write",
          new Error("SQLITE_CONSTRAINT studios.name"),
        );
      },
    };
    const get = {
      execute: async (): Promise<Studio> => {
        throw new ApplicationError("NOT_FOUND", "Studio was not found.");
      },
    };

    const createResult = await handleCreateStudioRequest(
      { name: "Public Sphere" },
      true,
      create,
    );
    const getResult = await handleGetStudioRequest(
      { studioId: STUDIO_ID },
      true,
      get,
    );

    expect(createResult).toMatchObject({
      ok: false,
      error: { code: "PERSISTENCE_FAILURE" },
    });
    expect(getResult).toEqual({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "This Studio is no longer available. Return to Studio setup.",
      },
    });
    expect(JSON.stringify(createResult)).not.toMatch(/SQLITE|studios\.name/u);
  });

  test("contains invalid application responses", async () => {
    const invalidStudio = { ...studio, name: "" } satisfies Studio;

    await expect(
      handleCreateStudioRequest({ name: "Public Sphere" }, true, {
        execute: async () => invalidStudio,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "IPC_INVALID_RESPONSE" },
    });
  });
});
