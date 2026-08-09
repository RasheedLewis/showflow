import { describe, expect, test } from "vitest";

import {
  createEpisode,
  createEpisodeSegment,
  createFixedClock,
  createSegmentDataField,
  createShowSegment,
  parseEntityId,
  parseUtcTimestamp,
  type DomainFactoryDependencies,
  type EntityId,
  type EntityIdKind,
  type Episode,
  type EpisodeId,
  type ShowSegment,
  type ShowSegmentId,
  type Layout,
  type LayoutId,
} from "@showflow/domain";

import { UpdateEpisodeSegmentContentCommand } from "./episode-commands.mjs";

const initialTime = parseUtcTimestamp("2026-08-07T16:00:00.000Z");
const savedTime = parseUtcTimestamp("2026-08-07T16:01:00.000Z");
let suffix = 1;
const dependencies = (time = initialTime): DomainFactoryDependencies => ({
  clock: createFixedClock(time),
  createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> => {
    const id = parseEntityId<TEntity>(
      `01942c1f-ae8f-7e42-b900-${suffix.toString(16).padStart(12, "0")}`,
    );
    suffix += 1;
    return id;
  },
});

const createFixture = () => {
  const factory = dependencies();
  const showId = factory.createId("show");
  const layoutId = factory.createId("layout");
  const base = createShowSegment(
    {
      expectedDurationMs: 60_000,
      name: "Interview",
      notesTemplate: "Introduce the guest.",
      showId,
    },
    factory,
  );
  const guestName = createSegmentDataField(
    {
      defaultValue: "Show guest",
      label: "Guest name",
      position: 0,
      required: true,
      showSegmentId: base.id,
      type: "shortText",
    },
    factory,
  );
  const sourceSegment = {
    ...base,
    dataFields: [guestName],
    layoutIds: [layoutId],
    lifecycle: {
      ...base.lifecycle,
      active: {
        ...base.lifecycle.active,
        availableLayoutIds: [layoutId],
        defaultLayoutId: layoutId,
      },
    },
  };
  const firstEpisode = createEpisode({ showId, title: "Episode 1" }, factory);
  const secondEpisode = createEpisode({ showId, title: "Episode 2" }, factory);
  const first = createEpisodeSegment(
    {
      episode: firstEpisode,
      fieldValues: { [guestName.key]: "First guest" },
      notes: sourceSegment.notesTemplate,
      position: 0,
      sourceSegment,
    },
    factory,
  );
  const secondOccurrence = createEpisodeSegment(
    {
      episode: firstEpisode,
      fieldValues: { [guestName.key]: "Second guest" },
      notes: sourceSegment.notesTemplate,
      position: 1,
      sourceSegment,
    },
    factory,
  );
  const otherEpisodeSegment = createEpisodeSegment(
    {
      episode: secondEpisode,
      fieldValues: { [guestName.key]: "Other Episode guest" },
      notes: sourceSegment.notesTemplate,
      position: 0,
      sourceSegment,
    },
    factory,
  );
  const episodes = new Map<EpisodeId, Episode>([
    [firstEpisode.id, { ...firstEpisode, segments: [first, secondOccurrence] }],
    [secondEpisode.id, { ...secondEpisode, segments: [otherEpisodeSegment] }],
  ]);
  const segments = new Map<ShowSegmentId, ShowSegment>([
    [sourceSegment.id, sourceSegment],
  ]);
  const layout = {
    id: layoutId,
    showId,
    name: "Interview close",
    aspectRatio: "16:9",
    canvas: { width: 1920, height: 1080 },
    slots: [],
    componentPlacements: [],
    createdAt: initialTime,
    updatedAt: initialTime,
  } satisfies Layout;
  const layouts = new Map<LayoutId, Layout>([[layout.id, layout]]);
  const command = new UpdateEpisodeSegmentContentCommand(
    {
      episodes: {
        getById: async (id) => episodes.get(id) ?? null,
        listByShowId: async (id) =>
          [...episodes.values()].filter(({ showId: value }) => value === id),
        save: async (episode) => {
          episodes.set(episode.id, episode);
        },
      },
      segments: {
        getById: async (id) => segments.get(id) ?? null,
        listByShowId: async (id) =>
          [...segments.values()].filter(({ showId: value }) => value === id),
        save: async (segment) => {
          segments.set(segment.id, segment);
        },
      },
      layouts: {
        getById: async (id) => layouts.get(id) ?? null,
        listByShowId: async (id) =>
          [...layouts.values()].filter(({ showId: value }) => value === id),
        save: async (value) => {
          layouts.set(value.id, value);
        },
      },
    },
    dependencies(savedTime),
  );
  return {
    command,
    episodes,
    first,
    firstEpisode,
    guestName,
    layout,
    layouts,
    otherEpisodeSegment,
    secondOccurrence,
    sourceSegment,
  };
};

