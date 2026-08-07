import { describe, expect, test } from "vitest";

import {
  ApplicationError,
  PersistenceFailureError,
} from "@showflow/application";
import {
  parseEntityId,
  parseUtcTimestamp,
  type Show,
  type ShowBlueprint,
} from "@showflow/domain";

import {
  handleCreateShowRequest,
  handleArchiveShowRequest,
  handleDeleteShowRequest,
  handleGetShowDesignRequest,
  handleListShowsRequest,
  handleRenameShowRequest,
} from "./show-handler.mjs";

const studioId = parseEntityId<"studio">(
  "8d9df01f-2584-4b9a-ad13-a96d673918e9",
);
const showId = parseEntityId<"show">("514ad6df-710d-4301-9bff-b096e9db3dd4");
const timestamp = parseUtcTimestamp("2026-08-06T14:30:00.000Z");
const show = {
  id: showId,
  studioId,
  name: "Artist Interviews",
  styleDefaults: {},
  createdAt: timestamp,
  updatedAt: timestamp,
} satisfies Show;
const blueprint = {
  id: parseEntityId<"showBlueprint">("5da62c88-a25d-450d-bf4d-3809a9f8bd11"),
  showId,
  placements: [],
  createdAt: timestamp,
  updatedAt: timestamp,
} satisfies ShowBlueprint;

describe("Show IPC handlers", () => {
  test("creates and reloads a Show design through application operations", async () => {
    const createOperation = { execute: async () => ({ show, blueprint }) };
    const getOperation = {
      execute: async () => ({ show, blueprint, segments: [] }),
    };
    const request = { studioId, showId };

    await expect(
      handleCreateShowRequest(
        { studioId, name: show.name },
        true,
        createOperation,
      ),
    ).resolves.toMatchObject({
      ok: true,
      data: { show: { id: showId }, blueprint: { placementCount: 0, showId } },
    });
    await expect(
      handleGetShowDesignRequest(request, true, getOperation),
    ).resolves.toMatchObject({ ok: true, data: { show: { id: showId } } });
  });

  test("lists, renames, archives, and deletes Show cards", async () => {
    await expect(
      handleListShowsRequest({ studioId }, true, {
        execute: async () => [{ episodeCount: 0, show }],
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: [{ episodeCount: 0, show: { id: showId } }],
    });
    await expect(
      handleRenameShowRequest(
        { studioId, showId, name: "Renamed Show" },
        true,
        { execute: async () => ({ ...show, name: "Renamed Show" }) },
      ),
    ).resolves.toMatchObject({ ok: true, data: { name: "Renamed Show" } });
    await expect(
      handleArchiveShowRequest({ studioId, showId }, true, {
        execute: async () => ({ ...show, archivedAt: timestamp }),
      }),
    ).resolves.toMatchObject({ ok: true, data: { archivedAt: timestamp } });
    await expect(
      handleDeleteShowRequest({ studioId, showId }, true, {
        execute: async () => showId,
      }),
    ).resolves.toEqual({ ok: true, data: { showId } });
  });

  test("contains invalid, untrusted, not-found, and persistence failures", async () => {
    const success = { execute: async () => ({ show, blueprint }) };
    const missing = {
      execute: async (): Promise<{
        show: Show;
        blueprint: ShowBlueprint;
        segments: [];
      }> => {
        throw new ApplicationError("NOT_FOUND", "Show was not found.");
      },
    };
    const failedCreate = {
      execute: async (): Promise<{ show: Show; blueprint: ShowBlueprint }> => {
        throw new PersistenceFailureError("write", new Error("shows table"));
      },
    };

    await expect(
      handleCreateShowRequest({ studioId, name: show.name }, false, success),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "IPC_UNTRUSTED_SENDER" },
    });
    await expect(
      handleCreateShowRequest({ studioId, name: "   " }, true, success),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "IPC_INVALID_REQUEST" },
    });
    await expect(
      handleGetShowDesignRequest({ studioId, showId }, true, missing),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "This Show is no longer available. Return to Studio Home.",
      },
    });
    const failure = await handleCreateShowRequest(
      { studioId, name: show.name },
      true,
      failedCreate,
    );
    expect(failure).toMatchObject({
      ok: false,
      error: { code: "PERSISTENCE_FAILURE" },
    });
    expect(JSON.stringify(failure)).not.toContain("shows table");
  });
});
