import { z } from "zod";

import {
  parseEntityId,
  parseUtcTimestamp,
  type Episode,
  type EpisodeSegment,
  type JsonObject,
} from "@showflow/domain";

import type { DatabaseExecutor } from "../database/database-service.mjs";

export class StoredEpisodeError extends Error {
  override readonly name = "StoredEpisodeError";
  readonly code = "STORED_EPISODE_INVALID" as const;

  constructor(cause: unknown) {
    super("Stored Episode data is invalid.", { cause });
  }
}

const CanonicalTimestampSchema = z.string();
const JsonObjectSchema = z.record(z.string(), z.unknown());
const FixedResourceReplacementSchema = z
  .object({
    componentPlacementId: z.string(),
    propertyKey: z.string().min(1),
    resourceId: z.string(),
  })
  .strict();

const EpisodeRowSchema = z
  .object({
    createdAt: CanonicalTimestampSchema,
    description: z.string().nullable(),
    episodeNumber: z.number().int().nonnegative().nullable(),
    guestNamesJson: z.string(),
    id: z.string(),
    internalNotes: z.string(),
    plannedAt: z.string().nullable(),
    showId: z.string(),
    sponsorInformation: z.string().nullable(),
    status: z.enum(["draft", "ready"]),
    subtitle: z.string().nullable(),
    title: z
      .string()
      .max(200)
      .refine((value) => value.trim().length > 0),
    updatedAt: CanonicalTimestampSchema,
  })
  .strict();

const EpisodeSegmentRowSchema = z
  .object({
    createdAt: CanonicalTimestampSchema,
    defaultLayoutOverrideId: z.string().nullable(),
    episodeId: z.string(),
    expectedDurationOverrideMs: z.number().int().nonnegative().nullable(),
    fieldValuesJson: z.string(),
    fixedResourceReplacementsJson: z.string(),
    id: z.string(),
    label: z.string().nullable(),
    notes: z.string(),
    position: z.number().int().nonnegative(),
    sourceShowSegmentId: z.string(),
    updatedAt: CanonicalTimestampSchema,
  })
  .strict();

const parseEpisodeRow = (value: unknown): Episode => {
  try {
    const row = EpisodeRowSchema.parse(value);
    const createdAt = parseUtcTimestamp(row.createdAt);
    const updatedAt = parseUtcTimestamp(row.updatedAt);
    if (updatedAt < createdAt)
      throw new RangeError("Invalid Episode timestamps.");
    const guestNames = z
      .array(z.string())
      .parse(JSON.parse(row.guestNamesJson) as unknown);

    return {
      id: parseEntityId<"episode">(row.id),
      showId: parseEntityId<"show">(row.showId),
      title: row.title,
      ...(row.subtitle === null ? {} : { subtitle: row.subtitle }),
      ...(row.episodeNumber === null
        ? {}
        : { episodeNumber: row.episodeNumber }),
      ...(row.description === null ? {} : { description: row.description }),
      ...(row.plannedAt === null
        ? {}
        : { plannedAt: parseUtcTimestamp(row.plannedAt) }),
      status: row.status,
      guestNames,
      ...(row.sponsorInformation === null
        ? {}
        : { sponsorInformation: row.sponsorInformation }),
      internalNotes: row.internalNotes,
      segments: [],
      createdAt,
      updatedAt,
    };
  } catch (error) {
    throw new StoredEpisodeError(error);
  }
};

const parseEpisodeSegmentRow = (value: unknown): EpisodeSegment => {
  try {
    const row = EpisodeSegmentRowSchema.parse(value);
    const createdAt = parseUtcTimestamp(row.createdAt);
    const updatedAt = parseUtcTimestamp(row.updatedAt);
    if (updatedAt < createdAt) {
      throw new RangeError("Invalid Episode Segment timestamps.");
    }
    const fieldValues = JsonObjectSchema.parse(
      JSON.parse(row.fieldValuesJson) as unknown,
    ) as JsonObject;
    const replacements = z
      .array(FixedResourceReplacementSchema)
      .parse(JSON.parse(row.fixedResourceReplacementsJson) as unknown)
      .map((replacement) => ({
        componentPlacementId: parseEntityId<"componentPlacement">(
          replacement.componentPlacementId,
        ),
        propertyKey: replacement.propertyKey,
        resourceId: parseEntityId<"resource">(replacement.resourceId),
      }));

    return {
      id: parseEntityId<"episodeSegment">(row.id),
      episodeId: parseEntityId<"episode">(row.episodeId),
      sourceShowSegmentId: parseEntityId<"showSegment">(
        row.sourceShowSegmentId,
      ),
      position: row.position,
      ...(row.label === null ? {} : { label: row.label }),
      fieldValues,
      notes: row.notes,
      ...(row.expectedDurationOverrideMs === null
        ? {}
        : { expectedDurationOverrideMs: row.expectedDurationOverrideMs }),
      ...(row.defaultLayoutOverrideId === null
        ? {}
        : {
            defaultLayoutOverrideId: parseEntityId<"layout">(
              row.defaultLayoutOverrideId,
            ),
          }),
      fixedResourceReplacements: replacements,
      createdAt,
      updatedAt,
    };
  } catch (error) {
    throw new StoredEpisodeError(error);
  }
};

