import type { DomainEntity } from "../entities/core.mjs";
import type { EntityIdKind, Uuid } from "../identity/entity-id.mjs";
import type { BaseValidationSnapshot } from "./base-validation.mjs";
import {
  BASE_VALIDATION_ISSUE_CODES,
  type ValidationIssueCollector,
} from "./validation-support.mjs";

interface NamedEntityInput {
  readonly entity: DomainEntity<Uuid>;
  readonly entityType: EntityIdKind;
  readonly entityLabel: string;
  readonly fieldPath: string;
  readonly value: string;
}

const collectNamedEntities = (
  snapshot: BaseValidationSnapshot,
): readonly NamedEntityInput[] => [
  ...snapshot.studios.map((entity) => ({
    entity,
    entityType: "studio" as const,
    entityLabel: "Studio",
    fieldPath: "name",
    value: entity.name,
  })),
  ...snapshot.shows.map((entity) => ({
    entity,
    entityType: "show" as const,
    entityLabel: "Show",
    fieldPath: "name",
    value: entity.name,
  })),
  ...snapshot.segments.map((entity) => ({
    entity,
    entityType: "showSegment" as const,
    entityLabel: "Segment",
    fieldPath: "name",
    value: entity.name,
  })),
  ...snapshot.layouts.map((entity) => ({
    entity,
    entityType: "layout" as const,
    entityLabel: "Layout",
    fieldPath: "name",
    value: entity.name,
  })),
  ...snapshot.components.map((entity) => ({
    entity,
    entityType: "component" as const,
    entityLabel: "Component",
    fieldPath: "name",
    value: entity.name,
  })),
  ...snapshot.resources.map((entity) => ({
    entity,
    entityType: "resource" as const,
    entityLabel: "Resource",
    fieldPath: "displayName",
    value: entity.displayName,
  })),
  ...snapshot.episodes.map((entity) => ({
    entity,
    entityType: "episode" as const,
    entityLabel: "Episode",
    fieldPath: "title",
    value: entity.title,
  })),
  ...snapshot.segments.flatMap((segment) => [
    ...segment.dataFields.map((entity) => ({
      entity,
      entityType: "segmentDataField" as const,
      entityLabel: "Segment field",
      fieldPath: "label",
      value: entity.label,
    })),
    ...segment.hostCues.map((entity) => ({
      entity,
      entityType: "hostCue" as const,
      entityLabel: "Host Cue",
      fieldPath: "name",
      value: entity.name,
    })),
  ]),
  ...snapshot.layouts.flatMap((layout) =>
    layout.slots.map((entity) => ({
      entity,
      entityType: "slot" as const,
      entityLabel: "Slot",
      fieldPath: "name",
      value: entity.name,
    })),
  ),
];

export const validateEntityNames = (
  snapshot: BaseValidationSnapshot,
  issues: ValidationIssueCollector,
): void => {
  for (const input of collectNamedEntities(snapshot)) {
    if (input.value.trim().length > 0) {
      continue;
    }

    issues.add({
      code: BASE_VALIDATION_ISSUE_CODES.invalidName,
      message: `${input.entityLabel} needs a name before production can continue.`,
      entityType: input.entityType,
      entityId: input.entity.id,
      fieldPath: input.fieldPath,
      suggestedAction: `Enter a clear ${input.entityLabel.toLowerCase()} name.`,
    });
  }
};
