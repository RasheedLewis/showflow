import { expect, test, vi } from "vitest";
import {
  createFixedClock,
  createLayoutFromPreset,
  parseEntityId,
  parseUtcTimestamp,
  type DomainFactoryDependencies,
  type EntityId,
  type EntityIdKind,
} from "@showflow/domain";

import {
  handleCreateLayoutRequest,
  handleListLayoutsRequest,
  handleUpdateLayoutRequest,
  type LayoutOperations,
} from "./layout-handler.mjs";

let suffix = 1;
const dependencies: DomainFactoryDependencies = {
  clock: createFixedClock(parseUtcTimestamp("2026-08-08T12:00:00.000Z")),
  createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
    parseEntityId<TEntity>(
      `01942c1f-ae8f-7e42-b900-${(suffix++).toString(16).padStart(12, "0")}`,
    ),
};
const STUDIO_ID = "01942c1f-ae8f-7e42-b900-000000000701";
const SHOW_ID = "01942c1f-ae8f-7e42-b900-000000000702";
const EPISODE_ID = "01942c1f-ae8f-7e42-b900-000000000703";
const EPISODE_SEGMENT_ID = "01942c1f-ae8f-7e42-b900-000000000704";
const layout = createLayoutFromPreset(
  {
    showId: parseEntityId<"show">(SHOW_ID),
    name: "Host",
    presetId: "host",
  },
  dependencies,
);

const createOperations = (): LayoutOperations => ({
  archive: { execute: vi.fn(async () => layout) },
  create: { execute: vi.fn(async () => layout) },
  createEpisode: { execute: vi.fn(async () => layout) },
  duplicate: { execute: vi.fn(async () => layout) },
  get: { execute: vi.fn(async () => layout) },
  list: { execute: vi.fn(async () => [{ layout, usageCount: 2 }]) },
  rename: { execute: vi.fn(async () => layout) },
  update: { execute: vi.fn(async () => layout) },
});

test("Layout handlers reject untrusted and invalid boundary payloads", async () => {
  const operations = createOperations();
  await expect(
    handleListLayoutsRequest(
      { studioId: STUDIO_ID, showId: SHOW_ID },
      false,
      operations,
    ),
  ).resolves.toMatchObject({
    ok: false,
    error: { code: "IPC_UNTRUSTED_SENDER" },
  });
  await expect(
    handleUpdateLayoutRequest({ studioId: STUDIO_ID }, true, operations),
  ).resolves.toMatchObject({
    ok: false,
    error: { code: "IPC_INVALID_REQUEST" },
  });
});

test("10.T10 routes Episode-origin creation through the atomic application operation", async () => {
  const operations = createOperations();
  const result = await handleCreateLayoutRequest(
    {
      context: {
        scope: "episode",
        studioId: STUDIO_ID,
        showId: SHOW_ID,
        episodeId: EPISODE_ID,
        episodeSegmentId: EPISODE_SEGMENT_ID,
      },
      name: "Host",
      aspectRatio: "16:9",
      presetId: "host",
    },
    true,
    operations,
  );

  expect(result).toMatchObject({ ok: true, data: { showId: SHOW_ID } });
  expect(operations.createEpisode.execute).toHaveBeenCalledWith(
    expect.objectContaining({
      episodeId: EPISODE_ID,
      episodeSegmentId: EPISODE_SEGMENT_ID,
      expectedShowId: SHOW_ID,
    }),
  );
  expect(operations.create.execute).not.toHaveBeenCalled();
});
