import { describe, expect, test } from "vitest";

import type {
  BaseValidationSnapshot,
  BlueprintSegmentPlacement,
  DomainFactoryDependencies,
  EntityId,
  EntityIdKind,
  Episode,
  EpisodeSegment,
  HostCue,
  Show,
  ShowBlueprint,
  ShowSegment,
  Studio,
} from "../index.js";
import {
  BASE_VALIDATION_ISSUE_CODES,
  BaseValidationService,
  createFixedClock,
  createShowSegment,
  parseEntityId,
  parseUtcTimestamp,
} from "../index.js";

const entityId = <TEntity extends EntityIdKind>(
  suffix: number,
): EntityId<TEntity> =>
  parseEntityId<TEntity>(
    `01942c1f-ae8f-7e42-b900-${suffix.toString(16).padStart(12, "0")}`,
  );

const timestamp = parseUtcTimestamp("2026-08-06T12:00:00.000Z");
const metadata = { createdAt: timestamp, updatedAt: timestamp } as const;

const fixedDependencies = (suffix: number): DomainFactoryDependencies => ({
  clock: createFixedClock(timestamp),
  createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
    entityId<TEntity>(suffix),
});

const validationDependencies = (): DomainFactoryDependencies => {
  let suffix = 500;

  return {
    clock: createFixedClock(timestamp),
    createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> => {
      const id = entityId<TEntity>(suffix);
      suffix += 1;
      return id;
    },
  };
};

const studio = {
  id: entityId<"studio">(1),
  name: "Public Sphere Studio",
  ...metadata,
} satisfies Studio;

const show = {
  id: entityId<"show">(2),
  studioId: studio.id,
  name: "Top 10 Music Videos",
  styleDefaults: {},
  ...metadata,
} satisfies Show;

const segment = createShowSegment(
  { showId: show.id, name: "Opening" },
  fixedDependencies(10),
);

const blueprintId = entityId<"showBlueprint">(20);
const placement = {
  id: entityId<"blueprintSegmentPlacement">(21),
  showBlueprintId: blueprintId,
  showSegmentId: segment.id,
  position: 0,
  defaultData: {},
  ...metadata,
} satisfies BlueprintSegmentPlacement;

const blueprint = {
  id: blueprintId,
  showId: show.id,
  placements: [placement],
  ...metadata,
} satisfies ShowBlueprint;

const episodeId = entityId<"episode">(30);
const episodeSegment = {
  id: entityId<"episodeSegment">(31),
  episodeId,
  sourceShowSegmentId: segment.id,
  position: 0,
  fieldValues: {},
  notes: "",
  fixedResourceReplacements: [],
  ...metadata,
} satisfies EpisodeSegment;

const episode = {
  id: episodeId,
  showId: show.id,
  title: "Episode 1",
  status: "draft",
  guestNames: [],
  internalNotes: "",
  segments: [episodeSegment],
  ...metadata,
} satisfies Episode;

const validSnapshot = (
  overrides: Partial<BaseValidationSnapshot> = {},
): BaseValidationSnapshot => ({
  studios: [studio],
  shows: [show],
  blueprints: [blueprint],
  segments: [segment],
  layouts: [],
  components: [],
  resources: [],
  episodes: [episode],
  ...overrides,
});

const validate = (snapshot: BaseValidationSnapshot) =>
  new BaseValidationService(validationDependencies()).validate(snapshot);

