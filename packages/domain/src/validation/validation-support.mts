import type { EntityIdKind, Uuid } from "../identity/entity-id.mjs";

export const BASE_VALIDATION_ISSUE_CODES = Object.freeze({
  archivedReference: "ARCHIVED_REFERENCE",
  duplicateOrder: "DUPLICATE_ORDER",
  invalidLifecycle: "INVALID_LIFECYCLE",
  invalidName: "INVALID_NAME",
  invalidOwnership: "INVALID_OWNERSHIP",
  missingReference: "MISSING_REFERENCE",
} as const);

export type BaseValidationIssueCode =
  (typeof BASE_VALIDATION_ISSUE_CODES)[keyof typeof BASE_VALIDATION_ISSUE_CODES];

export interface ValidationIssueInput {
  readonly code: BaseValidationIssueCode;
  readonly message: string;
  readonly entityType: EntityIdKind;
  readonly entityId: Uuid;
  readonly fieldPath?: string;
  readonly suggestedAction: string;
}

export interface ValidationIssueCollector {
  add(input: ValidationIssueInput): void;
}

export interface ReferenceOwner {
  readonly entityType: EntityIdKind;
  readonly entityId: Uuid;
  readonly label: string;
  readonly fieldPath: string;
}

export const labelOf = (entityLabel: string, name: string): string =>
  name.trim().length === 0 ? entityLabel : `${name} ${entityLabel}`;

export const requireReference = <TEntity,>(
  referencedEntity: TEntity | undefined,
  owner: ReferenceOwner,
  referencedLabel: string,
  issues: ValidationIssueCollector,
): TEntity | undefined => {
  if (referencedEntity !== undefined) {
    return referencedEntity;
  }

  issues.add({
    code: BASE_VALIDATION_ISSUE_CODES.missingReference,
    message: `${owner.label} cannot find its referenced ${referencedLabel}.`,
    entityType: owner.entityType,
    entityId: owner.entityId,
    fieldPath: owner.fieldPath,
    suggestedAction: `Choose an available ${referencedLabel} or remove this reference.`,
  });
  return undefined;
};

export const reportInvalidOwnership = (
  owner: ReferenceOwner,
  message: string,
  suggestedAction: string,
  issues: ValidationIssueCollector,
): void => {
  issues.add({
    code: BASE_VALIDATION_ISSUE_CODES.invalidOwnership,
    message,
    entityType: owner.entityType,
    entityId: owner.entityId,
    fieldPath: owner.fieldPath,
    suggestedAction,
  });
};

export const reportArchivedReference = (
  owner: ReferenceOwner,
  referencedLabel: string,
  referencedName: string,
  issues: ValidationIssueCollector,
): void => {
  issues.add({
    code: BASE_VALIDATION_ISSUE_CODES.archivedReference,
    message: `${owner.label} references the archived ${referencedLabel} ${referencedName}.`,
    entityType: owner.entityType,
    entityId: owner.entityId,
    fieldPath: owner.fieldPath,
    suggestedAction: `Restore the ${referencedLabel} or choose an available one.`,
  });
};
