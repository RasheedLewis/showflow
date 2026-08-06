import type { DomainEntity } from "../entities/core.mjs";
import type { EntityIdKind, Uuid } from "../identity/entity-id.mjs";
import type { BaseValidationSnapshot } from "./base-validation.mjs";
import {
  BASE_VALIDATION_ISSUE_CODES,
  labelOf,
  type ValidationIssueCollector,
} from "./validation-support.mjs";

const validateUniquePositions = <
  TChild extends DomainEntity<Uuid> & { readonly position: number },
>(
  children: readonly TChild[],
  owner: DomainEntity<Uuid>,
  ownerType: EntityIdKind,
  ownerLabel: string,
  fieldPath: string,
  issues: ValidationIssueCollector,
): void => {
  const positions = children.map((child) => child.position);
  if (new Set(positions).size === positions.length) {
    return;
  }

  issues.add({
    code: BASE_VALIDATION_ISSUE_CODES.duplicateOrder,
    message: `${ownerLabel} has more than one item in the same order position.`,
    entityType: ownerType,
    entityId: owner.id,
    fieldPath,
    suggestedAction: "Reorder the items so each position is used once.",
  });
};

export const validateOrderingUniqueness = (
  snapshot: BaseValidationSnapshot,
  issues: ValidationIssueCollector,
): void => {
  for (const blueprint of snapshot.blueprints) {
    validateUniquePositions(
      blueprint.placements,
      blueprint,
      "showBlueprint",
      "Show Blueprint",
      "placements.position",
      issues,
    );
  }

  for (const segment of snapshot.segments) {
    validateUniquePositions(
      segment.dataFields,
      segment,
      "showSegment",
      labelOf("Segment", segment.name),
      "dataFields.position",
      issues,
    );
  }

  for (const episode of snapshot.episodes) {
    validateUniquePositions(
      episode.segments,
      episode,
      "episode",
      labelOf("Episode", episode.title),
      "segments.position",
      issues,
    );
  }

  for (const layout of snapshot.layouts) {
    const layerOrders = layout.slots.map((slot) => slot.layerOrder);
    if (new Set(layerOrders).size === layerOrders.length) {
      continue;
    }

    issues.add({
      code: BASE_VALIDATION_ISSUE_CODES.duplicateOrder,
      message: `${labelOf("Layout", layout.name)} has more than one Slot in the same layer order.`,
      entityType: "layout",
      entityId: layout.id,
      fieldPath: "slots.layerOrder",
      suggestedAction: "Give each Slot a unique layer order.",
    });
  }
};