describe("UpdateEpisodeSegmentContentCommand", () => {
  test("8.T2 saves one Episode Segment without changing its source or sibling instances", async () => {
    const fixture = createFixture();
    const result = await fixture.command.execute({
      episodeId: fixture.firstEpisode.id,
      episodeSegmentId: fixture.first.id,
      expectedDurationOverrideMs: 90_000,
      expectedUpdatedAt: fixture.first.updatedAt,
      fieldValues: { [fixture.guestName.key]: "Updated guest" },
      notes: "Ask about the new record.",
    });

    expect(result.segments[0]).toMatchObject({
      expectedDurationOverrideMs: 90_000,
      fieldValues: { guestName: "Updated guest" },
      notes: "Ask about the new record.",
    });
    expect(result.segments[1]).toBe(fixture.secondOccurrence);
    expect(fixture.sourceSegment).toMatchObject({
      notesTemplate: "Introduce the guest.",
    });
    expect(
      [...fixture.episodes.values()].find(
        ({ id }) => id !== fixture.firstEpisode.id,
      )?.segments[0],
    ).toBe(fixture.otherEpisodeSegment);
  });

  test("8.T7 resets limited overrides to current Show defaults without changing the Show", async () => {
    const fixture = createFixture();
    const result = await fixture.command.execute({
      episodeId: fixture.firstEpisode.id,
      episodeSegmentId: fixture.first.id,
      expectedUpdatedAt: fixture.first.updatedAt,
      fieldValues: {
        [fixture.guestName.key]: fixture.guestName.defaultValue ?? "",
      },
      notes: fixture.sourceSegment.notesTemplate,
    });

    expect(result.segments[0]).not.toHaveProperty("expectedDurationOverrideMs");
    expect(result.segments[0]).toMatchObject({
      fieldValues: { guestName: "Show guest" },
      notes: "Introduce the guest.",
    });
    expect(fixture.sourceSegment.expectedDurationMs).toBe(60_000);
  });

  test("11.T13 persists and resets Episode Layout and fixed Resource overrides independently", async () => {
    const fixture = createFixture();
    const placementId = parseEntityId<"componentPlacement">(
      "01942c1f-ae8f-7e42-b900-000000000091",
    );
    const resourceId = parseEntityId<"resource">(
      "01942c1f-ae8f-7e42-b900-000000000092",
    );
    const overridden = await fixture.command.execute({
      episodeId: fixture.firstEpisode.id,
      episodeSegmentId: fixture.first.id,
      expectedUpdatedAt: fixture.first.updatedAt,
      fieldValues: fixture.first.fieldValues,
      notes: fixture.first.notes,
      defaultLayoutOverrideId: fixture.layout.id,
      fixedResourceReplacements: [
        {
          componentPlacementId: placementId,
          propertyKey: "image",
          resourceId,
        },
      ],
    });
    expect(overridden.segments[0]).toMatchObject({
      defaultLayoutOverrideId: fixture.layout.id,
      fixedResourceReplacements: [
        {
          componentPlacementId: placementId,
          propertyKey: "image",
          resourceId,
        },
      ],
    });

    const saved = overridden.segments[0];
    if (saved === undefined) throw new Error("Expected the saved Segment.");
    const reset = await fixture.command.execute({
      episodeId: fixture.firstEpisode.id,
      episodeSegmentId: fixture.first.id,
      expectedUpdatedAt: saved.updatedAt,
      fieldValues: saved.fieldValues,
      notes: saved.notes,
      defaultLayoutOverrideId: null,
      fixedResourceReplacements: [],
    });
    expect(reset.segments[0]).not.toHaveProperty("defaultLayoutOverrideId");
    expect(reset.segments[0]?.fixedResourceReplacements).toEqual([]);
    expect(reset.segments[1]).toBe(fixture.secondOccurrence);
    expect(
      [...fixture.episodes.values()].find(
        ({ id }) => id !== fixture.firstEpisode.id,
      )?.segments[0],
    ).toBe(fixture.otherEpisodeSegment);
    expect(fixture.layout.name).toBe("Interview close");
  });

  test("preserves a Layout created as the current Episode override on later content saves", async () => {
    const fixture = createFixture();
    const createdLayout = {
      ...fixture.layout,
      id: parseEntityId<"layout">("01942c1f-ae8f-7e42-b900-000000000093"),
      name: "Episode interview",
    } satisfies Layout;
    fixture.layouts.set(createdLayout.id, createdLayout);
    const current = {
      ...fixture.first,
      defaultLayoutOverrideId: createdLayout.id,
    };
    fixture.episodes.set(fixture.firstEpisode.id, {
      ...fixture.firstEpisode,
      segments: [current, fixture.secondOccurrence],
    });

    const result = await fixture.command.execute({
      episodeId: fixture.firstEpisode.id,
      episodeSegmentId: current.id,
      expectedUpdatedAt: current.updatedAt,
      fieldValues: { [fixture.guestName.key]: "Updated guest" },
      notes: current.notes,
      defaultLayoutOverrideId: createdLayout.id,
    });

    expect(result.segments[0]).toMatchObject({
      defaultLayoutOverrideId: createdLayout.id,
      fieldValues: { guestName: "Updated guest" },
    });
  });

  test("rejects values that do not match the source schema", async () => {
    const fixture = createFixture();
    await expect(
      fixture.command.execute({
        episodeId: fixture.firstEpisode.id,
        episodeSegmentId: fixture.first.id,
        expectedUpdatedAt: fixture.first.updatedAt,
        fieldValues: { [fixture.guestName.key]: 42 },
        notes: fixture.first.notes,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
