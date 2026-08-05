import { describe, expect, test } from "vitest";

import {
  assertBlueprintPlacementOwnership,
  assertComponentOwnedByShow,
  assertEpisodeOwnedByShow,
  assertEpisodeSegmentOwnership,
  assertLayoutOwnedByShow,
  assertShowSegmentOwnedByShow,
  DOMAIN_ERROR_CODES,
  InvalidOwnershipError,
  parseEntityId,
  parseUtcTimestamp,
} from "../index.js";
import type {
  BlueprintSegmentPlacement,
  Component,
  EntityId,
  EntityIdKind,
  Episode,
  EpisodeSegment,
  Layout,
  ShowBlueprint,
  ShowId,
  ShowSegment,
} from "../index.js";

const entityId = <TEntity extends EntityIdKind>(
  suffix: number,
): EntityId<TEntity> =>
  parseEntityId<TEntity>(
    `01942c1f-ae8f-7e42-b900-${suffix.toString(16).padStart(12, "0")}`,
  );

const timestamp = parseUtcTimestamp("2026-08-05T15:42:03.125Z");
const metadata = {
  createdAt: timestamp,
  updatedAt: timestamp,
} as const;

const showId = entityId<"show">(1);
const anotherShowId = entityId<"show">(2);

const createSegment = (ownerShowId: ShowId, suffix: number): ShowSegment => {
  const id = entityId<"showSegment">(suffix);

  return {
    id,
    showId: ownerShowId,
    name: "Opening",
    dataFields: [],
    lifecycle: {
      showSegmentId: id,
      prepare: [],
      enter: [],
      active: { availableLayoutIds: [], hostCueIds: [] },
      exit: [],
      cleanup: [],
      ...metadata,
    },
    layoutIds: [],
    hostCues: [],
    notesTemplate: "",
    ...metadata,
  };
};

const createLayout = (ownerShowId: ShowId): Layout => ({
  id: entityId<"layout">(20),
  showId: ownerShowId,
  name: "Host full screen",
  aspectRatio: "16:9",
  canvas: { width: 1920, height: 1080 },
  slots: [],
  componentPlacements: [],
  ...metadata,
});

const createComponent = (ownerShowId: ShowId): Component => ({
  id: entityId<"component">(30),
  showId: ownerShowId,
  name: "Host name",
  type: "lowerThird",
  propertySchema: [],
  defaultProperties: {},
  defaultEnterAnimation: {
    preset: "none",
    durationMs: 0,
    delayMs: 0,
    easing: "linear",
  },
  defaultExitAnimation: {
    preset: "none",
    durationMs: 0,
    delayMs: 0,
    easing: "linear",
  },
  supportedSlotRoles: [],
  validationRules: [],
  ...metadata,
});

const createEpisode = (ownerShowId: ShowId): Episode => ({
  id: entityId<"episode">(40),
  showId: ownerShowId,
  title: "Episode 1",
  status: "draft",
  guestNames: [],
  internalNotes: "",
  segments: [],
  ...metadata,
});

const expectInvalidOwnership = (
  action: () => void,
  relationship: InvalidOwnershipError["relationship"],
): void => {
  try {
    action();
    throw new Error("Expected an invalid ownership error.");
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(InvalidOwnershipError);
    expect(error).toMatchObject({
      code: "INVALID_OWNERSHIP",
      relationship,
    });
  }
};

