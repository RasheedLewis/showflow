import { describe, expect, test } from "vitest";

import {
  CreateShowRequestSchema,
  GetShowDesignRequestSchema,
  ListShowsRequestSchema,
  RenameShowRequestSchema,
  ShowDeleteResultSchema,
  ShowDesignResultSchema,
  ShowListResultSchema,
  ShowMutationRequestSchema,
} from "./show.ts";

const studioId = "8d9df01f-2584-4b9a-ad13-a96d673918e9";
const showId = "514ad6df-710d-4301-9bff-b096e9db3dd4";

describe("Show desktop contracts", () => {
  test("normalizes blank Show creation input", () => {
    expect(
      CreateShowRequestSchema.parse({
        studioId,
        name: "  Artist Interviews  ",
        description: "  Weekly artist interviews.  ",
      }),
    ).toEqual({
      studioId,
      name: "Artist Interviews",
      description: "Weekly artist interviews.",
    });
  });

  test("accepts an empty Blueprint response and rejects malformed boundaries", () => {
    const result = {
      ok: true,
      data: {
        show: {
          archivedAt: null,
          createdAt: "2026-08-06T14:30:00.000Z",
          description: null,
          id: showId,
          name: "Artist Interviews",
          studioId,
          thumbnailResourceId: null,
          updatedAt: "2026-08-06T14:30:00.000Z",
        },
        blueprint: {
          createdAt: "2026-08-06T14:30:00.000Z",
          id: "5da62c88-a25d-450d-bf4d-3809a9f8bd11",
          placementCount: 0,
          showId,
          updatedAt: "2026-08-06T14:30:00.000Z",
        },
      },
    };

    expect(ShowDesignResultSchema.safeParse(result).success).toBe(true);
    expect(
      CreateShowRequestSchema.safeParse({ studioId, name: "   " }).success,
    ).toBe(false);
    expect(
      GetShowDesignRequestSchema.safeParse({ studioId, showId: "missing" })
        .success,
    ).toBe(false);
    expect(
      ShowDesignResultSchema.safeParse({
        ...result,
        data: {
          ...result.data,
          blueprint: { ...result.data.blueprint, placementCount: -1 },
        },
      }).success,
    ).toBe(false);
  });

  test("validates Show card and mutation contracts", () => {
    const show = {
      archivedAt: null,
      createdAt: "2026-08-06T14:30:00.000Z",
      description: "Weekly artist interviews.",
      id: showId,
      name: "Artist Interviews",
      studioId,
      thumbnailResourceId: null,
      updatedAt: "2026-08-06T14:30:00.000Z",
    };
    expect(
      ShowListResultSchema.safeParse({
        ok: true,
        data: [{ episodeCount: 0, show }],
      }).success,
    ).toBe(true);
    expect(ListShowsRequestSchema.parse({ studioId })).toEqual({ studioId });
    expect(
      RenameShowRequestSchema.parse({
        studioId,
        showId,
        name: "  Renamed Show  ",
      }),
    ).toMatchObject({ name: "Renamed Show" });
    expect(
      ShowMutationRequestSchema.safeParse({ studioId, showId }).success,
    ).toBe(true);
    expect(
      ShowDeleteResultSchema.safeParse({ ok: true, data: { showId } }).success,
    ).toBe(true);
    expect(
      ShowListResultSchema.safeParse({
        ok: true,
        data: [{ episodeCount: -1, show }],
      }).success,
    ).toBe(false);
  });
});
