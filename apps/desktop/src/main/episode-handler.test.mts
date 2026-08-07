import { describe, expect, test } from "vitest";

import {
  createEpisode,
  createFixedClock,
  createShowSegment,
  parseEntityId,
  parseUtcTimestamp,
  type CreateEpisodeInput,
  type DomainFactoryDependencies,
  type EntityId,
  type EntityIdKind,
  type Show,
  type ShowBlueprint,
} from "@showflow/domain";

import {
  handleCreateEpisodeRequest,
  type EpisodeOperations,
} from "./episode-handler.mjs";

const studioId = parseEntityId<"studio">(
  "8d9df01f-2584-4b9a-ad13-a96d673918e9",
);
const showId = parseEntityId<"show">("514ad6df-710d-4301-9bff-b096e9db3dd4");
const blueprintId = parseEntityId<"showBlueprint">(
  "5da62c88-a25d-450d-bf4d-3809a9f8bd11",
);
const timestamp = parseUtcTimestamp("2026-08-07T14:30:00.000Z");
let idSequence = 0;
const dependencies: DomainFactoryDependencies = {
  clock: createFixedClock(timestamp),
  createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> => {
    idSequence += 1;
    return parseEntityId<TEntity>(
      `01942c1f-ae8f-7e42-b900-${idSequence.toString(16).padStart(12, "0")}`,
    );
  },
};
const show = {
  id: showId,
  studioId,
  name: "Artist Interviews",
  styleDefaults: {},
  createdAt: timestamp,
  updatedAt: timestamp,
} satisfies Show;
const segment = createShowSegment({ name: "Opening", showId }, dependencies);
const episode = createEpisode({ showId, title: "Episode 24" }, dependencies);
const blueprint = {
  id: blueprintId,
  showId,
  placements: [],
  createdAt: timestamp,
  updatedAt: timestamp,
} satisfies ShowBlueprint;

const createOperations = (
  onCreate: (input: CreateEpisodeInput) => void = () => undefined,
): EpisodeOperations => ({
  create: {
    execute: async (input) => {
      onCreate(input);
      return { ...episode, ...input };
    },
  },
  createSegment: { execute: async () => ({ episode, segment }) },
  duplicateSegment: { execute: async () => episode },
  get: { execute: async () => ({ episode, items: [], show }) },
  getDesign: { execute: async () => ({ blueprint, segments: [], show }) },
  insertSegment: { execute: async () => episode },
  list: { execute: async () => [episode] },
  removeSegment: { execute: async () => episode },
  reorder: { execute: async () => episode },
  restoreSegment: { execute: async () => episode },
});

describe("Episode IPC handlers", () => {
  test("requires an explicit blank choice when the Blueprint is empty", async () => {
    let createCalled = false;
    const result = await handleCreateEpisodeRequest(
      {
        showId,
        source: "blueprint",
        studioId,
        title: "Episode 24",
      },
      true,
      createOperations(() => {
        createCalled = true;
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR" },
    });
    expect(createCalled).toBe(false);
  });

  test("validates and creates a blank Episode with a stable planned date", async () => {
    let received: CreateEpisodeInput | undefined;
    const result = await handleCreateEpisodeRequest(
      {
        episodeNumber: 24,
        plannedDate: "2026-08-21",
        showId,
        source: "blank",
        studioId,
        title: "Episode 24",
      },
      true,
      createOperations((input) => {
        received = input;
      }),
    );

    expect(result).toMatchObject({ ok: true });
    expect(received).toMatchObject({
      episodeNumber: 24,
      plannedAt: "2026-08-21T12:00:00.000Z",
      showId,
      title: "Episode 24",
    });
  });

  test("rejects untrusted and malformed Episode creation requests", async () => {
    await expect(
      handleCreateEpisodeRequest(
        { showId, source: "blank", studioId, title: "Episode 24" },
        false,
        createOperations(),
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "IPC_UNTRUSTED_SENDER" },
    });
    await expect(
      handleCreateEpisodeRequest(
        { showId, source: "blank", studioId, title: "" },
        true,
        createOperations(),
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "IPC_INVALID_REQUEST" },
    });
  });
});
