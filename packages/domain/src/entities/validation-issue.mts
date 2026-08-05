import type { DomainEntity } from "./core.mjs";
import type {
  EntityIdKind,
  Uuid,
  ValidationIssueId,
} from "../identity/entity-id.mjs";

export type ValidationSeverity = "blocking" | "warning";
export type ValidationTarget = "preview" | "rehearsal" | "futureBroadcast";

export interface ValidationIssue extends DomainEntity<ValidationIssueId> {
  readonly severity: ValidationSeverity;
  readonly code: string;
  readonly message: string;
  readonly entityType: EntityIdKind;
  readonly entityId: Uuid;
  readonly fieldPath?: string;
  readonly suggestedAction?: string;
  readonly blocks: readonly ValidationTarget[];
}
