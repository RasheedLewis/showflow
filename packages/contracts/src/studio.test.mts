import { describe, expect, test } from "vitest";

import {
  CreateStudioRequestSchema,
  GetStudioRequestSchema,
  ListStudiosRequestSchema,
  StudioListResultSchema,
  StudioResultSchema,
} from "./studio.ts";

const STUDIO_ID = "8d9df01f-2584-4b9a-ad13-a96d673918e9";

describe("Studio desktop contracts", () => {
  test("normalizes a valid Studio creation request", () => {
    expect(
      CreateStudioRequestSchema.parse({ name: "  Public Sphere  " }),
    ).toEqual({ name: "Public Sphere" });
    expect(GetStudioRequestSchema.parse({ studioId: STUDIO_ID })).toEqual({
      studioId: STUDIO_ID,
    });
    expect(ListStudiosRequestSchema.parse(undefined)).toBeUndefined();
  });

  test("accepts a serializable Studio list", () => {
    expect(
      StudioListResultSchema.safeParse({
        ok: true,
        data: [
          {
            archivedAt: null,
            createdAt: "2026-08-06T14:30:00.000Z",
            id: STUDIO_ID,
            logoResourceId: null,
            name: "Public Sphere",
            updatedAt: "2026-08-06T14:30:00.000Z",
          },
        ],
      }).success,
    ).toBe(true);
  });

  test("accepts a serializable Studio result", () => {
    expect(
      StudioResultSchema.safeParse({
        ok: true,
        data: {
          archivedAt: null,
          createdAt: "2026-08-06T14:30:00.000Z",
          id: STUDIO_ID,
          logoResourceId: null,
          name: "Public Sphere",
          updatedAt: "2026-08-06T14:30:00.000Z",
        },
      }).success,
    ).toBe(true);
  });

  test("rejects empty names, invalid IDs, and malformed timestamps", () => {
    expect(CreateStudioRequestSchema.safeParse({ name: "   " }).success).toBe(
      false,
    );
    expect(
      GetStudioRequestSchema.safeParse({ studioId: "Public Sphere" }).success,
    ).toBe(false);
    expect(ListStudiosRequestSchema.safeParse({}).success).toBe(false);
    expect(
      StudioResultSchema.safeParse({
        ok: true,
        data: {
          archivedAt: null,
          createdAt: "yesterday",
          id: STUDIO_ID,
          logoResourceId: null,
          name: "Public Sphere",
          updatedAt: "2026-08-06T14:30:00.000Z",
        },
      }).success,
    ).toBe(false);
  });
});
