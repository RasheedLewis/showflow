import { defineSegmentLifecycle } from "../entities/lifecycle.mjs";
import type { ShowSegment } from "../entities/segment.mjs";
import type { ShowSegmentId } from "../identity/entity-id.mjs";
import {
  BASE_VALIDATION_ISSUE_CODES,
  labelOf,
  reportInvalidOwnership,
  type ReferenceOwner,
  type ValidationIssueCollector,
} from "./validation-support.mjs";

export const validateLifecycleShapes = (
  segments: readonly ShowSegment[],
  issues: ValidationIssueCollector,
): ReadonlySet<ShowSegmentId> => {
  const validSegmentIds = new Set<ShowSegmentId>();

  for (const segment of segments) {
    const owner: ReferenceOwner = {
      entityType: "showSegment",
      entityId: segment.id,
      label: labelOf("Segment", segment.name),
      fieldPath: "lifecycle",
    };

    if (segment.lifecycle.showSegmentId !== segment.id) {
      reportInvalidOwnership(
        owner,
        `${owner.label} has lifecycle settings from another Segment.`,
        "Reset this Segment's lifecycle settings.",
        issues,
      );
    }

    try {
      defineSegmentLifecycle(segment.lifecycle);
      validSegmentIds.add(segment.id);
    } catch {
      issues.add({
        code: BASE_VALIDATION_ISSUE_CODES.invalidLifecycle,
        message: `${owner.label} does not have the required Prepare, Enter, Active, Exit, and Cleanup lifecycle.`,
        entityType: owner.entityType,
        entityId: owner.entityId,
        fieldPath: owner.fieldPath,
        suggestedAction:
          "Reset the Segment lifecycle to the five standard phases.",
      });
    }
  }

  return validSegmentIds;
};
