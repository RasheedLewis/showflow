import type { JsonValue } from "./core.mjs";
import type {
  SegmentDataField,
  SegmentDataFieldType,
  ShowSegment,
} from "./segment.mjs";
import { parseEntityId } from "../identity/entity-id.mjs";
import type { SegmentDataFieldId } from "../identity/entity-id.mjs";

export const SEGMENT_FIELD_KEY_PATTERN = /^[a-z][A-Za-z0-9]*$/u;

export type SegmentDefinitionIssueCode =
  | "SEGMENT_NAME_REQUIRED"
  | "SEGMENT_FIELD_KEY_DUPLICATE"
  | "SEGMENT_FIELD_DEFAULT_INVALID"
  | "SEGMENT_DURATION_NEGATIVE";

export interface SegmentDefinitionIssue {
  readonly code: SegmentDefinitionIssueCode;
  readonly message: string;
  readonly fieldId?: SegmentDataFieldId;
}

export const normalizeSegmentDataFieldLabel = (label: string): string => {
  const normalized = label.trim().replace(/\s+/gu, " ");
  if (normalized.length === 0 || normalized.length > 100) {
    throw new TypeError(
      "Segment field label must contain between 1 and 100 characters.",
    );
  }
  return normalized;
};

const toKeyParts = (label: string): readonly string[] =>
  label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .match(/[A-Za-z0-9]+/gu) ?? [];

export const generateSegmentDataFieldKey = (
  label: string,
  existingKeys: readonly string[],
): string => {
  const parts = toKeyParts(normalizeSegmentDataFieldLabel(label));
  const [first, ...rest] = parts;
  const generated =
    first === undefined
      ? "field"
      : `${first.toLowerCase()}${rest
          .map(
            (part) =>
              `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`,
          )
          .join("")}`;
  const base = /^[a-z]/u.test(generated) ? generated : `field${generated}`;
  const keys = new Set(existingKeys);
  if (!keys.has(base)) return base;

  let suffix = 2;
  while (keys.has(`${base}${suffix}`)) suffix += 1;
  return `${base}${suffix}`;
};

export const isValidSegmentDataFieldDefault = (
  type: SegmentDataFieldType,
  value: JsonValue | undefined,
): boolean => {
  if (value === undefined) return true;
  switch (type) {
    case "shortText":
    case "longText":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "imageResource":
    case "videoResource":
    case "audioResource":
      if (typeof value !== "string") return false;
      try {
        parseEntityId<"resource">(value);
        return true;
      } catch {
        return false;
      }
  }
};

export const assertValidSegmentDataFieldDefault = (
  type: SegmentDataFieldType,
  value: JsonValue | undefined,
): void => {
  if (!isValidSegmentDataFieldDefault(type, value)) {
    throw new TypeError(
      `The default value does not match the ${type} Segment field type.`,
    );
  }
};

export function normalizeExpectedDurationMs(value: number): number;
export function normalizeExpectedDurationMs(value: undefined): undefined;
export function normalizeExpectedDurationMs(
  value: number | undefined,
): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      "Expected duration must be zero or a positive amount of time.",
    );
  }
  return Math.round(value);
}

export const reorderSegmentDataFields = (
  fields: readonly SegmentDataField[],
  orderedFieldIds: readonly SegmentDataFieldId[],
): readonly SegmentDataField[] => {
  if (
    orderedFieldIds.length !== fields.length ||
    new Set(orderedFieldIds).size !== orderedFieldIds.length
  ) {
    throw new TypeError("Segment field order must include each field once.");
  }
  const byId = new Map(fields.map((field) => [field.id, field]));
  return orderedFieldIds.map((id, position) => {
    const field = byId.get(id);
    if (field === undefined) {
      throw new TypeError("Segment field order contains an unknown field.");
    }
    return { ...field, position };
  });
};

export const validateShowSegmentDefinition = (
  segment: ShowSegment,
): readonly SegmentDefinitionIssue[] => {
  const issues: SegmentDefinitionIssue[] = [];
  if (segment.name.trim().length === 0 || segment.name.length > 200) {
    issues.push({
      code: "SEGMENT_NAME_REQUIRED",
      message: "Give this Segment a name before using it in production.",
    });
  }
  if (
    segment.expectedDurationMs !== undefined &&
    segment.expectedDurationMs < 0
  ) {
    issues.push({
      code: "SEGMENT_DURATION_NEGATIVE",
      message:
        "Expected duration cannot be negative. Enter zero or a positive time.",
    });
  }

  const seenKeys = new Set<string>();
  for (const field of segment.dataFields) {
    if (seenKeys.has(field.key)) {
      issues.push({
        code: "SEGMENT_FIELD_KEY_DUPLICATE",
        fieldId: field.id,
        message: `The ${field.label} field uses a key that another field already uses. Create it again with a unique label.`,
      });
    }
    seenKeys.add(field.key);
    if (!isValidSegmentDataFieldDefault(field.type, field.defaultValue)) {
      issues.push({
        code: "SEGMENT_FIELD_DEFAULT_INVALID",
        fieldId: field.id,
        message: `The ${field.label} field needs a default value that matches its field type.`,
      });
    }
  }
  return issues;
};
