import { describe, expect, expectTypeOf, test } from "vitest";

import {
  createEpisode,
  createEpisodeSegment,
  createFixedClock,
  createLayout,
  createShow,
  createShowSegment,
  createStudio,
  InvalidOwnershipError,
  isUtcTimestamp,
  isUuid,
  parseEntityId,
  parseUtcTimestamp,
  SEGMENT_LIFECYCLE_PHASES,
} from "../index.js";
import type {
  DomainFactoryDependencies,
  EntityId,
  EntityIdKind,
  Episode,
  Layout,
  Show,
  ShowSegment,
  Studio,
} from "../index.js";

const entityId = <TEntity extends EntityIdKind>(
  suffix: number,
): EntityId<TEntity> =>
  parseEntityId<TEntity>(
    `01942c1f-ae8f-7e42-b900-${suffix.toString(16).padStart(12, "0")}`,
  );

const timestamp = parseUtcTimestamp("2026-08-05T15:42:03.125Z");

const factoryDependencies = (suffix: number): DomainFactoryDependencies => ({
  clock: createFixedClock(timestamp),
  createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
    entityId<TEntity>(suffix),
});

const metadata = {
  createdAt: timestamp,
  updatedAt: timestamp,
} as const;

const showId = entityId<"show">(10);
const anotherShowId = entityId<"show">(11);

const sourceSegment = createShowSegment(
  { showId, name: "Opening" },
  factoryDependencies(20),
);

const episode = createEpisode(
  { showId, title: "Episode 1" },
  factoryDependencies(30),
);

