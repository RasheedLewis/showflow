import { describe, expect, test } from "vitest";

import {
  BASE_VALIDATION_ISSUE_CODES,
  BaseValidationService,
  createFixedClock,
} from "@showflow/domain";
import type {
  DomainFactoryDependencies,
  EntityId,
  EntityIdKind,
} from "@showflow/domain";

import {
  episodeFixture,
  fixtureId,
  fixtureMetadata,
  FIXTURE_TIMESTAMP,
  layoutFixture,
  segmentFixture,
  showFixture,
  studioFixture,
} from "./index.js";

describe("deterministic entity fixtures", () => {
  test("returns the same values for the same builder inputs", () => {
    expect(studioFixture()).toEqual(studioFixture());
    expect(showFixture()).toEqual(showFixture());
    expect(segmentFixture()).toEqual(segmentFixture());
    expect(layoutFixture()).toEqual(layoutFixture());
    expect(episodeFixture()).toEqual(episodeFixture());
    expect(fixtureMetadata()).toEqual({
      createdAt: FIXTURE_TIMESTAMP,
      updatedAt: FIXTURE_TIMESTAMP,
    });
  });

  test("applies explicit overrides without changing unrelated defaults", () => {
    const studio = studioFixture({ name: "Override Studio" });
    const show = showFixture({
      name: "Override Show",
      styleDefaults: { accent: "gold" },
    });
    const segment = segmentFixture({
      name: "Override Segment",
      expectedDurationMs: 90_000,
    });
    const layout = layoutFixture({
      name: "Override Layout",
      aspectRatio: "9:16",
    });
    const episode = episodeFixture({
      title: "Override Episode",
      guestNames: ["Ada"],
    });

    expect(studio).toMatchObject({ name: "Override Studio" });
    expect(show).toMatchObject({
      studioId: studio.id,
      name: "Override Show",
      styleDefaults: { accent: "gold" },
    });
    expect(segment).toMatchObject({
      showId: show.id,
      name: "Override Segment",
      expectedDurationMs: 90_000,
    });
    expect(layout).toMatchObject({
      showId: show.id,
      name: "Override Layout",
      aspectRatio: "9:16",
      canvas: { width: 1_080, height: 1_920 },
    });
    expect(episode).toMatchObject({
      showId: show.id,
      title: "Override Episode",
      guestNames: ["Ada"],
    });
  });

  test("derives a valid lifecycle from an overridden Segment ID", () => {
    const id = fixtureId<"showSegment">(100);
    const segment = segmentFixture({ id });

    expect(segment.id).toBe(id);
    expect(segment.lifecycle.showSegmentId).toBe(id);
    expect(Object.keys(segment.lifecycle)).toEqual([
      "showSegmentId",
      "prepare",
      "enter",
      "active",
      "exit",
      "cleanup",
      "createdAt",
      "updatedAt",
    ]);
  });

  test("allocates independent nested collections for every call", () => {
    const firstShow = showFixture();
    const secondShow = showFixture();
    const firstSegment = segmentFixture();
    const secondSegment = segmentFixture();
    const firstLayout = layoutFixture();
    const secondLayout = layoutFixture();
    const firstEpisode = episodeFixture();
    const secondEpisode = episodeFixture();

    expect(firstShow.styleDefaults).not.toBe(secondShow.styleDefaults);
    expect(firstSegment.dataFields).not.toBe(secondSegment.dataFields);
    expect(firstSegment.layoutIds).not.toBe(secondSegment.layoutIds);
    expect(firstSegment.hostCues).not.toBe(secondSegment.hostCues);
    expect(firstSegment.lifecycle).not.toBe(secondSegment.lifecycle);
    expect(firstLayout.canvas).not.toBe(secondLayout.canvas);
    expect(firstLayout.slots).not.toBe(secondLayout.slots);
    expect(firstLayout.componentPlacements).not.toBe(
      secondLayout.componentPlacements,
    );
    expect(firstEpisode.guestNames).not.toBe(secondEpisode.guestNames);
    expect(firstEpisode.segments).not.toBe(secondEpisode.segments);
  });

  test("produces a valid default Show snapshot", () => {
    let issueSequence = 500;
    const dependencies: DomainFactoryDependencies = {
      clock: createFixedClock(FIXTURE_TIMESTAMP),
      createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> => {
        const id = fixtureId<TEntity>(issueSequence);
        issueSequence += 1;
        return id;
      },
    };
    const issues = new BaseValidationService(dependencies).validate({
      studios: [studioFixture()],
      shows: [showFixture()],
      blueprints: [],
      segments: [segmentFixture()],
      layouts: [layoutFixture()],
      components: [],
      resources: [],
      episodes: [episodeFixture()],
    });

    expect(issues).toEqual([]);
    expect(BASE_VALIDATION_ISSUE_CODES.invalidOwnership).toBe(
      "INVALID_OWNERSHIP",
    );
  });

  test("rejects fixture ID sequences outside the deterministic range", () => {
    expect(() => fixtureId(-1)).toThrow(RangeError);
    expect(() => fixtureId(Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
  });
});
