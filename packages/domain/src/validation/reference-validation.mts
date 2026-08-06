import type { ComponentPlacement } from "../entities/component.mjs";
import type { Archivable, DomainEntity } from "../entities/core.mjs";
import type { ShowSegmentId, Uuid } from "../identity/entity-id.mjs";
import type { BaseValidationSnapshot } from "./base-validation.mjs";
import { validateHostCueReferences } from "./cue-reference-validation.mjs";
import {
  labelOf,
  reportArchivedReference,
  reportInvalidOwnership,
  requireReference,
  type ReferenceOwner,
  type ValidationIssueCollector,
} from "./validation-support.mjs";

export interface ValidationLookup {
  readonly studiosById: ReadonlyMap<
    Uuid,
    BaseValidationSnapshot["studios"][number]
  >;
  readonly showsById: ReadonlyMap<
    Uuid,
    BaseValidationSnapshot["shows"][number]
  >;
  readonly segmentsById: ReadonlyMap<
    Uuid,
    BaseValidationSnapshot["segments"][number]
  >;
  readonly layoutsById: ReadonlyMap<
    Uuid,
    BaseValidationSnapshot["layouts"][number]
  >;
  readonly componentsById: ReadonlyMap<
    Uuid,
    BaseValidationSnapshot["components"][number]
  >;
  readonly resourcesById: ReadonlyMap<
    Uuid,
    BaseValidationSnapshot["resources"][number]
  >;
  readonly episodesById: ReadonlyMap<
    Uuid,
    BaseValidationSnapshot["episodes"][number]
  >;
  readonly componentPlacementsById: ReadonlyMap<Uuid, ComponentPlacement>;
}

const toMap = <TEntity extends DomainEntity<Uuid>>(
  entities: readonly TEntity[],
): ReadonlyMap<Uuid, TEntity> =>
  new Map(entities.map((entity) => [entity.id, entity]));

export const createValidationLookup = (
  snapshot: BaseValidationSnapshot,
): ValidationLookup => {
  const componentPlacements = snapshot.layouts.flatMap(
    (layout) => layout.componentPlacements,
  );

  return {
    studiosById: toMap(snapshot.studios),
    showsById: toMap(snapshot.shows),
    segmentsById: toMap(snapshot.segments),
    layoutsById: toMap(snapshot.layouts),
    componentsById: toMap(snapshot.components),
    resourcesById: toMap(snapshot.resources),
    episodesById: toMap(snapshot.episodes),
    componentPlacementsById: toMap(componentPlacements),
  };
};

const isArchived = (entity: Archivable): boolean =>
  entity.archivedAt !== undefined;

const validateNestedOwner = (
  entity: DomainEntity<Uuid>,
  actualOwnerId: Uuid,
  expectedOwnerId: Uuid,
  owner: ReferenceOwner,
  issues: ValidationIssueCollector,
): void => {
  if (actualOwnerId !== expectedOwnerId) {
    reportInvalidOwnership(
      { ...owner, entityId: entity.id },
      `${owner.label} belongs to a different production object.`,
      `Remove ${owner.label} and add it again in the correct place.`,
      issues,
    );
  }
};

const validateBlueprints = (
  snapshot: BaseValidationSnapshot,
  lookup: ValidationLookup,
  issues: ValidationIssueCollector,
): void => {
  for (const blueprint of snapshot.blueprints) {
    requireReference(
      lookup.showsById.get(blueprint.showId),
      {
        entityType: "showBlueprint",
        entityId: blueprint.id,
        label: "Show Blueprint",
        fieldPath: "showId",
      },
      "Show",
      issues,
    );

    for (const placement of blueprint.placements) {
      const owner: ReferenceOwner = {
        entityType: "blueprintSegmentPlacement",
        entityId: placement.id,
        label: "Blueprint placement",
        fieldPath: "showSegmentId",
      };
      validateNestedOwner(
        placement,
        placement.showBlueprintId,
        blueprint.id,
        { ...owner, fieldPath: "showBlueprintId" },
        issues,
      );
      const segment = requireReference(
        lookup.segmentsById.get(placement.showSegmentId),
        owner,
        "Show Segment",
        issues,
      );

      if (segment !== undefined && segment.showId !== blueprint.showId) {
        reportInvalidOwnership(
          owner,
          "This Blueprint placement references a Segment from another Show.",
          "Choose a Segment from this Show's Catalog.",
          issues,
        );
      }
      if (segment !== undefined && isArchived(segment)) {
        reportArchivedReference(owner, "Segment", segment.name, issues);
      }
    }
  }
};

