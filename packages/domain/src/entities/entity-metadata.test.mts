import { describe, expect, test } from "vitest";

import { createFixedClock, parseUtcTimestamp } from "../time/clock.mjs";
import {
  createEntityMetadata,
  updateEntityMetadata,
} from "./entity-metadata.mjs";

describe("entity metadata", () => {
  test("uses one injected clock reading for creation metadata", () => {
    const createdAt = parseUtcTimestamp("2026-08-05T15:42:03.125Z");

    expect(createEntityMetadata(createFixedClock(createdAt))).toEqual({
      createdAt,
      updatedAt: createdAt,
    });
  });

  test("preserves creation time and advances update time", () => {
    const createdAt = parseUtcTimestamp("2026-08-05T15:42:03.125Z");
    const updatedAt = parseUtcTimestamp("2026-08-05T16:03:12.500Z");
    const metadata = createEntityMetadata(createFixedClock(createdAt));

    expect(updateEntityMetadata(metadata, createFixedClock(updatedAt))).toEqual(
      {
        createdAt,
        updatedAt,
      },
    );
  });

  test("rejects a clock value earlier than entity creation", () => {
    const createdAt = parseUtcTimestamp("2026-08-05T15:42:03.125Z");
    const earlier = parseUtcTimestamp("2026-08-05T15:42:03.124Z");
    const metadata = createEntityMetadata(createFixedClock(createdAt));

    expect(() =>
      updateEntityMetadata(metadata, createFixedClock(earlier)),
    ).toThrow("An entity cannot be updated before it was created.");
  });
});
