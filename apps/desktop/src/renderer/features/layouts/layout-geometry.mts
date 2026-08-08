import type { SlotDraftDto } from "@showflow/contracts";

export const MIN_SLOT_SIZE = 0.02;
export const SNAP_THRESHOLD = 0.012;

const round = (value: number): number => Math.round(value * 10_000) / 10_000;
const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));
const snap = (value: number, targets: readonly number[]): number => {
  const target = targets.find(
    (candidate) => Math.abs(candidate - value) <= SNAP_THRESHOLD,
  );
  return target ?? value;
};

export const moveSlot = (
  slot: SlotDraftDto,
  deltaX: number,
  deltaY: number,
): SlotDraftDto => {
  const x = clamp(slot.bounds.x + deltaX, 0, 1 - slot.bounds.width);
  const y = clamp(slot.bounds.y + deltaY, 0, 1 - slot.bounds.height);
  const snappedX = snap(x, [
    0,
    0.5 - slot.bounds.width / 2,
    1 - slot.bounds.width,
  ]);
  const snappedY = snap(y, [
    0,
    0.5 - slot.bounds.height / 2,
    1 - slot.bounds.height,
  ]);
  return {
    ...slot,
    bounds: { ...slot.bounds, x: round(snappedX), y: round(snappedY) },
  };
};

export const resizeSlot = (
  slot: SlotDraftDto,
  deltaX: number,
  deltaY: number,
): SlotDraftDto => {
  const width = clamp(
    slot.bounds.width + deltaX,
    MIN_SLOT_SIZE,
    1 - slot.bounds.x,
  );
  const height = clamp(
    slot.bounds.height + deltaY,
    MIN_SLOT_SIZE,
    1 - slot.bounds.y,
  );
  const right = snap(slot.bounds.x + width, [0.5, 1]);
  const bottom = snap(slot.bounds.y + height, [0.5, 1]);
  return {
    ...slot,
    bounds: {
      ...slot.bounds,
      width: round(
        clamp(right - slot.bounds.x, MIN_SLOT_SIZE, 1 - slot.bounds.x),
      ),
      height: round(
        clamp(bottom - slot.bounds.y, MIN_SLOT_SIZE, 1 - slot.bounds.y),
      ),
    },
  };
};

export const updateSlotPercent = (
  slot: SlotDraftDto,
  property: "x" | "y" | "width" | "height",
  percent: number,
): SlotDraftDto => {
  const normalized = percent / 100;
  const bounds = { ...slot.bounds };
  if (property === "x") bounds.x = clamp(normalized, 0, 1 - bounds.width);
  if (property === "y") bounds.y = clamp(normalized, 0, 1 - bounds.height);
  if (property === "width")
    bounds.width = clamp(normalized, MIN_SLOT_SIZE, 1 - bounds.x);
  if (property === "height")
    bounds.height = clamp(normalized, MIN_SLOT_SIZE, 1 - bounds.y);
  return {
    ...slot,
    bounds: {
      x: round(bounds.x),
      y: round(bounds.y),
      width: round(bounds.width),
      height: round(bounds.height),
    },
  };
};

export const percent = (value: number): string =>
  String(Math.round(value * 10_000) / 100);
