import type { BlueprintSegmentPlacement, ShowBlueprint } from "./blueprint.mjs";
import type { Component } from "./component.mjs";
import type { Episode, EpisodeSegment } from "./episode.mjs";
import type { Layout } from "./layout.mjs";
import type { ShowSegment } from "./segment.mjs";
import type { ShowId } from "../identity/entity-id.mjs";

export const DOMAIN_ERROR_CODES = ["INVALID_OWNERSHIP"] as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];

export const OWNERSHIP_RELATIONSHIPS = [
  "show.segment",
  "show.layout",
  "show.component",
  "show.episode",
  "blueprint.placement",
  "blueprint-placement.segment",
  "episode.segment",
  "episode-segment.source-segment",
] as const;

export type OwnershipRelationship = (typeof OWNERSHIP_RELATIONSHIPS)[number];

export class InvalidOwnershipError extends Error {
  override readonly name = "InvalidOwnershipError";
  readonly code: DomainErrorCode = "INVALID_OWNERSHIP";
  readonly relationship: OwnershipRelationship;

  constructor(relationship: OwnershipRelationship, message: string) {
    super(message);
    this.relationship = relationship;
  }
}

const assertSameShow = (
  relationship: OwnershipRelationship,
  expectedShowId: ShowId,
  actualShowId: ShowId,
  entityName: string,
): void => {
  if (actualShowId !== expectedShowId) {
    throw new InvalidOwnershipError(
      relationship,
      `${entityName} must belong to the expected Show.`,
    );
  }
};

export const assertShowSegmentOwnedByShow = (
  segment: ShowSegment,
  showId: ShowId,
): void => {
  assertSameShow("show.segment", showId, segment.showId, "Show Segment");
};

export const assertLayoutOwnedByShow = (
  layout: Layout,
  showId: ShowId,
): void => {
  assertSameShow("show.layout", showId, layout.showId, "Layout");
};

export const assertComponentOwnedByShow = (
  component: Component,
  showId: ShowId,
): void => {
  assertSameShow("show.component", showId, component.showId, "Component");
};

export const assertEpisodeOwnedByShow = (
  episode: Episode,
  showId: ShowId,
): void => {
  assertSameShow("show.episode", showId, episode.showId, "Episode");
};

interface BlueprintPlacementOwnership {
  readonly blueprint: ShowBlueprint;
  readonly placement: BlueprintSegmentPlacement;
  readonly segment: ShowSegment;
}

export const assertBlueprintPlacementOwnership = ({
  blueprint,
  placement,
  segment,
}: BlueprintPlacementOwnership): void => {
  if (placement.showBlueprintId !== blueprint.id) {
    throw new InvalidOwnershipError(
      "blueprint.placement",
      "Blueprint placement must belong to the expected Show Blueprint.",
    );
  }

  if (placement.showSegmentId !== segment.id) {
    throw new InvalidOwnershipError(
      "blueprint-placement.segment",
      "Blueprint placement must reference the supplied Show Segment.",
    );
  }

  assertShowSegmentOwnedByShow(segment, blueprint.showId);
};

interface EpisodeSegmentOwnership {
  readonly episode: Episode;
  readonly episodeSegment: EpisodeSegment;
  readonly sourceSegment: ShowSegment;
}

export const assertEpisodeSegmentOwnership = ({
  episode,
  episodeSegment,
  sourceSegment,
}: EpisodeSegmentOwnership): void => {
  if (episodeSegment.episodeId !== episode.id) {
    throw new InvalidOwnershipError(
      "episode.segment",
      "Episode Segment must belong to the expected Episode.",
    );
  }

  if (episodeSegment.sourceShowSegmentId !== sourceSegment.id) {
    throw new InvalidOwnershipError(
      "episode-segment.source-segment",
      "Episode Segment must reference the supplied source Show Segment.",
    );
  }

  assertShowSegmentOwnedByShow(sourceSegment, episode.showId);
};
