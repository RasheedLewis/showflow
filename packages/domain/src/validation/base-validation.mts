import type { ShowBlueprint } from "../entities/blueprint.mjs";
import type { Component } from "../entities/component.mjs";
import { createEntityMetadata } from "../entities/entity-metadata.mjs";
import type { Episode } from "../entities/episode.mjs";
import type { DomainFactoryDependencies } from "../entities/factories.mjs";
import type { Layout } from "../entities/layout.mjs";
import type { Resource } from "../entities/resource.mjs";
import type { ShowSegment } from "../entities/segment.mjs";
import type { Show, Studio } from "../entities/studio.mjs";
import type {
  ValidationIssue,
  ValidationTarget,
} from "../entities/validation-issue.mjs";
import { createEntityId } from "../identity/entity-id.mjs";
import type { EntityId, EntityIdKind } from "../identity/entity-id.mjs";
import { SYSTEM_CLOCK } from "../time/clock.mjs";
import { validateLifecycleShapes } from "./lifecycle-validation.mjs";
import { validateEntityNames } from "./name-validation.mjs";
import { validateOrderingUniqueness } from "./ordering-validation.mjs";
import {
  createValidationLookup,
  validateOwnershipAndReferences,
} from "./reference-validation.mjs";
import type {
  ValidationIssueCollector,
  ValidationIssueInput,
} from "./validation-support.mjs";

export { BASE_VALIDATION_ISSUE_CODES } from "./validation-support.mjs";
export type { BaseValidationIssueCode } from "./validation-support.mjs";

export interface BaseValidationSnapshot {
  readonly studios: readonly Studio[];
  readonly shows: readonly Show[];
  readonly blueprints: readonly ShowBlueprint[];
  readonly segments: readonly ShowSegment[];
  readonly layouts: readonly Layout[];
  readonly components: readonly Component[];
  readonly resources: readonly Resource[];
  readonly episodes: readonly Episode[];
}

const ALL_VALIDATION_TARGETS: readonly ValidationTarget[] = Object.freeze([
  "preview",
  "rehearsal",
  "futureBroadcast",
]);

const DEFAULT_VALIDATION_DEPENDENCIES: DomainFactoryDependencies =
  Object.freeze({
    clock: SYSTEM_CLOCK,
    createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
      createEntityId<TEntity>(),
  });

class DomainValidationIssueCollector implements ValidationIssueCollector {
  readonly #dependencies: DomainFactoryDependencies;
  readonly #issues: ValidationIssue[] = [];

  constructor(dependencies: DomainFactoryDependencies) {
    this.#dependencies = dependencies;
  }

  add(input: ValidationIssueInput): void {
    this.#issues.push({
      id: this.#dependencies.createId("validationIssue"),
      severity: "blocking",
      code: input.code,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
      ...(input.fieldPath === undefined ? {} : { fieldPath: input.fieldPath }),
      suggestedAction: input.suggestedAction,
      blocks: [...ALL_VALIDATION_TARGETS],
      ...createEntityMetadata(this.#dependencies.clock),
    });
  }

  toArray(): readonly ValidationIssue[] {
    return [...this.#issues];
  }
}

export class BaseValidationService {
  readonly #dependencies: DomainFactoryDependencies;

  constructor(
    dependencies: DomainFactoryDependencies = DEFAULT_VALIDATION_DEPENDENCIES,
  ) {
    this.#dependencies = dependencies;
  }

  validate(snapshot: BaseValidationSnapshot): readonly ValidationIssue[] {
    const issues = new DomainValidationIssueCollector(this.#dependencies);
    const lookup = createValidationLookup(snapshot);

    validateEntityNames(snapshot, issues);
    validateOrderingUniqueness(snapshot, issues);
    const validLifecycleSegmentIds = validateLifecycleShapes(
      snapshot.segments,
      issues,
    );
    validateOwnershipAndReferences(
      snapshot,
      lookup,
      validLifecycleSegmentIds,
      issues,
    );

    return issues.toArray();
  }
}