describe("Show-scoped ownership", () => {
  test("publishes a stable domain error code", () => {
    expect(DOMAIN_ERROR_CODES).toEqual(["INVALID_OWNERSHIP"]);
  });

  test("accepts Show-owned entities from the expected Show", () => {
    expect(() =>
      assertShowSegmentOwnedByShow(createSegment(showId, 10), showId),
    ).not.toThrow();
    expect(() =>
      assertLayoutOwnedByShow(createLayout(showId), showId),
    ).not.toThrow();
    expect(() =>
      assertComponentOwnedByShow(createComponent(showId), showId),
    ).not.toThrow();
    expect(() =>
      assertEpisodeOwnedByShow(createEpisode(showId), showId),
    ).not.toThrow();
  });

  test.each([
    [
      "Show Segment",
      () =>
        assertShowSegmentOwnedByShow(createSegment(anotherShowId, 10), showId),
      "show.segment",
    ],
    [
      "Layout",
      () => assertLayoutOwnedByShow(createLayout(anotherShowId), showId),
      "show.layout",
    ],
    [
      "Component",
      () => assertComponentOwnedByShow(createComponent(anotherShowId), showId),
      "show.component",
    ],
    [
      "Episode",
      () => assertEpisodeOwnedByShow(createEpisode(anotherShowId), showId),
      "show.episode",
    ],
  ] as const)(
    "rejects a %s owned by another Show",
    (_name, action, relationship) => {
      expectInvalidOwnership(action, relationship);
    },
  );

  test("accepts a Blueprint placement referencing a Segment from the same Show", () => {
    const segment = createSegment(showId, 10);
    const blueprint = {
      id: entityId<"showBlueprint">(50),
      showId,
      placements: [],
      ...metadata,
    } satisfies ShowBlueprint;
    const placement = {
      id: entityId<"blueprintSegmentPlacement">(51),
      showBlueprintId: blueprint.id,
      showSegmentId: segment.id,
      position: 0,
      defaultData: {},
      ...metadata,
    } satisfies BlueprintSegmentPlacement;

    expect(() =>
      assertBlueprintPlacementOwnership({ blueprint, placement, segment }),
    ).not.toThrow();
  });

  test("rejects a Blueprint placement owned by another Blueprint", () => {
    const segment = createSegment(showId, 10);
    const blueprint = {
      id: entityId<"showBlueprint">(50),
      showId,
      placements: [],
      ...metadata,
    } satisfies ShowBlueprint;
    const placement = {
      id: entityId<"blueprintSegmentPlacement">(51),
      showBlueprintId: entityId<"showBlueprint">(52),
      showSegmentId: segment.id,
      position: 0,
      defaultData: {},
      ...metadata,
    } satisfies BlueprintSegmentPlacement;

    expectInvalidOwnership(
      () =>
        assertBlueprintPlacementOwnership({ blueprint, placement, segment }),
      "blueprint.placement",
    );
  });

  test("rejects a Blueprint placement that names a different Segment", () => {
    const segment = createSegment(showId, 10);
    const blueprint = {
      id: entityId<"showBlueprint">(50),
      showId,
      placements: [],
      ...metadata,
    } satisfies ShowBlueprint;
    const placement = {
      id: entityId<"blueprintSegmentPlacement">(51),
      showBlueprintId: blueprint.id,
      showSegmentId: entityId<"showSegment">(11),
      position: 0,
      defaultData: {},
      ...metadata,
    } satisfies BlueprintSegmentPlacement;

    expectInvalidOwnership(
      () =>
        assertBlueprintPlacementOwnership({ blueprint, placement, segment }),
      "blueprint-placement.segment",
    );
  });

  test("rejects a Blueprint Segment reference that crosses Shows", () => {
    const segment = createSegment(anotherShowId, 10);
    const blueprint = {
      id: entityId<"showBlueprint">(50),
      showId,
      placements: [],
      ...metadata,
    } satisfies ShowBlueprint;
    const placement = {
      id: entityId<"blueprintSegmentPlacement">(51),
      showBlueprintId: blueprint.id,
      showSegmentId: segment.id,
      position: 0,
      defaultData: {},
      ...metadata,
    } satisfies BlueprintSegmentPlacement;

    expectInvalidOwnership(
      () =>
        assertBlueprintPlacementOwnership({ blueprint, placement, segment }),
      "show.segment",
    );
  });

  test("accepts an Episode Segment sourcing a Segment from its Show", () => {
    const episode = createEpisode(showId);
    const sourceSegment = createSegment(showId, 10);
    const episodeSegment = {
      id: entityId<"episodeSegment">(60),
      episodeId: episode.id,
      sourceShowSegmentId: sourceSegment.id,
      position: 0,
      fieldValues: {},
      notes: "",
      fixedResourceReplacements: [],
      ...metadata,
    } satisfies EpisodeSegment;

    expect(() =>
      assertEpisodeSegmentOwnership({
        episode,
        episodeSegment,
        sourceSegment,
      }),
    ).not.toThrow();
  });

  test("rejects an Episode Segment owned by another Episode", () => {
    const episode = createEpisode(showId);
    const sourceSegment = createSegment(showId, 10);
    const episodeSegment = {
      id: entityId<"episodeSegment">(60),
      episodeId: entityId<"episode">(41),
      sourceShowSegmentId: sourceSegment.id,
      position: 0,
      fieldValues: {},
      notes: "",
      fixedResourceReplacements: [],
      ...metadata,
    } satisfies EpisodeSegment;

    expectInvalidOwnership(
      () =>
        assertEpisodeSegmentOwnership({
          episode,
          episodeSegment,
          sourceSegment,
        }),
      "episode.segment",
    );
  });

  test("rejects an Episode Segment that names another source Segment", () => {
    const episode = createEpisode(showId);
    const sourceSegment = createSegment(showId, 10);
    const episodeSegment = {
      id: entityId<"episodeSegment">(60),
      episodeId: episode.id,
      sourceShowSegmentId: entityId<"showSegment">(11),
      position: 0,
      fieldValues: {},
      notes: "",
      fixedResourceReplacements: [],
      ...metadata,
    } satisfies EpisodeSegment;

    expectInvalidOwnership(
      () =>
        assertEpisodeSegmentOwnership({
          episode,
          episodeSegment,
          sourceSegment,
        }),
      "episode-segment.source-segment",
    );
  });

  test("rejects an Episode Segment source that crosses Shows", () => {
    const episode = createEpisode(showId);
    const sourceSegment = createSegment(anotherShowId, 10);
    const episodeSegment = {
      id: entityId<"episodeSegment">(60),
      episodeId: episode.id,
      sourceShowSegmentId: sourceSegment.id,
      position: 0,
      fieldValues: {},
      notes: "",
      fixedResourceReplacements: [],
      ...metadata,
    } satisfies EpisodeSegment;

    expectInvalidOwnership(
      () =>
        assertEpisodeSegmentOwnership({
          episode,
          episodeSegment,
          sourceSegment,
        }),
      "show.segment",
    );
  });
});
