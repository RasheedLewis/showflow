import { describe, expect, test } from "vitest";

import { parseEntityId } from "../identity/entity-id.mjs";
import type { EntityId, EntityIdKind } from "../identity/entity-id.mjs";
import { createFixedClock, parseUtcTimestamp } from "../time/clock.mjs";
import {
  calculateEpisodeSegmentReadiness,
  deriveEpisodeSegmentSummary,
  resolveInitialEpisodeSegmentFieldValues,
  validateEpisodeSegmentContent,
} from "./episode-content.mjs";
import {
  createEpisode,
  createEpisodeSegment,
  createSegmentDataField,
  createShowSegment,
} from "./factories.mjs";
import type { DomainFactoryDependencies } from "./factories.mjs";

const timestamp = parseUtcTimestamp("2026-08-07T16:00:00.000Z");
let suffix = 1;
const dependencies: DomainFactoryDependencies = {
  clock: createFixedClock(timestamp),
  createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> => {
    const id = parseEntityId<TEntity>(
      `01942c1f-ae8f-7e42-b900-${suffix.toString(16).padStart(12, "0")}`,
    );
    suffix += 1;
    return id;
  },
};

const createContentFixture = () => {
  const showId = dependencies.createId("show");
  const base = createShowSegment(
    {
      name: "Interview",
      notesTemplate: "Introduce the guest.",
      showId,
    },
    dependencies,
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
    dependencies,
  );
  const approved = createSegmentDataField(
    {
      defaultValue: false,
      label: "Approved",
      position: 1,
      required: true,
      showSegmentId: base.id,
      type: "boolean",
    },
    dependencies,
  );
  const sourceSegment = { ...base, dataFields: [guestName, approved] };
  const episode = createEpisode({ showId, title: "Episode 1" }, dependencies);
  return { approved, episode, guestName, sourceSegment };
};

describe("Episode Segment content", () => {
  test("8.T1 resolves Blueprint placement data before Show defaults", () => {
    const { approved, guestName, sourceSegment } = createContentFixture();

    expect(
      resolveInitialEpisodeSegmentFieldValues(sourceSegment, {
        [guestName.key]: "Episode guest",
      }),
    ).toEqual({
      [approved.key]: false,
      [guestName.key]: "Episode guest",
    });
  });

  test("8.T4 and 8.T5 distinguish missing required content from valid false values", () => {
    const { approved, episode, guestName, sourceSegment } =
      createContentFixture();
    const missing = createEpisodeSegment(
      {
        episode,
        fieldValues: { [approved.key]: false },
        position: 0,
        sourceSegment,
      },
      dependencies,
    );
    expect(calculateEpisodeSegmentReadiness(missing, sourceSegment)).toBe(
      "needs-content",
    );
    expect(
      validateEpisodeSegmentContent(missing, sourceSegment)[0],
    ).toMatchObject({
      code: "EPISODE_FIELD_REQUIRED",
      fieldKey: guestName.key,
      message:
        "The Interview Segment needs Guest name. Add it before rehearsal.",
    });

    const ready = {
      ...missing,
      fieldValues: { [approved.key]: false, [guestName.key]: "Ada" },
    };
    expect(calculateEpisodeSegmentReadiness(ready, sourceSegment)).toBe(
      "ready",
    );
  });

  test("8.T11 derives the first meaningful short-text summary deterministically", () => {
    const { approved, episode, guestName, sourceSegment } =
      createContentFixture();
    const segment = createEpisodeSegment(
      {
        episode,
        fieldValues: {
          [approved.key]: true,
          [guestName.key]: "  <script>alert(1)</script>  ",
        },
        position: 0,
        sourceSegment,
      },
      dependencies,
    );

    expect(deriveEpisodeSegmentSummary(segment, sourceSegment)).toBe(
      "<script>alert(1)</script>",
    );
  });
});
