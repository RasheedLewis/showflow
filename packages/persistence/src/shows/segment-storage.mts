import { z } from "zod";

import {
  defineSegmentLifecycle,
  parseEntityId,
  parseUtcTimestamp,
  type ShowSegment,
} from "@showflow/domain";

import type { DatabaseExecutor } from "../database/database-service.mjs";
import { StoredShowError } from "./show-storage.mjs";

const ShowSegmentRowSchema = z
  .object({
    archivedAt: z.string().nullable(),
    createdAt: z.string(),
    description: z.string().nullable(),
    expectedDurationMs: z.number().int().nonnegative().nullable(),
    id: z.string(),
    name: z
      .string()
      .max(200)
      .refine((value) => value.trim().length > 0),
    notesTemplate: z.string(),
    showId: z.string(),
    updatedAt: z.string(),
  })
  .strict();

const parseShowSegmentRow = (value: unknown): ShowSegment => {
  try {
    const row = ShowSegmentRowSchema.parse(value);
    const id = parseEntityId<"showSegment">(row.id);
    const createdAt = parseUtcTimestamp(row.createdAt);
    const updatedAt = parseUtcTimestamp(row.updatedAt);
    const archivedAt =
      row.archivedAt === null ? null : parseUtcTimestamp(row.archivedAt);
    if (
      updatedAt < createdAt ||
      (archivedAt !== null && archivedAt < createdAt)
    ) {
      throw new RangeError("Invalid Show Segment timestamps.");
    }

    return {
      id,
      showId: parseEntityId<"show">(row.showId),
      name: row.name,
      ...(row.description === null ? {} : { description: row.description }),
      dataFields: [],
      lifecycle: defineSegmentLifecycle({
        showSegmentId: id,
        prepare: [],
        enter: [],
        active: { availableLayoutIds: [], hostCueIds: [] },
        exit: [],
        cleanup: [],
        createdAt,
        updatedAt,
      }),
      layoutIds: [],
      hostCues: [],
      ...(row.expectedDurationMs === null
        ? {}
        : { expectedDurationMs: row.expectedDurationMs }),
      notesTemplate: row.notesTemplate,
      ...(archivedAt === null ? {} : { archivedAt }),
      createdAt,
      updatedAt,
    };
  } catch (error) {
    throw new StoredShowError(error);
  }
};

export const ShowSegmentRowParser = { parse: parseShowSegmentRow };

export const SHOW_SEGMENT_COLUMNS = `
  id,
  show_id AS showId,
  name,
  description,
  expected_duration_ms AS expectedDurationMs,
  notes_template AS notesTemplate,
  archived_at AS archivedAt,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

export const writeShowSegment = (
  database: DatabaseExecutor,
  segment: ShowSegment,
): void => {
  if (
    segment.dataFields.length !== 0 ||
    segment.layoutIds.length !== 0 ||
    segment.hostCues.length !== 0 ||
    segment.lifecycle.prepare.length !== 0 ||
    segment.lifecycle.enter.length !== 0 ||
    segment.lifecycle.exit.length !== 0 ||
    segment.lifecycle.cleanup.length !== 0 ||
    segment.lifecycle.active.availableLayoutIds.length !== 0 ||
    segment.lifecycle.active.hostCueIds.length !== 0 ||
    segment.lifecycle.active.defaultLayoutId !== undefined
  ) {
    throw new StoredShowError(
      new RangeError("Detailed Segment behavior is introduced in Sprint 7."),
    );
  }

  const validSegment = parseShowSegmentRow({
    archivedAt: segment.archivedAt ?? null,
    createdAt: segment.createdAt,
    description: segment.description ?? null,
    expectedDurationMs: segment.expectedDurationMs ?? null,
    id: segment.id,
    name: segment.name,
    notesTemplate: segment.notesTemplate,
    showId: segment.showId,
    updatedAt: segment.updatedAt,
  });
  database.run(
    `
      INSERT INTO show_segments (
        id, show_id, name, description, expected_duration_ms, notes_template,
        archived_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        show_id = excluded.show_id,
        name = excluded.name,
        description = excluded.description,
        expected_duration_ms = excluded.expected_duration_ms,
        notes_template = excluded.notes_template,
        archived_at = excluded.archived_at,
        updated_at = excluded.updated_at
    `,
    [
      validSegment.id,
      validSegment.showId,
      validSegment.name,
      validSegment.description ?? null,
      validSegment.expectedDurationMs ?? null,
      validSegment.notesTemplate,
      validSegment.archivedAt ?? null,
      validSegment.createdAt,
      validSegment.updatedAt,
    ],
  );
};
