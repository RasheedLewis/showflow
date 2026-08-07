import { describe, expect, it } from "vitest";

import { createSegmentDataField, createShowSegment } from "./factories.mjs";
import {
  generateSegmentDataFieldKey,
  isValidSegmentDataFieldDefault,
  normalizeExpectedDurationMs,
  reorderSegmentDataFields,
  validateShowSegmentDefinition,
} from "./segment-schema.mjs";
import type { SegmentDataFieldType } from "./segment.mjs";
import { createEntityId } from "../identity/entity-id.mjs";
import { createFixedClock, parseUtcTimestamp } from "../time/clock.mjs";

const dependencies = {
  clock: createFixedClock(parseUtcTimestamp("2026-08-07T12:00:00.000Z")),
  createId: createEntityId,
};

describe("Segment schema", () => {
  it("generates readable unique keys without changing existing keys", () => {
    expect(generateSegmentDataFieldKey("Lower Third Title", [])).toBe(
      "lowerThirdTitle",
    );
    expect(
      generateSegmentDataFieldKey("Lower Third Title", ["lowerThirdTitle"]),
    ).toBe("lowerThirdTitle2");
    expect(generateSegmentDataFieldKey("32 Bars", [])).toBe("field32Bars");
  });

  it.each<[SegmentDataFieldType, unknown, boolean]>([
    ["shortText", "Title", true],
    ["longText", "Line one\nLine two", true],
    ["number", 12, true],
    ["boolean", false, true],
    ["imageResource", "5ccbc04c-2890-46b5-b0f0-179ae15972d3", true],
    ["videoResource", "not-a-resource-id", false],
    ["audioResource", 42, false],
    ["number", "12", false],
    ["boolean", "false", false],
  ])("7.T2 validates %s defaults", (type, value, expected) => {
    expect(isValidSegmentDataFieldDefault(type, value as never)).toBe(expected);
  });

  it("reorders fields exactly and persists normalized positions", () => {
    const segment = createShowSegment(
      {
        showId: createEntityId<"show">(),
        name: "Interview",
      },
      dependencies,
    );
    const first = createSegmentDataField(
      {
        label: "Guest name",
        position: 0,
        showSegmentId: segment.id,
        type: "shortText",
      },
      dependencies,
    );
    const second = createSegmentDataField(
      {
        existingKeys: [first.key],
        label: "Guest artwork",
        position: 1,
        showSegmentId: segment.id,
        type: "imageResource",
      },
      dependencies,
    );

    expect(
      reorderSegmentDataFields([first, second], [second.id, first.id]),
    ).toEqual([
      { ...second, position: 0 },
      { ...first, position: 1 },
    ]);
  });

  it("7.T6 and 7.T11 normalize duration and report production-language validation", () => {
    expect(normalizeExpectedDurationMs(1_250.6)).toBe(1_251);
    expect(() => normalizeExpectedDurationMs(-1)).toThrow("zero or a positive");
    const segment = createShowSegment(
      { showId: createEntityId<"show">(), name: "Opening" },
      dependencies,
    );
    const invalid = {
      ...segment,
      name: "",
      expectedDurationMs: -1,
    };
    expect(
      validateShowSegmentDefinition(invalid).map(({ message }) => message),
    ).toEqual([
      "Give this Segment a name before using it in production.",
      "Expected duration cannot be negative. Enter zero or a positive time.",
    ]);
  });
});