const validateSegmentLayoutReference = (
  segment: BaseValidationSnapshot["segments"][number],
  layoutId: Uuid,
  fieldPath: string,
  lookup: ValidationLookup,
  issues: ValidationIssueCollector,
): void => {
  const owner: ReferenceOwner = {
    entityType: "showSegment",
    entityId: segment.id,
    label: labelOf("Segment", segment.name),
    fieldPath,
  };
  const layout = requireReference(
    lookup.layoutsById.get(layoutId),
    owner,
    "Layout",
    issues,
  );
  if (layout !== undefined && layout.showId !== segment.showId) {
    reportInvalidOwnership(
      owner,
      `${owner.label} references a Layout from another Show.`,
      "Choose a Layout from this Show's Layout Catalog.",
      issues,
    );
  }
  if (layout !== undefined && isArchived(layout)) {
    reportArchivedReference(owner, "Layout", layout.name, issues);
  }
};

const validateSegmentRuntimeReferences = (
  segment: BaseValidationSnapshot["segments"][number],
  lookup: ValidationLookup,
  issues: ValidationIssueCollector,
): void => {
  const lifecycleActions = [
    ...segment.lifecycle.prepare,
    ...segment.lifecycle.enter,
    ...segment.lifecycle.exit,
    ...segment.lifecycle.cleanup,
  ];

  for (const action of lifecycleActions) {
    const fieldPath = `lifecycle.${action.kind}`;
    if (
      action.kind === "activateLayout" ||
      action.kind === "setActiveDefaults"
    ) {
      validateSegmentLayoutReference(
        segment,
        action.layoutId,
        fieldPath,
        lookup,
        issues,
      );
    } else if (
      action.kind === "preloadResource" ||
      action.kind === "playSound" ||
      action.kind === "startMedia" ||
      action.kind === "stopMedia"
    ) {
      requireReference(
        lookup.resourcesById.get(action.resourceId),
        {
          entityType: "showSegment",
          entityId: segment.id,
          label: labelOf("Segment", segment.name),
          fieldPath,
        },
        "Resource",
        issues,
      );
    } else if (
      action.kind === "waitForMediaCompletion" &&
      action.resourceId !== undefined
    ) {
      requireReference(
        lookup.resourcesById.get(action.resourceId),
        {
          entityType: "showSegment",
          entityId: segment.id,
          label: labelOf("Segment", segment.name),
          fieldPath,
        },
        "Resource",
        issues,
      );
    }
  }

  for (const hostCueId of segment.lifecycle.active.hostCueIds) {
    requireReference(
      segment.hostCues.find((cue) => cue.id === hostCueId),
      {
        entityType: "showSegment",
        entityId: segment.id,
        label: labelOf("Segment", segment.name),
        fieldPath: "lifecycle.active.hostCueIds",
      },
      "Host Cue",
      issues,
    );
  }
};

