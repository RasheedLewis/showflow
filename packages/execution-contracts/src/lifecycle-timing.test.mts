import { describe, expect, test } from "vitest";

import { calculateLifecycleTiming } from "./lifecycle-timing.mjs";

const noAnimation = {
  delayMs: 0,
  durationMs: 0,
  easing: "linear",
  preset: "none" as const,
};

describe("lifecycle timing summaries", () => {
  test("12A.T8 includes placement delay and explicit holds in the phase total", () => {
    const timing = calculateLifecycleTiming({
      actions: [
        { kind: "activateLayout", layoutId: "layout-1" },
        { kind: "waitForAnimationCompletion" },
        { durationMs: 3_000, kind: "waitForDuration" },
      ],
      components: [
        {
          defaultEnterAnimation: noAnimation,
          defaultExitAnimation: noAnimation,
          id: "component-1",
        },
      ],
      layouts: [
        {
          componentPlacements: [
            {
              bindings: {},
              componentId: "component-1",
              enterAnimationOverride: {
                delayMs: 250,
                durationMs: 750,
                easing: "ease-out",
                preset: "fade",
              },
            },
          ],
          id: "layout-1",
          name: "Opening",
        },
      ],
    });

    expect(timing.actions.map(({ durationMs }) => durationMs)).toEqual([
      0, 1_000, 3_000,
    ]);
    expect(timing.totalDurationMs).toBe(4_000);
  });

  test("12A.T8 distinguishes indeterminate media timing from zero timing", () => {
    expect(
      calculateLifecycleTiming({
        actions: [{ kind: "waitForMediaCompletion" }],
        components: [],
        layouts: [],
      }),
    ).toMatchObject({ indeterminateActionIndex: 0, totalDurationMs: null });
  });
});
