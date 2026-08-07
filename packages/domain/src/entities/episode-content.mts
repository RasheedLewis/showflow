import type { EpisodeSegment } from "./episode.mjs";
import type { JsonObject, JsonValue } from "./core.mjs";
import type { SegmentDataField, ShowSegment } from "./segment.mjs";
import { isValidSegmentDataFieldDefault } from "./segment-schema.mjs";

export type EpisodeSegmentReadiness =
  "ready" | "needs-content" | "has-warnings" | "blocking-issue";

export type EpisodeSegmentContentIssueCode =
  | "EPISODE_FIELD_REQUIRED"
  | "EPISODE_FIELD_VALUE_INVALID"
  | "EPISODE_FIELD_UNKNOWN";

export interface EpisodeSegmentContentIssue {
  readonly code: EpisodeSegmentContentIssueCode;
  readonly fieldKey: string;
  readonly message: string;
  readonly severity: "blocking" | "warning";
}

const cloneJsonValue = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) return value.map(cloneJsonValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneJsonValue(entry)]),
    );
  }
  return value;
};

const hasOwn = (value: JsonObject, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

export const isEpisodeSegmentFieldValueMissing = (
  field: SegmentDataField,
  value: JsonValue | undefined,
): boolean => {
  if (value === undefined || value === null) return true;
  if (field.type === "shortText" || field.type === "longText") {
    return typeof value !== "string" || value.trim().length === 0;
  }
  return false;
};

export const assertValidEpisodeSegmentFieldValues = (
  sourceSegment: ShowSegment,
  fieldValues: JsonObject,
): void => {
  const fieldsByKey = new Map(
    sourceSegment.dataFields.map((field) => [field.key, field]),
  );
  for (const [key, value] of Object.entries(fieldValues)) {
    const field = fieldsByKey.get(key);
    if (field === undefined) {
      throw new TypeError(
        `Episode content uses the unknown ${key} Segment field.`,
      );
    }
    if (!isValidSegmentDataFieldDefault(field.type, value)) {
      throw new TypeError(
        `The ${field.label} value does not match its Segment field type.`,
      );
    }
  }
};

/**
 * Episode content starts with placement data, then Show field defaults. Missing
 * values remain absent so readiness can distinguish them from explicit false or
 * zero values.
 */
export const resolveInitialEpisodeSegmentFieldValues = (
  sourceSegment: ShowSegment,
  placementDefaultData: JsonObject = {},
): JsonObject => {
  const resolved: Record<string, JsonValue> = {};
  const knownKeys = new Set(sourceSegment.dataFields.map(({ key }) => key));
  for (const key of Object.keys(placementDefaultData)) {
    if (!knownKeys.has(key)) {
      throw new TypeError(
        `Blueprint content uses the unknown ${key} Segment field.`,
      );
    }
  }
  for (const field of [...sourceSegment.dataFields].sort(
    (left, right) => left.position - right.position,
  )) {
    const value = hasOwn(placementDefaultData, field.key)
      ? placementDefaultData[field.key]
      : field.defaultValue;
    if (value === undefined) continue;
    if (!isValidSegmentDataFieldDefault(field.type, value)) {
      throw new TypeError(
        `The ${field.label} default does not match its Segment field type.`,
      );
    }
    resolved[field.key] = cloneJsonValue(value);
  }
  return resolved;
};

export const validateEpisodeSegmentContent = (
  episodeSegment: EpisodeSegment,
  sourceSegment: ShowSegment,
): readonly EpisodeSegmentContentIssue[] => {
  const issues: EpisodeSegmentContentIssue[] = [];
  const fieldsByKey = new Map(
    sourceSegment.dataFields.map((field) => [field.key, field]),
  );

  for (const field of [...sourceSegment.dataFields].sort(
    (left, right) => left.position - right.position,
  )) {
    const value = episodeSegment.fieldValues[field.key];
    if (field.required && isEpisodeSegmentFieldValueMissing(field, value)) {
      issues.push({
        code: "EPISODE_FIELD_REQUIRED",
        fieldKey: field.key,
        message: `The ${sourceSegment.name} Segment needs ${field.label}. Add it before rehearsal.`,
        severity: "blocking",
      });
      continue;
    }
    if (
      value !== undefined &&
      !isValidSegmentDataFieldDefault(field.type, value)
    ) {
      issues.push({
        code: "EPISODE_FIELD_VALUE_INVALID",
        fieldKey: field.key,
        message: `The ${field.label} content in the ${sourceSegment.name} Segment does not match the expected field type. Replace it to continue.`,
        severity: "blocking",
      });
    }
  }

  for (const key of Object.keys(episodeSegment.fieldValues).sort()) {
    if (!fieldsByKey.has(key)) {
      issues.push({
        code: "EPISODE_FIELD_UNKNOWN",
        fieldKey: key,
        message: `The ${sourceSegment.name} Segment contains content for a field that is no longer part of the Show Segment. Reset the Episode content.`,
        severity: "warning",
      });
    }
  }
  return issues;
};

export const calculateEpisodeSegmentReadiness = (
  episodeSegment: EpisodeSegment,
  sourceSegment: ShowSegment,
): EpisodeSegmentReadiness => {
  const issues = validateEpisodeSegmentContent(episodeSegment, sourceSegment);
  if (issues.some(({ code }) => code === "EPISODE_FIELD_REQUIRED")) {
    return "needs-content";
  }
  if (
    issues.some(
      ({ severity, code }) =>
        severity === "blocking" && code !== "EPISODE_FIELD_REQUIRED",
    )
  ) {
    return "blocking-issue";
  }
  return issues.length > 0 ? "has-warnings" : "ready";
};

export const deriveEpisodeSegmentSummary = (
  episodeSegment: EpisodeSegment,
  sourceSegment: ShowSegment,
): string | undefined => {
  for (const field of [...sourceSegment.dataFields].sort(
    (left, right) => left.position - right.position,
  )) {
    if (field.type !== "shortText") continue;
    const value = episodeSegment.fieldValues[field.key];
    if (typeof value !== "string") continue;
    const summary = value.trim().replace(/\s+/gu, " ");
    if (summary.length > 0) return summary.slice(0, 160);
  }
  return undefined;
};