describe("BaseValidationService", () => {
  test("returns no issues for a valid core Show snapshot", () => {
    expect(validate(validSnapshot())).toEqual([]);
  });

  test("2.T14 reports cross-Show ownership with a stable code", () => {
    const otherShow = {
      ...show,
      id: entityId<"show">(3),
      name: "Another Show",
    } satisfies Show;
    const otherShowSegment = {
      ...segment,
      showId: otherShow.id,
    } satisfies ShowSegment;
    const issues = validate(
      validSnapshot({
        shows: [show, otherShow],
        segments: [otherShowSegment],
        episodes: [],
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: BASE_VALIDATION_ISSUE_CODES.invalidOwnership,
        entityType: "blueprintSegmentPlacement",
        entityId: placement.id,
        fieldPath: "showSegmentId",
      }),
    );
  });

  test("reports a missing required reference with actionable blocking detail", () => {
    const issues = validate(validSnapshot({ segments: [], episodes: [] }));

    expect(issues).toEqual([
      expect.objectContaining({
        id: entityId<"validationIssue">(500),
        code: BASE_VALIDATION_ISSUE_CODES.missingReference,
        severity: "blocking",
        message: "Blueprint placement cannot find its referenced Show Segment.",
        fieldPath: "showSegmentId",
        suggestedAction:
          "Choose an available Show Segment or remove this reference.",
        blocks: ["preview", "rehearsal", "futureBroadcast"],
        ...metadata,
      }),
    ]);
  });

  test("reports a lifecycle action that references an unavailable Layout", () => {
    const segmentWithMissingLayout = {
      ...segment,
      lifecycle: {
        ...segment.lifecycle,
        enter: [
          {
            kind: "activateLayout",
            layoutId: entityId<"layout">(90),
          },
        ],
      },
    } satisfies ShowSegment;
    const issues = validate(
      validSnapshot({ segments: [segmentWithMissingLayout], episodes: [] }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: BASE_VALIDATION_ISSUE_CODES.missingReference,
        entityType: "showSegment",
        entityId: segment.id,
        fieldPath: "lifecycle.activateLayout",
        message: "Opening Segment cannot find its referenced Layout.",
      }),
    );
  });

  test("reports a Host Cue with an unavailable production target", () => {
    const cue = {
      id: entityId<"hostCue">(91),
      showSegmentId: segment.id,
      name: "Play applause",
      actions: [{ kind: "playSound", resourceId: entityId<"resource">(92) }],
      lifetime: { kind: "untilDismissed" },
      completionBehavior: { kind: "none" },
      retriggerBehavior: "restartPlayback",
      ...metadata,
    } satisfies HostCue;
    const segmentWithCue = {
      ...segment,
      hostCues: [cue],
      lifecycle: {
        ...segment.lifecycle,
        active: { ...segment.lifecycle.active, hostCueIds: [cue.id] },
      },
    } satisfies ShowSegment;
    const issues = validate(
      validSnapshot({ segments: [segmentWithCue], episodes: [] }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: BASE_VALIDATION_ISSUE_CODES.missingReference,
        entityType: "hostCue",
        entityId: cue.id,
        fieldPath: "actions.resourceId",
        message: "Play applause Host Cue cannot find its referenced Resource.",
      }),
    );
  });

  test("reports duplicate Storyboard positions without requiring contiguity", () => {
    const duplicatePlacement = {
      ...placement,
      id: entityId<"blueprintSegmentPlacement">(22),
    } satisfies BlueprintSegmentPlacement;
    const issues = validate(
      validSnapshot({
        blueprints: [
          { ...blueprint, placements: [placement, duplicatePlacement] },
        ],
      }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: BASE_VALIDATION_ISSUE_CODES.duplicateOrder,
        entityType: "showBlueprint",
        entityId: blueprint.id,
        fieldPath: "placements.position",
      }),
    );
  });

  test("reports a Blueprint placement that references an archived Segment", () => {
    const archivedSegment = {
      ...segment,
      archivedAt: timestamp,
    } satisfies ShowSegment;
    const issues = validate(
      validSnapshot({ segments: [archivedSegment], episodes: [] }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: BASE_VALIDATION_ISSUE_CODES.archivedReference,
        entityType: "blueprintSegmentPlacement",
        message: "Blueprint placement references the archived Segment Opening.",
        suggestedAction: "Restore the Segment or choose an available one.",
      }),
    );
  });

  test("reports lifecycle data outside the five closed phases", () => {
    const lifecycleWithCustomPhase = {
      ...segment.lifecycle,
      postShow: [],
    };
    const invalidSegment = {
      ...segment,
      lifecycle: lifecycleWithCustomPhase,
    } satisfies ShowSegment;
    const issues = validate(
      validSnapshot({ segments: [invalidSegment], episodes: [] }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: BASE_VALIDATION_ISSUE_CODES.invalidLifecycle,
        entityType: "showSegment",
        entityId: segment.id,
        fieldPath: "lifecycle",
        message:
          "Opening Segment does not have the required Prepare, Enter, Active, Exit, and Cleanup lifecycle.",
      }),
    );
  });

  test("reports whitespace-only entity names at the affected field", () => {
    const unnamedSegment = { ...segment, name: "   " } satisfies ShowSegment;
    const issues = validate(
      validSnapshot({ segments: [unnamedSegment], episodes: [] }),
    );

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: BASE_VALIDATION_ISSUE_CODES.invalidName,
        entityType: "showSegment",
        entityId: segment.id,
        fieldPath: "name",
        message: "Segment needs a name before production can continue.",
      }),
    );
  });
});
