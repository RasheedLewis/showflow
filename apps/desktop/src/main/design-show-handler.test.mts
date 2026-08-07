import { describe, expect, test } from "vitest";

import { PersistenceFailureError } from "@showflow/application";
import {
  createFixedClock,
  createShowSegment,
  parseEntityId,
  parseUtcTimestamp,
  type BlueprintSegmentPlacement,
  type EntityId,
  type EntityIdKind,
  type Show,
  type ShowBlueprint,
} from "@showflow/domain";

import {
  handleCreateSegmentRequest,
  handleReorderBlueprintRequest,
  type DesignShowOperations,
} from "./design-show-handler.mjs";

const studioId = parseEntityId<"studio">(
  "8d9df01f-2584-4b9a-ad13-a96d673918e9",
);
const showId = parseEntityId<"show">("514ad6df-710d-4301-9bff-b096e9db3dd4");
const blueprintId = parseEntityId<"showBlueprint">(
  "5da62c88-a25d-450d-bf4d-3809a9f8bd11",
);
const placementId = parseEntityId<"blueprintSegmentPlacement">(
  "96334554-cdb1-407b-83c4-dd152e68a108",
);
const timestamp = parseUtcTimestamp("2026-08-06T14:30:00.000Z");
const show = {
  id: showId,
  studioId,
  name: "Artist Interviews",
  styleDefaults: {},
  createdAt: timestamp,
  updatedAt: timestamp,
} satisfies Show;
const segment = createShowSegment(
  { name: "Opening", showId },
  {
    clock: createFixedClock(timestamp),
    createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
      parseEntityId<TEntity>("6729eacb-438b-4438-8bb9-956d675ad864"),
  },
);
const placement = {
  id: placementId,
  showBlueprintId: blueprintId,
  showSegmentId: segment.id,
  position: 0,
  defaultData: {},
  createdAt: timestamp,
  updatedAt: timestamp,
} satisfies BlueprintSegmentPlacement;
const blueprint = {
  id: blueprintId,
  showId,
  placements: [placement],
  createdAt: timestamp,
  updatedAt: timestamp,
} satisfies ShowBlueprint;

const createOperations = (
  reorder: DesignShowOperations["reorder"] = {
    execute: async () => blueprint,
  },
): DesignShowOperations => ({
  addSegment: { execute: async () => blueprint },
  archiveSegment: { execute: async () => segment },
  createSegment: { execute: async () => segment },
  createSegmentInBlueprint: {
    execute: async () => ({ blueprint, segment }),
  },
  duplicatePlacement: { execute: async () => blueprint },
  getDesign: {
    execute: async () => ({ blueprint, segments: [segment], show }),
  },
  removePlacement: { execute: async () => blueprint },
  reorder,
});

describe("Design Show IPC handlers", () => {
  test("creates a Segment in the Blueprint and returns the reloaded design", async () => {
    const operations = createOperations();

    await expect(
      handleCreateSegmentRequest(
        {
          blueprintId,
          name: "Opening",
          position: 0,
          showId,
          studioId,
        },
        true,
        operations,
      ),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        blueprint: { placementCount: 1 },
        segments: [
          {
            blueprintUsageCount: 1,
            segment: { name: "Opening", showId },
          },
        ],
      },
    });
  });

  test("contains a failed reorder and explains that saved order is unchanged", async () => {
    const operations = createOperations({
      execute: async () => {
        throw new PersistenceFailureError(
          "write",
          new Error("blueprint_segment_placements constraint"),
        );
      },
    });

    const result = await handleReorderBlueprintRequest(
      {
        blueprintId,
        orderedPlacementIds: [placementId],
        showId,
        studioId,
      },
      true,
      operations,
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: "PERSISTENCE_FAILURE",
        message:
          "Showflow could not save the Blueprint change. Your saved Storyboard was not changed. Try again.",
      },
    });
    expect(JSON.stringify(result)).not.toContain("constraint");
  });

  test("rejects untrusted and malformed reorder requests", async () => {
    const operations = createOperations();

    await expect(
      handleReorderBlueprintRequest(
        {
          blueprintId,
          orderedPlacementIds: [placementId],
          showId,
          studioId,
        },
        false,
        operations,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "IPC_UNTRUSTED_SENDER" },
    });
    await expect(
      handleReorderBlueprintRequest(
        { blueprintId, orderedPlacementIds: ["not-an-id"], showId, studioId },
        true,
        operations,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "IPC_INVALID_REQUEST" },
    });
  });

  test("does not mutate a Blueprint outside the validated Show scope", async () => {
    let reorderCalled = false;
    const operations = createOperations({
      execute: async () => {
        reorderCalled = true;
        return blueprint;
      },
    });
    const foreignBlueprintId = parseEntityId<"showBlueprint">(
      "1385e038-0ec9-4b1d-bf9e-39e1dd189cc1",
    );

    await expect(
      handleReorderBlueprintRequest(
        {
          blueprintId: foreignBlueprintId,
          orderedPlacementIds: [placementId],
          showId,
          studioId,
        },
        true,
        operations,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    expect(reorderCalled).toBe(false);
  });
});