const validateSegments = (
  snapshot: BaseValidationSnapshot,
  lookup: ValidationLookup,
  validLifecycleSegmentIds: ReadonlySet<ShowSegmentId>,
  issues: ValidationIssueCollector,
): void => {
  for (const segment of snapshot.segments) {
    requireReference(
      lookup.showsById.get(segment.showId),
      {
        entityType: "showSegment",
        entityId: segment.id,
        label: labelOf("Segment", segment.name),
        fieldPath: "showId",
      },
      "Show",
      issues,
    );

    for (const field of segment.dataFields) {
      validateNestedOwner(
        field,
        field.showSegmentId,
        segment.id,
        {
          entityType: "segmentDataField",
          entityId: field.id,
          label: "Segment field",
          fieldPath: "showSegmentId",
        },
        issues,
      );
    }
    for (const cue of segment.hostCues) {
      validateNestedOwner(
        cue,
        cue.showSegmentId,
        segment.id,
        {
          entityType: "hostCue",
          entityId: cue.id,
          label: labelOf("Host Cue", cue.name),
          fieldPath: "showSegmentId",
        },
        issues,
      );
    }

    if (!validLifecycleSegmentIds.has(segment.id)) {
      continue;
    }

    const layoutIds = new Set([
      ...segment.layoutIds,
      ...segment.lifecycle.active.availableLayoutIds,
      ...(segment.lifecycle.active.defaultLayoutId === undefined
        ? []
        : [segment.lifecycle.active.defaultLayoutId]),
    ]);
    for (const layoutId of layoutIds) {
      validateSegmentLayoutReference(
        segment,
        layoutId,
        "layoutIds",
        lookup,
        issues,
      );
    }
    validateSegmentRuntimeReferences(segment, lookup, issues);
    validateHostCueReferences(segment, lookup, issues);
  }
};

const validateComponentPlacement = (
  layout: BaseValidationSnapshot["layouts"][number],
  placement: ComponentPlacement,
  lookup: ValidationLookup,
  issues: ValidationIssueCollector,
): void => {
  const owner: ReferenceOwner = {
    entityType: "componentPlacement",
    entityId: placement.id,
    label: "Component Placement",
    fieldPath: "componentId",
  };
  validateNestedOwner(
    placement,
    placement.layoutId,
    layout.id,
    { ...owner, fieldPath: "layoutId" },
    issues,
  );
  requireReference(
    layout.slots.find((slot) => slot.id === placement.slotId),
    { ...owner, fieldPath: "slotId" },
    "Slot",
    issues,
  );
  const component = requireReference(
    lookup.componentsById.get(placement.componentId),
    owner,
    "Component",
    issues,
  );
  if (component !== undefined && component.showId !== layout.showId) {
    reportInvalidOwnership(
      owner,
      "This Component Placement uses a Component from another Show.",
      "Choose a Component from this Show's Component Catalog.",
      issues,
    );
  }
  if (component !== undefined && isArchived(component)) {
    reportArchivedReference(owner, "Component", component.name, issues);
  }
  for (const [propertyKey, binding] of Object.entries(placement.bindings)) {
    if (binding.kind === "resource") {
      requireReference(
        lookup.resourcesById.get(binding.resourceId),
        { ...owner, fieldPath: `bindings.${propertyKey}.resourceId` },
        "Resource",
        issues,
      );
    }
  }
};

const validateLayoutsAndComponents = (
  snapshot: BaseValidationSnapshot,
  lookup: ValidationLookup,
  issues: ValidationIssueCollector,
): void => {
  for (const layout of snapshot.layouts) {
    requireReference(
      lookup.showsById.get(layout.showId),
      {
        entityType: "layout",
        entityId: layout.id,
        label: labelOf("Layout", layout.name),
        fieldPath: "showId",
      },
      "Show",
      issues,
    );
    for (const slot of layout.slots) {
      validateNestedOwner(
        slot,
        slot.layoutId,
        layout.id,
        {
          entityType: "slot",
          entityId: slot.id,
          label: labelOf("Slot", slot.name),
          fieldPath: "layoutId",
        },
        issues,
      );
    }
    for (const placement of layout.componentPlacements) {
      validateComponentPlacement(layout, placement, lookup, issues);
    }
  }
  for (const component of snapshot.components) {
    requireReference(
      lookup.showsById.get(component.showId),
      {
        entityType: "component",
        entityId: component.id,
        label: labelOf("Component", component.name),
        fieldPath: "showId",
      },
      "Show",
      issues,
    );
  }
};

