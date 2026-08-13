import { describe, expect, test } from "vitest";

import { parseStoredLifecycleActions } from "./segment-storage.mjs";

describe("stored Segment lifecycle actions", () => {
  test("12A.T2 round-trips duration holds and keeps older action lists compatible", () => {
    expect(
      parseStoredLifecycleActions(
        JSON.stringify([
          { kind: "waitForAnimationCompletion" },
          { kind: "waitForDuration", durationMs: 3_000 },
        ]),
      ),
    ).toEqual([
      { kind: "waitForAnimationCompletion" },
      { kind: "waitForDuration", durationMs: 3_000 },
    ]);
    expect(parseStoredLifecycleActions("[]")).toEqual([]);
    expect(
      parseStoredLifecycleActions(
        JSON.stringify([{ kind: "waitForAnimationCompletion" }]),
      ),
    ).toEqual([{ kind: "waitForAnimationCompletion" }]);
  });

  test.each([0, -1, 1.5, null, "3000"])(
    "12A.T1 rejects invalid stored duration %s",
    (durationMs) => {
      expect(() =>
        parseStoredLifecycleActions(
          JSON.stringify([{ kind: "waitForDuration", durationMs }]),
        ),
      ).toThrow();
    },
  );
});
