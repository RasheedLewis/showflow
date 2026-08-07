import { z } from "zod";

import {
  SEGMENT_DATA_FIELD_TYPES,
  assertValidSegmentDataFieldDefault,
  defineSegmentLifecycle,
  parseEntityId,
  parseUtcTimestamp,
  validateShowSegmentDefinition,
  type ActiveSegmentConfiguration,
  type JsonValue,
  type LifecycleAction,
  type SegmentDataField,
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

const SegmentDataFieldRowSchema = z
  .object({
    createdAt: z.string(),
    defaultValueJson: z.string().nullable(),
    fieldType: z.enum(SEGMENT_DATA_FIELD_TYPES),
    helpText: z.string().nullable(),
    id: z.string(),
    isRequired: z.union([z.literal(0), z.literal(1)]),
    key: z.string().regex(/^[a-z][A-Za-z0-9]*$/u),
    label: z.string().trim().min(1).max(100),
    position: z.number().int().nonnegative(),
    showSegmentId: z.string(),
    updatedAt: z.string(),
  })
  .strict();

const LifecycleActionSchema = z.discriminatedUnion("kind", [
  z
    .object({ kind: z.literal("preloadResource"), resourceId: z.string() })
    .strict(),
  z
    .object({ kind: z.literal("activateLayout"), layoutId: z.string() })
    .strict(),
  z.object({ kind: z.literal("playSound"), resourceId: z.string() }).strict(),
  z.object({ kind: z.literal("startMedia"), resourceId: z.string() }).strict(),
  z.object({ kind: z.literal("stopMedia"), resourceId: z.string() }).strict(),
  z.object({ kind: z.literal("waitForAnimationCompletion") }).strict(),
  z
    .object({
      kind: z.literal("waitForMediaCompletion"),
      resourceId: z.string().optional(),
    })
    .strict(),
  z
    .object({ kind: z.literal("setActiveDefaults"), layoutId: z.string() })
    .strict(),
  z.object({ kind: z.literal("clearTemporaryState") }).strict(),
]);

const ActiveConfigurationSchema = z
  .object({
    availableLayoutIds: z.array(z.string()),
    defaultLayoutId: z.string().optional(),
    hostCueIds: z.array(z.string()),
  })
  .strict();

const SegmentLifecycleRowSchema = z
  .object({
    activeConfigurationJson: z.string(),
    cleanupActionsJson: z.string(),
    createdAt: z.string(),
    enterActionsJson: z.string(),
    exitActionsJson: z.string(),
    prepareActionsJson: z.string(),
    showSegmentId: z.string(),
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

const parseSegmentDataFieldRow = (value: unknown): SegmentDataField => {
  try {
    const row = SegmentDataFieldRowSchema.parse(value);
    const createdAt = parseUtcTimestamp(row.createdAt);
    const updatedAt = parseUtcTimestamp(row.updatedAt);
    if (updatedAt < createdAt)
      throw new RangeError("Invalid Segment field timestamps.");
    const defaultValue =
      row.defaultValueJson === null
        ? undefined
        : (JSON.parse(row.defaultValueJson) as JsonValue);
    assertValidSegmentDataFieldDefault(row.fieldType, defaultValue);
    return {
      id: parseEntityId<"segmentDataField">(row.id),
      showSegmentId: parseEntityId<"showSegment">(row.showSegmentId),
      key: row.key,
      label: row.label,
      type: row.fieldType,
      required: row.isRequired === 1,
      ...(defaultValue === undefined ? {} : { defaultValue }),
      ...(row.helpText === null ? {} : { helpText: row.helpText }),
      position: row.position,
      createdAt,
      updatedAt,
    };
  } catch (error) {
    throw new StoredShowError(error);
  }
};

const parseLifecycleAction = (
  value: z.infer<typeof LifecycleActionSchema>,
): LifecycleAction => {
  switch (value.kind) {
    case "activateLayout":
    case "setActiveDefaults":
      return {
        kind: value.kind,
        layoutId: parseEntityId<"layout">(value.layoutId),
      };
    case "preloadResource":
    case "playSound":
    case "startMedia":
    case "stopMedia":
      return {
        kind: value.kind,
        resourceId: parseEntityId<"resource">(value.resourceId),
      };
    case "waitForMediaCompletion":
      return value.resourceId === undefined
        ? { kind: value.kind }
        : {
            kind: value.kind,
            resourceId: parseEntityId<"resource">(value.resourceId),
          };
    case "waitForAnimationCompletion":
    case "clearTemporaryState":
      return { kind: value.kind };
  }
};

const parseActions = (json: string): readonly LifecycleAction[] =>
  z
    .array(LifecycleActionSchema)
    .parse(JSON.parse(json) as unknown)
    .map(parseLifecycleAction);

const parseActiveConfiguration = (json: string): ActiveSegmentConfiguration => {
  const value = ActiveConfigurationSchema.parse(JSON.parse(json) as unknown);
  return {
    availableLayoutIds: value.availableLayoutIds.map((id) =>
      parseEntityId<"layout">(id),
    ),
    hostCueIds: value.hostCueIds.map((id) => parseEntityId<"hostCue">(id)),
    ...(value.defaultLayoutId === undefined
      ? {}
      : { defaultLayoutId: parseEntityId<"layout">(value.defaultLayoutId) }),
  };
};

export const ShowSegmentRowParser = { parse: parseShowSegmentRow };
export const SegmentDataFieldRowParser = { parse: parseSegmentDataFieldRow };
export const SegmentLifecycleRowParser = {
  parse: (value: unknown) => SegmentLifecycleRowSchema.parse(value),
};

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

export const SEGMENT_DATA_FIELD_COLUMNS = `
  id,
  show_segment_id AS showSegmentId,
  field_key AS key,
  label,
  field_type AS fieldType,
  is_required AS isRequired,
  default_value_json AS defaultValueJson,
  help_text AS helpText,
  position,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

export const SEGMENT_LIFECYCLE_COLUMNS = `
  show_segment_id AS showSegmentId,
  prepare_actions_json AS prepareActionsJson,
  enter_actions_json AS enterActionsJson,
  active_configuration_json AS activeConfigurationJson,
  exit_actions_json AS exitActionsJson,
  cleanup_actions_json AS cleanupActionsJson,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

export const readShowSegmentDetails = (
  database: DatabaseExecutor,
  segment: ShowSegment,
): ShowSegment => {
  try {
    const dataFields = database.queryAll(
      `SELECT ${SEGMENT_DATA_FIELD_COLUMNS}
       FROM segment_data_fields
       WHERE show_segment_id = ?
       ORDER BY position, id`,
      SegmentDataFieldRowParser,
      [segment.id],
    );
    const lifecycleRow = database.queryRequired(
      `SELECT ${SEGMENT_LIFECYCLE_COLUMNS}
       FROM segment_lifecycle_configs
       WHERE show_segment_id = ?`,
      SegmentLifecycleRowParser,
      [segment.id],
    );
    const lifecycle = defineSegmentLifecycle({
      showSegmentId: segment.id,
      prepare: parseActions(lifecycleRow.prepareActionsJson),
      enter: parseActions(lifecycleRow.enterActionsJson),
      active: parseActiveConfiguration(lifecycleRow.activeConfigurationJson),
      exit: parseActions(lifecycleRow.exitActionsJson),
      cleanup: parseActions(lifecycleRow.cleanupActionsJson),
      createdAt: parseUtcTimestamp(lifecycleRow.createdAt),
      updatedAt: parseUtcTimestamp(lifecycleRow.updatedAt),
    });
    return {
      ...segment,
      dataFields,
      lifecycle,
      layoutIds: [
        ...new Set([
          ...lifecycle.active.availableLayoutIds,
          ...(lifecycle.active.defaultLayoutId === undefined
            ? []
            : [lifecycle.active.defaultLayoutId]),
        ]),
      ],
    };
  } catch (error) {
    throw error instanceof StoredShowError ? error : new StoredShowError(error);
  }
};

const writeSegmentDataField = (
  database: DatabaseExecutor,
  field: SegmentDataField,
): void => {
  const validField = parseSegmentDataFieldRow({
    createdAt: field.createdAt,
    defaultValueJson:
      field.defaultValue === undefined
        ? null
        : JSON.stringify(field.defaultValue),
    fieldType: field.type,
    helpText: field.helpText ?? null,
    id: field.id,
    isRequired: field.required ? 1 : 0,
    key: field.key,
    label: field.label,
    position: field.position,
    showSegmentId: field.showSegmentId,
    updatedAt: field.updatedAt,
  });
  database.run(
    `INSERT INTO segment_data_fields (
       id, show_segment_id, field_key, label, field_type, is_required,
       default_value_json, help_text, position, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      validField.id,
      validField.showSegmentId,
      validField.key,
      validField.label,
      validField.type,
      validField.required ? 1 : 0,
      validField.defaultValue === undefined
        ? null
        : JSON.stringify(validField.defaultValue),
      validField.helpText ?? null,
      validField.position,
      validField.createdAt,
      validField.updatedAt,
    ],
  );
};

export const writeShowSegment = (
  database: DatabaseExecutor,
  segment: ShowSegment,
): void => {
  const issues = validateShowSegmentDefinition(segment);
  if (issues.length > 0) {
    throw new StoredShowError(new RangeError(issues[0]?.message));
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
    `INSERT INTO show_segments (
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
       updated_at = excluded.updated_at`,
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
  database.run("DELETE FROM segment_data_fields WHERE show_segment_id = ?", [
    validSegment.id,
  ]);
  for (const field of segment.dataFields)
    writeSegmentDataField(database, field);
  database.run(
    `INSERT INTO segment_lifecycle_configs (
       show_segment_id, prepare_actions_json, enter_actions_json,
       active_configuration_json, exit_actions_json, cleanup_actions_json,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(show_segment_id) DO UPDATE SET
       prepare_actions_json = excluded.prepare_actions_json,
       enter_actions_json = excluded.enter_actions_json,
       active_configuration_json = excluded.active_configuration_json,
       exit_actions_json = excluded.exit_actions_json,
       cleanup_actions_json = excluded.cleanup_actions_json,
       updated_at = excluded.updated_at`,
    [
      segment.id,
      JSON.stringify(segment.lifecycle.prepare),
      JSON.stringify(segment.lifecycle.enter),
      JSON.stringify(segment.lifecycle.active),
      JSON.stringify(segment.lifecycle.exit),
      JSON.stringify(segment.lifecycle.cleanup),
      segment.lifecycle.createdAt,
      segment.lifecycle.updatedAt,
    ],
  );
};
