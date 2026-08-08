import { describe, expect, test } from "vitest";

import {
  createFixedClock,
  createLayoutFromPreset,
  LAYOUT_PRESETS,
  MINIMUM_SLOT_SIZE,
  parseEntityId,
  parseUtcTimestamp,
  validateSlotDraft,
  type DomainFactoryDependencies,
  type EntityId,
  type EntityIdKind,
} from "../index.js";

let suffix = 1;
const dependencies: DomainFactoryDependencies = {
  clock: createFixedClock(parseUtcTimestamp("2026-08-08T12:00:00.000Z")),
  createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
    parseEntityId<TEntity>(
      `01942c1f-ae8f-7e42-b900-${(suffix++).toString(16).padStart(12, "0")}`,
    ),
};
const showId = parseEntityId<"show">("01942c1f-ae8f-7e42-b900-000000000100");

describe("Sprint 10 Layout editing invariants", () => {
  test("10.T2 rejects Slot geometry outside normalized bounds", () => {
    expect(() =>
      validateSlotDraft({
        name: "Outside",
        role: "center",
        bounds: { x: 0.8, y: 0, width: 0.3, height: 0.5 },
        alignment: "stretch",
        safeMargins: { top: 0, right: 0, bottom: 0, left: 0 },
        layerOrder: 0,
        clipContent: true,
        allowedComponentTypes: [],
      }),
    ).toThrow(/inside/u);
  });

  test("10.T3 enforces the minimum Slot size", () => {
    expect(() =>
      validateSlotDraft({
        name: "Tiny",
        role: "center",
        bounds: {
          x: 0,
          y: 0,
          width: MINIMUM_SLOT_SIZE / 2,
          height: MINIMUM_SLOT_SIZE,
        },
        alignment: "stretch",
        safeMargins: { top: 0, right: 0, bottom: 0, left: 0 },
        layerOrder: 0,
        clipContent: true,
        allowedComponentTypes: [],
      }),
    ).toThrow(/minimum/u);
  });

  test("10.T4 creates fixed landscape and portrait canvases", () => {
    expect(
      createLayoutFromPreset(
        { showId, name: "Landscape", presetId: "blank", aspectRatio: "16:9" },
        dependencies,
      ).canvas,
    ).toEqual({ width: 1920, height: 1080 });
    expect(
      createLayoutFromPreset(
        { showId, name: "Portrait", presetId: "blank", aspectRatio: "9:16" },
        dependencies,
      ).canvas,
    ).toEqual({ width: 1080, height: 1920 });
  });

  test("10.T5 keeps the four presets data-driven and creates their Slot geometry", () => {
    expect(LAYOUT_PRESETS.map(({ name }) => name)).toEqual([
      "Blank",
      "Host",
      "Host + Video",
      "Fullscreen Video",
    ]);
    for (const preset of LAYOUT_PRESETS) {
      const layout = createLayoutFromPreset(
        { showId, name: preset.name, presetId: preset.id },
        dependencies,
      );
      expect(layout.slots).toHaveLength(preset.slots.length);
      for (const slot of layout.slots)
        expect(() => validateSlotDraft(slot)).not.toThrow();
    }
  });
});
