import { describe, expect, it, vi } from "vitest";

import {
  ApplicationError,
  type ShowSegmentEditor,
} from "@showflow/application";
import {
  createSegmentDataField,
  createEntityId,
  createShowSegment,
  parseEntityId,
  parseUtcTimestamp,
} from "@showflow/domain";

import {
  handleGetSegmentEditorRequest,
  handleUpdateSegmentDetailsRequest,
  type SegmentEditorOperations,
} from "./segment-editor-handler.mjs";

const studioId = parseEntityId<"studio">(
  "8d9df01f-2584-4b9a-ad13-a96d673918e9",
);
const showId = parseEntityId<"show">("514ad6df-710d-4301-9bff-b096e9db3dd4");
const timestamp = parseUtcTimestamp("2026-08-07T12:00:00.000Z");
const segment = createShowSegment(
  { showId, name: "Interview" },
  {
    clock: { now: () => new Date(timestamp) },
    createId: createEntityId,
  },
);
const field = createSegmentDataField(
  {
    label: "Guest name",
    position: 0,
    required: true,
    showSegmentId: segment.id,
    type: "shortText",
  },
  {
    clock: { now: () => new Date(timestamp) },
    createId: createEntityId,
  },
);
const editor = {
  episodeValueUsageByFieldId: { [field.id]: 0 },
  segment: { ...segment, dataFields: [field] },
  validationIssues: [],
} satisfies ShowSegmentEditor;

const operations = (
  overrides: Partial<SegmentEditorOperations> = {},
): SegmentEditorOperations => ({
  createField: { execute: vi.fn() },
  deleteField: { execute: vi.fn() },
  get: { execute: vi.fn().mockResolvedValue(editor) },
  reorderFields: { execute: vi.fn() },
  restoreField: { execute: vi.fn() },
  updateDetails: { execute: vi.fn().mockResolvedValue(editor.segment) },
  updateField: { execute: vi.fn() },
  ...overrides,
});

const request = {
  showId,
  showSegmentId: segment.id,
  studioId,
};

describe("Segment editor handlers", () => {
  it("returns the fixed lifecycle, stable field key, and Show-scope data", async () => {
    const result = await handleGetSegmentEditorRequest(
      request,
      true,
      operations(),
    );
    expect(result).toMatchObject({
      ok: true,
      data: {
        dataFields: [{ key: "guestName", required: true }],
        lifecycle: {
          prepare: [],
          enter: [],
          active: {},
          exit: [],
          cleanup: [],
        },
        name: "Interview",
      },
    });
  });

  it("rejects untrusted and malformed requests with structured errors", async () => {
    await expect(
      handleGetSegmentEditorRequest(request, false, operations()),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "IPC_UNTRUSTED_SENDER" },
    });
    await expect(
      handleGetSegmentEditorRequest({}, true, operations()),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "IPC_INVALID_REQUEST" },
    });
  });

  it("maps duration clearing and reloads the saved editor", async () => {
    const updateDetails = {
      execute: vi.fn().mockResolvedValue(editor.segment),
    };
    const result = await handleUpdateSegmentDetailsRequest(
      {
        ...request,
        expectedDurationMs: null,
        expectedUpdatedAt: timestamp,
        name: "Interview",
        notesTemplate: "Line one\nLine two",
      },
      true,
      operations({ updateDetails }),
    );
    expect(updateDetails.execute).toHaveBeenCalledWith({
      expectedUpdatedAt: timestamp,
      showId,
      showSegmentId: segment.id,
      name: "Interview",
      notesTemplate: "Line one\nLine two",
    });
    expect(result.ok).toBe(true);
  });

  it("preserves production-language stale-save copy", async () => {
    const result = await handleUpdateSegmentDetailsRequest(
      {
        ...request,
        expectedDurationMs: null,
        expectedUpdatedAt: timestamp,
        name: "Interview",
        notesTemplate: "",
      },
      true,
      operations({
        updateDetails: {
          execute: vi
            .fn()
            .mockRejectedValue(
              new ApplicationError(
                "CONFLICT",
                "This Segment changed while you were editing. Showflow kept the newer saved version; review it and try again.",
              ),
            ),
        },
      }),
    );
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "CONFLICT",
        message: expect.stringContaining("newer saved version"),
      },
    });
  });
});
