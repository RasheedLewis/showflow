import { defineSegmentLifecycle } from "@showflow/domain";
import type {
  Episode,
  Layout,
  Show,
  ShowSegment,
  Studio,
} from "@showflow/domain";

import { fixtureId, fixtureMetadata } from "./fixture-values.mjs";

export type FixtureOverrides<TEntity> = Partial<TEntity>;

const DEFAULT_STUDIO_ID = fixtureId<"studio">(1);
const DEFAULT_SHOW_ID = fixtureId<"show">(2);
const DEFAULT_SEGMENT_ID = fixtureId<"showSegment">(3);
const DEFAULT_LAYOUT_ID = fixtureId<"layout">(4);
const DEFAULT_EPISODE_ID = fixtureId<"episode">(5);

export const studioFixture = (
  overrides: FixtureOverrides<Studio> = {},
): Studio => ({
  id: DEFAULT_STUDIO_ID,
  name: "Fixture Studio",
  ...fixtureMetadata(),
  ...overrides,
});

export const showFixture = (overrides: FixtureOverrides<Show> = {}): Show => ({
  id: DEFAULT_SHOW_ID,
  studioId: DEFAULT_STUDIO_ID,
  name: "Fixture Show",
  ...fixtureMetadata(),
  ...overrides,
  styleDefaults: { ...(overrides.styleDefaults ?? {}) },
});

export const segmentFixture = (
  overrides: FixtureOverrides<ShowSegment> = {},
): ShowSegment => {
  const id = overrides.id ?? DEFAULT_SEGMENT_ID;
  const lifecycle =
    overrides.lifecycle ??
    defineSegmentLifecycle({
      showSegmentId: id,
      prepare: [],
      enter: [],
      active: { availableLayoutIds: [], hostCueIds: [] },
      exit: [],
      cleanup: [],
      ...fixtureMetadata(),
    });

  return {
    showId: DEFAULT_SHOW_ID,
    name: "Fixture Segment",
    expectedDurationMs: 60_000,
    notesTemplate: "",
    ...fixtureMetadata(),
    ...overrides,
    id,
    dataFields: [...(overrides.dataFields ?? [])],
    lifecycle,
    layoutIds: [...(overrides.layoutIds ?? [])],
    hostCues: [...(overrides.hostCues ?? [])],
  };
};

export const layoutFixture = (
  overrides: FixtureOverrides<Layout> = {},
): Layout => {
  const aspectRatio = overrides.aspectRatio ?? "16:9";
  const defaultCanvas =
    aspectRatio === "16:9"
      ? { width: 1_920, height: 1_080 }
      : { width: 1_080, height: 1_920 };

  return {
    id: DEFAULT_LAYOUT_ID,
    showId: DEFAULT_SHOW_ID,
    name: "Fixture Layout",
    ...fixtureMetadata(),
    ...overrides,
    aspectRatio,
    canvas: { ...(overrides.canvas ?? defaultCanvas) },
    slots: [...(overrides.slots ?? [])],
    componentPlacements: [...(overrides.componentPlacements ?? [])],
  };
};

export const episodeFixture = (
  overrides: FixtureOverrides<Episode> = {},
): Episode => ({
  id: DEFAULT_EPISODE_ID,
  showId: DEFAULT_SHOW_ID,
  title: "Fixture Episode",
  status: "draft",
  internalNotes: "",
  ...fixtureMetadata(),
  ...overrides,
  guestNames: [...(overrides.guestNames ?? [])],
  segments: [...(overrides.segments ?? [])],
});
