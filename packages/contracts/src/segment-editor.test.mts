import { describe, expect, it } from "vitest";

import {
  ShowSegmentEditorDtoSchema,
  UpdateSegmentFieldRequestSchema,
} from "./segment-editor.ts";

const timestamp = "2026-08-07T12:00:00.000Z";
const id = "5ccbc04c-2890-46b5-b0f0-179ae15972d3";

describe("Segment editor contracts", () => {
  it("accepts the fixed five-phase lifecycle and ordered simple fields", () => {
    expect(
      ShowSegmentEditorDtoSchema.parse({
        archivedAt: null,
        createdAt: timestamp,
        dataFields: [
          {
            createdAt: timestamp,
            defaultValue: "Guest name",
            episodeValueUsageCount: 0,
            helpText: null,
            id,
            key: "guestName",
            label: "Guest name",
            position: 0,
            required: true,
            showSegmentId: id,
            type: "shortText",
            updatedAt: timestamp,
          },
        ],
        description: null,
        expectedDurationMs: 60_000,
        id,
        lifecycle: {
          active: {
            availableLayoutIds: [],
            defaultLayoutId: null,
            hostCueIds: [],
          },
          cleanup: [],
          enter: [],
          exit: [],
          prepare: [],
        },
        name: "Interview",
        notesTemplate: "Introduce the guest.\nAsk the first question.",
        showId: id,
        updatedAt: timestamp,
        validationIssues: [],
      }).dataFields[0]?.key,
    ).toBe("guestName");
  });

  it("rejects malformed mutation payloads at the preload boundary", () => {
    expect(() =>
      UpdateSegmentFieldRequestSchema.parse({
        defaultValue: 42,
        expectedUpdatedAt: "yesterday",
        fieldId: id,
        helpText: null,
        label: "Rank",
        required: true,
        showId: id,
        showSegmentId: id,
        studioId: id,
        type: "number",
      }),
    ).toThrow();
  });
});
