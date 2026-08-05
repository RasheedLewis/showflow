import { describe, expect, expectTypeOf, test } from "vitest";

import {
  createFixedClock,
  currentUtcTimestamp,
  isUtcTimestamp,
  parseUtcTimestamp,
  SYSTEM_CLOCK,
  toUtcTimestamp,
} from "./clock.mjs";
import type { UtcTimestamp } from "./clock.mjs";

describe("UTC timestamps and clocks", () => {
  test("normalizes dates to canonical UTC strings", () => {
    const timestamp = toUtcTimestamp(new Date("2026-08-05T11:42:03.125-04:00"));

    expectTypeOf(timestamp).toEqualTypeOf<UtcTimestamp>();
    expect(timestamp).toBe("2026-08-05T15:42:03.125Z");
    expect(isUtcTimestamp(timestamp)).toBe(true);
  });

  test.each([
    "2026-08-05T15:42:03Z",
    "2026-08-05T11:42:03.125-04:00",
    "2026-02-30T15:42:03.125Z",
    "not-a-date",
  ])("rejects noncanonical UTC timestamp %s", (value) => {
    expect(isUtcTimestamp(value)).toBe(false);
    expect(() => parseUtcTimestamp(value)).toThrow(TypeError);
  });

  test("rejects invalid Date instances", () => {
    expect(() => toUtcTimestamp(new Date(Number.NaN))).toThrow(RangeError);
    expect(() => createFixedClock(new Date(Number.NaN))).toThrow(RangeError);
  });

  test("injects a deterministic fixed clock without exposing mutable Date state", () => {
    const timestamp = parseUtcTimestamp("2026-08-05T15:42:03.125Z");
    const clock = createFixedClock(timestamp);
    const firstRead = clock.now();

    firstRead.setUTCFullYear(2030);

    expect(currentUtcTimestamp(clock)).toBe(timestamp);
  });

  test("provides a canonical UTC timestamp from the system clock", () => {
    expect(isUtcTimestamp(currentUtcTimestamp(SYSTEM_CLOCK))).toBe(true);
  });
});