export const EpisodeRowParser = { parse: parseEpisodeRow };
export const EpisodeSegmentRowParser = { parse: parseEpisodeSegmentRow };

export const EPISODE_COLUMNS = `
  id,
  show_id AS showId,
  title,
  subtitle,
  episode_number AS episodeNumber,
  description,
  planned_at AS plannedAt,
  status,
  guest_names_json AS guestNamesJson,
  sponsor_information AS sponsorInformation,
  internal_notes AS internalNotes,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

export const EPISODE_SEGMENT_COLUMNS = `
  id,
  episode_id AS episodeId,
  source_show_segment_id AS sourceShowSegmentId,
  position,
  label,
  field_values_json AS fieldValuesJson,
  notes,
  expected_duration_override_ms AS expectedDurationOverrideMs,
  default_layout_override_id AS defaultLayoutOverrideId,
  fixed_resource_replacements_json AS fixedResourceReplacementsJson,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const writeEpisodeSegment = (
  database: DatabaseExecutor,
  segment: EpisodeSegment,
): void => {
  const validSegment = parseEpisodeSegmentRow({
    createdAt: segment.createdAt,
    defaultLayoutOverrideId: segment.defaultLayoutOverrideId ?? null,
    episodeId: segment.episodeId,
    expectedDurationOverrideMs: segment.expectedDurationOverrideMs ?? null,
    fieldValuesJson: JSON.stringify(segment.fieldValues),
    fixedResourceReplacementsJson: JSON.stringify(
      segment.fixedResourceReplacements,
    ),
    id: segment.id,
    label: segment.label ?? null,
    notes: segment.notes,
    position: segment.position,
    sourceShowSegmentId: segment.sourceShowSegmentId,
    updatedAt: segment.updatedAt,
  });
  database.run(
    `INSERT INTO episode_segments (
       id, episode_id, source_show_segment_id, position, label,
       field_values_json, notes, expected_duration_override_ms,
       default_layout_override_id, fixed_resource_replacements_json,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      validSegment.id,
      validSegment.episodeId,
      validSegment.sourceShowSegmentId,
      validSegment.position,
      validSegment.label ?? null,
      JSON.stringify(validSegment.fieldValues),
      validSegment.notes,
      validSegment.expectedDurationOverrideMs ?? null,
      validSegment.defaultLayoutOverrideId ?? null,
      JSON.stringify(validSegment.fixedResourceReplacements),
      validSegment.createdAt,
      validSegment.updatedAt,
    ],
  );
};

export const writeEpisode = (
  database: DatabaseExecutor,
  episode: Episode,
): void => {
  const validEpisode = parseEpisodeRow({
    createdAt: episode.createdAt,
    description: episode.description ?? null,
    episodeNumber: episode.episodeNumber ?? null,
    guestNamesJson: JSON.stringify(episode.guestNames),
    id: episode.id,
    internalNotes: episode.internalNotes,
    plannedAt: episode.plannedAt ?? null,
    showId: episode.showId,
    sponsorInformation: episode.sponsorInformation ?? null,
    status: episode.status,
    subtitle: episode.subtitle ?? null,
    title: episode.title,
    updatedAt: episode.updatedAt,
  });
  database.run(
    `INSERT INTO episodes (
       id, show_id, title, subtitle, episode_number, description, planned_at,
       status, guest_names_json, sponsor_information, internal_notes,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       show_id = excluded.show_id,
       title = excluded.title,
       subtitle = excluded.subtitle,
       episode_number = excluded.episode_number,
       description = excluded.description,
       planned_at = excluded.planned_at,
       status = excluded.status,
       guest_names_json = excluded.guest_names_json,
       sponsor_information = excluded.sponsor_information,
       internal_notes = excluded.internal_notes,
       updated_at = excluded.updated_at`,
    [
      validEpisode.id,
      validEpisode.showId,
      validEpisode.title,
      validEpisode.subtitle ?? null,
      validEpisode.episodeNumber ?? null,
      validEpisode.description ?? null,
      validEpisode.plannedAt ?? null,
      validEpisode.status,
      JSON.stringify(validEpisode.guestNames),
      validEpisode.sponsorInformation ?? null,
      validEpisode.internalNotes,
      validEpisode.createdAt,
      validEpisode.updatedAt,
    ],
  );
  database.run("DELETE FROM episode_segments WHERE episode_id = ?", [
    validEpisode.id,
  ]);
  for (const segment of [...episode.segments].sort(
    (left, right) => left.position - right.position,
  )) {
    if (segment.episodeId !== validEpisode.id) {
      throw new StoredEpisodeError(
        new RangeError("Episode Segment belongs to another Episode."),
      );
    }
    writeEpisodeSegment(database, segment);
  }
};
