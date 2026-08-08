import { describe, expect, test } from "vitest";
import type { SlotDraftDto } from "@showflow/contracts";

import {
  MIN_SLOT_SIZE,
  moveSlot,
  resizeSlot,
  updateSlotPercent,
} from "./layout-geometry.mts";

const slot: SlotDraftDto = {
  name: "Host camera",
  role: "hostCamera",
  bounds: { x: 0.1, y: 0.1, width: 0.4, height: 0.4 },
  alignment: "stretch",
  safeMargins: { top: 0, right: 0, bottom: 0, left: 0 },
  layerOrder: 0,
  clipContent: true,
  allowedComponentTypes: ["camera"],
};

describe("Layout editor geometry", () => {
  test("10.T6 converts pointer movement and resizing to normalized geometry", () => {
    expect(moveSlot(slot, 0.2, 0.15).bounds).toEqual({
      x: 0.3,
      y: 0.25,
      width: 0.4,
      height: 0.4,
    });
    expect(resizeSlot(slot, 0.2, 0.1).bounds).toEqual({
      x: 0.1,
      y: 0.1,
      width: 0.6,
      height: 0.5,
    });
  });

  test("10.T7 applies keyboard-entered percentages and clamps them", () => {
    expect(updateSlotPercent(slot, "x", 75).bounds.x).toBe(0.6);
    expect(updateSlotPercent(slot, "width", 1).bounds.width).toBe(
      MIN_SLOT_SIZE,
    );
  });

  test("10.T9 movement preserves stable layer order", () => {
    expect(moveSlot({ ...slot, layerOrder: 7 }, 0.1, 0.1).layerOrder).toBe(7);
  });
});
