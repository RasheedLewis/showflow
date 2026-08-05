import { describe, expect, expectTypeOf, test } from "vitest";

import {
  createEntityId,
  createUuid,
  isUuid,
  parseEntityId,
  parseUuid,
} from "./entity-id.mjs";
import type { ShowId, StudioId, Uuid } from "./entity-id.mjs";

describe("canonical entity IDs", () => {
  test("generates RFC 4122 version 4 UUIDs with crypto.randomUUID", () => {
    const first = createUuid();
    const second = createUuid();

    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    expect(second).not.toBe(first);
    expect(isUuid(first)).toBe(true);
  });

  test("brands parsed and generated IDs by entity type", () => {
    const studioId = parseEntityId<"studio">(
      "018f76d2-9d66-7a12-98d8-2af85f73fe43",
    );
    const showId = createEntityId<"show">();

    expectTypeOf(studioId).toEqualTypeOf<StudioId>();
    expectTypeOf(showId).toEqualTypeOf<ShowId>();
    expectTypeOf<StudioId>().not.toEqualTypeOf<ShowId>();
    expect(isUuid(studioId)).toBe(true);
    expect(isUuid(showId)).toBe(true);
  });

  test.each([
    "not-a-uuid",
    "018F76D2-9D66-7A12-98D8-2AF85F73FE43",
    "018f76d2-9d66-0a12-98d8-2af85f73fe43",
    "018f76d2-9d66-7a12-78d8-2af85f73fe43",
  ])("rejects noncanonical UUID value %s", (value) => {
    expect(isUuid(value)).toBe(false);
    expect(() => parseUuid(value)).toThrow(TypeError);
  });

  test("returns a branded UUID after validation", () => {
    const uuid = parseUuid("01942c1f-ae8f-7e42-b900-9bf64a6b6271");

    expectTypeOf(uuid).toEqualTypeOf<Uuid>();
    expect(uuid).toBe("01942c1f-ae8f-7e42-b900-9bf64a6b6271");
  });
});
