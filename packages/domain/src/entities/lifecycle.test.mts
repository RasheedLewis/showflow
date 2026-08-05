import { describe, expect, expectTypeOf, test } from "vitest";

import {
  defineSegmentLifecycle,
  getNextSegmentLifecyclePhase,
  isSegmentLifecyclePhase,
  parseEntityId,
  parseSegmentLifecyclePhase,
  parseUtcTimestamp,
  SEGMENT_LIFECYCLE_PHASES,
} from "../index.js";
import type { LifecycleAction, SegmentLifecyclePhase } from "../index.js";

const showSegmentId = parseEntityId<"showSegment">(
  "01942c1f-ae8f-7e42-b900-000000000001",
);
const layoutId = parseEntityId<"layout">(
  "01942c1f-ae8f-7e42-b900-000000000002",
);
const timestamp = parseUtcTimestamp("2026-08-05T15:42:03.125Z");

describe("closed Segment lifecycle", () => {
  test("exposes exactly five phases in canonical order", () => {
    expect(SEGMENT_LIFECYCLE_PHASES).toEqual([
      "prepare",
      "enter",
      "active",
      "exit",
      "cleanup",
    ]);
    expectTypeOf<SegmentLifecyclePhase>().toEqualTypeOf<
      "prepare" | "enter" | "active" | "exit" | "cleanup"
    >();
    expect(Object.isFrozen(SEGMENT_LIFECYCLE_PHASES)).toBe(true);
  });

  test.each(SEGMENT_LIFECYCLE_PHASES)("accepts canonical phase %s", (phase) => {
    expect(isSegmentLifecyclePhase(phase)).toBe(true);
    expect(parseSegmentLifecyclePhase(phase)).toBe(phase);
  });

  test.each(["intro", "stage", "moment", "ACTIVE", "clean-up", 0, null])(
    "rejects user-defined or renamed phase %s",
    (phase) => {
      expect(isSegmentLifecyclePhase(phase)).toBe(false);
      expect(() => parseSegmentLifecyclePhase(phase)).toThrow(TypeError);
    },
  );

  test("advances only through the canonical phase sequence", () => {
    expect(
      SEGMENT_LIFECYCLE_PHASES.map((phase) =>
        getNextSegmentLifecyclePhase(phase),
      ),
    ).toEqual(["enter", "active", "exit", "cleanup", undefined]);
  });

  test("rejects additional runtime phase fields", () => {
    const definitionWithCustomPhase = {
      showSegmentId,
      prepare: [],
      enter: [],
      active: {
        availableLayoutIds: [],
        hostCueIds: [],
      },
      exit: [],
      cleanup: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      intermission: [{ kind: "clearTemporaryState" }],
    } as const;

    expect(() => defineSegmentLifecycle(definitionWithCustomPhase)).toThrow(
      'Segment lifecycle cannot define custom phase or field "intermission".',
    );
  });

  test("constructs only canonical phase fields and preserves action order", () => {
    const enter = [
      { kind: "activateLayout", layoutId },
      { kind: "waitForAnimationCompletion" },
      { kind: "setActiveDefaults", layoutId },
    ] as const satisfies readonly LifecycleAction[];
    const lifecycle = defineSegmentLifecycle({
      showSegmentId,
      prepare: [],
      enter,
      active: {
        defaultLayoutId: layoutId,
        availableLayoutIds: [layoutId],
        hostCueIds: [],
      },
      exit: [],
      cleanup: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    expect(Object.keys(lifecycle)).toEqual([
      "showSegmentId",
      ...SEGMENT_LIFECYCLE_PHASES,
      "createdAt",
      "updatedAt",
    ]);
    expect(lifecycle.enter).toEqual(enter);
  });

  test("returns immutable phase containers detached from input arrays", () => {
    const prepare: LifecycleAction[] = [];
    const availableLayoutIds = [layoutId];
    const lifecycle = defineSegmentLifecycle({
      showSegmentId,
      prepare,
      enter: [],
      active: {
        defaultLayoutId: layoutId,
        availableLayoutIds,
        hostCueIds: [],
      },
      exit: [],
      cleanup: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    prepare.push({ kind: "activateLayout", layoutId });
    availableLayoutIds.push(
      parseEntityId<"layout">("01942c1f-ae8f-7e42-b900-000000000003"),
    );

    expect(lifecycle.prepare).toEqual([]);
    expect(lifecycle.active.availableLayoutIds).toEqual([layoutId]);
    expect(Object.isFrozen(lifecycle)).toBe(true);
    expect(Object.isFrozen(lifecycle.prepare)).toBe(true);
    expect(Object.isFrozen(lifecycle.active)).toBe(true);
    expect(Object.isFrozen(lifecycle.active.availableLayoutIds)).toBe(true);
  });
});