describe("domain factories", () => {
  test("creates a Studio with canonical identity and metadata", () => {
    const studio = createStudio(
      { name: "Public Sphere" },
      factoryDependencies(1),
    );

    expectTypeOf(studio).toEqualTypeOf<Studio>();
    expect(studio).toEqual({
      id: entityId<"studio">(1),
      name: "Public Sphere",
      ...metadata,
    });
    expect(studio).not.toHaveProperty("logoResourceId");
  });

  test("creates a blank Show with independent style defaults", () => {
    const studioId = entityId<"studio">(1);
    const styleDefaults = { lowerThirdStyle: "warm" } as const;
    const configuredShow = createShow(
      {
        studioId,
        name: "Top 10 Music Videos",
        description: "A weekly music countdown.",
        styleDefaults,
      },
      factoryDependencies(10),
    );
    const blankShow = createShow(
      { studioId, name: "Artist Interviews" },
      factoryDependencies(11),
    );

    expectTypeOf(configuredShow).toEqualTypeOf<Show>();
    expect(configuredShow).toEqual({
      id: showId,
      studioId,
      name: "Top 10 Music Videos",
      description: "A weekly music countdown.",
      styleDefaults,
      ...metadata,
    });
    expect(configuredShow.styleDefaults).not.toBe(styleDefaults);
    expect(blankShow.styleDefaults).toEqual({});
    expect(blankShow).not.toHaveProperty("description");
    expect(blankShow).not.toHaveProperty("thumbnailResourceId");
  });

  test("creates a Show Segment with an empty closed lifecycle", () => {
    const segment = createShowSegment(
      {
        showId,
        name: "Opening",
        expectedDurationMs: 90_000,
      },
      factoryDependencies(20),
    );

    expectTypeOf(segment).toEqualTypeOf<ShowSegment>();
    expect(segment).toMatchObject({
      id: entityId<"showSegment">(20),
      showId,
      name: "Opening",
      dataFields: [],
      layoutIds: [],
      hostCues: [],
      expectedDurationMs: 90_000,
      notesTemplate: "",
      ...metadata,
    });
    expect(segment.lifecycle).toEqual({
      showSegmentId: segment.id,
      prepare: [],
      enter: [],
      active: { availableLayoutIds: [], hostCueIds: [] },
      exit: [],
      cleanup: [],
      ...metadata,
    });
    expect(Object.keys(segment.lifecycle).slice(1, 6)).toEqual(
      SEGMENT_LIFECYCLE_PHASES,
    );
  });

  test("defaults a blank Layout to a 16:9 canvas", () => {
    const layout = createLayout(
      { showId, name: "Host" },
      factoryDependencies(40),
    );

    expectTypeOf(layout).toEqualTypeOf<Layout>();
    expect(layout).toEqual({
      id: entityId<"layout">(40),
      showId,
      name: "Host",
      aspectRatio: "16:9",
      canvas: { width: 1_920, height: 1_080 },
      slots: [],
      componentPlacements: [],
      ...metadata,
    });
  });

  test("creates an independent fixed 9:16 Layout when requested", () => {
    const first = createLayout(
      { showId, name: "Portrait Host", aspectRatio: "9:16" },
      factoryDependencies(41),
    );
    const second = createLayout(
      { showId, name: "Portrait Video", aspectRatio: "9:16" },
      factoryDependencies(42),
    );

    expect(first).toMatchObject({
      aspectRatio: "9:16",
      canvas: { width: 1_080, height: 1_920 },
    });
    expect(first.canvas).not.toBe(second.canvas);
  });

  test("creates a draft Episode with empty production defaults", () => {
    const guests = ["Jane Doe"];
    const plannedAt = parseUtcTimestamp("2026-08-12T19:00:00.000Z");
    const createdEpisode = createEpisode(
      {
        showId,
        title: "Episode 32",
        episodeNumber: 32,
        plannedAt,
        guestNames: guests,
      },
      factoryDependencies(30),
    );

    expectTypeOf(createdEpisode).toEqualTypeOf<Episode>();
    expect(createdEpisode).toEqual({
      id: entityId<"episode">(30),
      showId,
      title: "Episode 32",
      episodeNumber: 32,
      plannedAt,
      status: "draft",
      guestNames: ["Jane Doe"],
      internalNotes: "",
      segments: [],
      ...metadata,
    });
    expect(createdEpisode.guestNames).not.toBe(guests);
  });

  test("creates an Episode Segment with independent empty defaults", () => {
    const segment = createEpisodeSegment(
      { episode, sourceSegment, position: 0 },
      factoryDependencies(50),
    );
    const anotherSegment = createEpisodeSegment(
      { episode, sourceSegment, position: 1 },
      factoryDependencies(51),
    );

    expect(segment).toEqual({
      id: entityId<"episodeSegment">(50),
      episodeId: episode.id,
      sourceShowSegmentId: sourceSegment.id,
      position: 0,
      fieldValues: {},
      notes: "",
      fixedResourceReplacements: [],
      ...metadata,
    });
    expect(segment.fieldValues).not.toBe(anotherSegment.fieldValues);
    expect(segment.fixedResourceReplacements).not.toBe(
      anotherSegment.fixedResourceReplacements,
    );
  });

  test("copies supported Episode Segment values and a same-Show Layout override", () => {
    const layout = createLayout(
      { showId, name: "Host" },
      factoryDependencies(40),
    );
    const fieldValues = { lowerThirdTitle: "This week" } as const;
    const segment = createEpisodeSegment(
      {
        episode,
        sourceSegment,
        position: 2,
        label: "Cold open",
        fieldValues,
        notes: "Welcome viewers.",
        expectedDurationOverrideMs: 75_000,
        defaultLayoutOverride: layout,
      },
      factoryDependencies(50),
    );

    expect(segment).toMatchObject({
      label: "Cold open",
      fieldValues,
      notes: "Welcome viewers.",
      expectedDurationOverrideMs: 75_000,
      defaultLayoutOverrideId: layout.id,
    });
    expect(segment.fieldValues).not.toBe(fieldValues);
  });

  test("rejects an Episode Segment source from another Show before allocating identity", () => {
    const crossShowSegment = createShowSegment(
      { showId: anotherShowId, name: "Closing" },
      factoryDependencies(21),
    );
    let allocationCount = 0;
    const dependencies: DomainFactoryDependencies = {
      clock: createFixedClock(timestamp),
      createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> => {
        allocationCount += 1;
        return entityId<TEntity>(50);
      },
    };

    expect(() =>
      createEpisodeSegment(
        { episode, sourceSegment: crossShowSegment, position: 0 },
        dependencies,
      ),
    ).toThrow(
      expect.objectContaining({
        code: "INVALID_OWNERSHIP",
        relationship: "show.segment",
      }),
    );
    expect(allocationCount).toBe(0);
  });

  test("rejects an Episode Segment Layout override from another Show", () => {
    const crossShowLayout = createLayout(
      { showId: anotherShowId, name: "Other Show Host" },
      factoryDependencies(43),
    );

    expect(() =>
      createEpisodeSegment(
        {
          episode,
          sourceSegment,
          position: 0,
          defaultLayoutOverride: crossShowLayout,
        },
        factoryDependencies(50),
      ),
    ).toThrow(InvalidOwnershipError);
  });

  test("uses secure IDs and canonical UTC metadata with default dependencies", () => {
    const studio = createStudio({ name: "Public Sphere" });

    expect(isUuid(studio.id)).toBe(true);
    expect(isUtcTimestamp(studio.createdAt)).toBe(true);
    expect(studio.updatedAt).toBe(studio.createdAt);
  });
});