const validateEpisodes = (
  snapshot: BaseValidationSnapshot,
  lookup: ValidationLookup,
  issues: ValidationIssueCollector,
): void => {
  for (const episode of snapshot.episodes) {
    requireReference(
      lookup.showsById.get(episode.showId),
      {
        entityType: "episode",
        entityId: episode.id,
        label: labelOf("Episode", episode.title),
        fieldPath: "showId",
      },
      "Show",
      issues,
    );
    for (const episodeSegment of episode.segments) {
      const owner: ReferenceOwner = {
        entityType: "episodeSegment",
        entityId: episodeSegment.id,
        label: "Episode Segment",
        fieldPath: "sourceShowSegmentId",
      };
      validateNestedOwner(
        episodeSegment,
        episodeSegment.episodeId,
        episode.id,
        { ...owner, fieldPath: "episodeId" },
        issues,
      );
      const source = requireReference(
        lookup.segmentsById.get(episodeSegment.sourceShowSegmentId),
        owner,
        "source Show Segment",
        issues,
      );
      if (source !== undefined && source.showId !== episode.showId) {
        reportInvalidOwnership(
          owner,
          "This Episode Segment references a Segment from another Show.",
          "Choose a Segment from this Show's Catalog.",
          issues,
        );
      }
      if (episodeSegment.defaultLayoutOverrideId !== undefined) {
        requireReference(
          lookup.layoutsById.get(episodeSegment.defaultLayoutOverrideId),
          { ...owner, fieldPath: "defaultLayoutOverrideId" },
          "Layout",
          issues,
        );
      }
      for (const replacement of episodeSegment.fixedResourceReplacements) {
        requireReference(
          lookup.componentPlacementsById.get(replacement.componentPlacementId),
          {
            ...owner,
            fieldPath: "fixedResourceReplacements.componentPlacementId",
          },
          "Component Placement",
          issues,
        );
        requireReference(
          lookup.resourcesById.get(replacement.resourceId),
          {
            ...owner,
            fieldPath: "fixedResourceReplacements.resourceId",
          },
          "Resource",
          issues,
        );
      }
    }
  }
};

export const validateOwnershipAndReferences = (
  snapshot: BaseValidationSnapshot,
  lookup: ValidationLookup,
  validLifecycleSegmentIds: ReadonlySet<ShowSegmentId>,
  issues: ValidationIssueCollector,
): void => {
  for (const show of snapshot.shows) {
    requireReference(
      lookup.studiosById.get(show.studioId),
      {
        entityType: "show",
        entityId: show.id,
        label: labelOf("Show", show.name),
        fieldPath: "studioId",
      },
      "Studio",
      issues,
    );
  }

  validateBlueprints(snapshot, lookup, issues);
  validateSegments(snapshot, lookup, validLifecycleSegmentIds, issues);
  validateLayoutsAndComponents(snapshot, lookup, issues);
  validateEpisodes(snapshot, lookup, issues);

  for (const resource of snapshot.resources) {
    const ownerEntity =
      resource.owner.scope === "studio"
        ? lookup.studiosById.get(resource.owner.studioId)
        : resource.owner.scope === "show"
          ? lookup.showsById.get(resource.owner.showId)
          : lookup.episodesById.get(resource.owner.episodeId);
    requireReference(
      ownerEntity,
      {
        entityType: "resource",
        entityId: resource.id,
        label: labelOf("Resource", resource.displayName),
        fieldPath: "owner",
      },
      `${resource.owner.scope} owner`,
      issues,
    );
  }
};
