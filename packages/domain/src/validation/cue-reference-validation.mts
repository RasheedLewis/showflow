import type { ShowSegment } from "../entities/segment.mjs";
import type { LayoutId } from "../identity/entity-id.mjs";
import type { ValidationLookup } from "./reference-validation.mjs";
import {
  labelOf,
  reportArchivedReference,
  reportInvalidOwnership,
  requireReference,
  type ReferenceOwner,
  type ValidationIssueCollector,
} from "./validation-support.mjs";

const validateCueLayout = (
  segment: ShowSegment,
  owner: ReferenceOwner,
  layoutId: LayoutId,
  lookup: ValidationLookup,
  issues: ValidationIssueCollector,
): void => {
  const layout = requireReference(
    lookup.layoutsById.get(layoutId),
    owner,
    "Layout",
    issues,
  );
  if (layout !== undefined && layout.showId !== segment.showId) {
    reportInvalidOwnership(
      owner,
      `${owner.label} targets a Layout from another Show.`,
      "Choose a Layout from this Show's Layout Catalog.",
      issues,
    );
  }
  if (layout?.archivedAt !== undefined) {
    reportArchivedReference(owner, "Layout", layout.name, issues);
  }
};

export const validateHostCueReferences = (
  segment: ShowSegment,
  lookup: ValidationLookup,
  issues: ValidationIssueCollector,
): void => {
  for (const cue of segment.hostCues) {
    const owner: ReferenceOwner = {
      entityType: "hostCue",
      entityId: cue.id,
      label: labelOf("Host Cue", cue.name),
      fieldPath: "actions",
    };

    for (const action of cue.actions) {
      if (action.kind === "activateLayout") {
        validateCueLayout(
          segment,
          { ...owner, fieldPath: "actions.layoutId" },
          action.layoutId,
          lookup,
          issues,
        );
      } else if (
        action.kind === "setComponentVisibility" ||
        action.kind === "resetTimer"
      ) {
        requireReference(
          lookup.componentPlacementsById.get(action.componentPlacementId),
          { ...owner, fieldPath: "actions.componentPlacementId" },
          "Component Placement",
          issues,
        );
      } else if (
        action.kind === "playSound" ||
        action.kind === "controlMedia"
      ) {
        requireReference(
          lookup.resourcesById.get(action.resourceId),
          { ...owner, fieldPath: "actions.resourceId" },
          "Resource",
          issues,
        );
      }
    }

    const completion = cue.completionBehavior;
    if (
      completion.kind === "runTargetExit" ||
      completion.kind === "hideTarget"
    ) {
      requireReference(
        lookup.componentPlacementsById.get(completion.componentPlacementId),
        { ...owner, fieldPath: "completionBehavior.componentPlacementId" },
        "Component Placement",
        issues,
      );
    } else if (completion.kind === "stopMedia") {
      requireReference(
        lookup.resourcesById.get(completion.resourceId),
        { ...owner, fieldPath: "completionBehavior.resourceId" },
        "Resource",
        issues,
      );
    }
  }
};
