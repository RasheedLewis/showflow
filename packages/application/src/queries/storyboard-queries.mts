import {
  assertBlueprintPlacementOwnership,
  assertEpisodeSegmentOwnership,
  calculateEpisodeSegmentReadinessFromIssues,
  deriveEpisodeSegmentSummary,
  validateEpisodeSegmentContent,
  parseEntityId,
  validateResolvedComponentPlacement,
  assertComponentSlotCompatibility,
} from "@showflow/domain";
import type {
  BlueprintSegmentPlacement,
  Episode,
  EpisodeId,
  EpisodeSegment,
  EpisodeSegmentContentIssue,
  EpisodeSegmentReadiness,
  Show,
  ShowBlueprint,
  ShowId,
  ShowSegment,
  StudioId,
  Resource,
  Component,
} from "@showflow/domain";

import { loadEntitiesById, requireQueryEntity } from "./query-support.mjs";
import type {
  EpisodeRepository,
  ShowBlueprintRepository,
  ShowRepository,
  ShowSegmentRepository,
  ResourceRepository,
  LayoutRepository,
  ComponentRepository,
} from "../repositories/repositories.mjs";
import { ApplicationError } from "../errors/application-error.mjs";

export interface BlueprintPlacementDetail {
  readonly placement: BlueprintSegmentPlacement;
  readonly segment: ShowSegment;
}

export interface BlueprintDetail {
  readonly blueprint: ShowBlueprint;
  readonly placements: readonly BlueprintPlacementDetail[];
}

type BlueprintRepositories = {
  readonly blueprints: ShowBlueprintRepository;
  readonly segments: ShowSegmentRepository;
};

export class GetBlueprintQuery {
  readonly #repositories: BlueprintRepositories;

  constructor(repositories: BlueprintRepositories) {
    this.#repositories = repositories;
  }

  async execute(showId: ShowId): Promise<BlueprintDetail> {
    const blueprint = requireQueryEntity(
      await this.#repositories.blueprints.getByShowId(showId),
      "Show Blueprint",
    );
    const segmentsById = await loadEntitiesById(
      blueprint.placements.map((placement) => placement.showSegmentId),
      (showSegmentId) => this.#repositories.segments.getById(showSegmentId),
      "Show Segment",
    );
    const placements = blueprint.placements.map((placement) => {
      const segment = requireQueryEntity(
        segmentsById.get(placement.showSegmentId) ?? null,
        "Show Segment",
      );
      assertBlueprintPlacementOwnership({ blueprint, placement, segment });
      return { placement, segment };
    });

    return { blueprint, placements };
  }
}

export interface EpisodeStoryboardItem {
  readonly episodeSegment: EpisodeSegment;
  readonly readiness: EpisodeSegmentReadiness;
  readonly sourceSegment: ShowSegment;
  readonly summary?: string;
  readonly validationIssues: readonly EpisodeSegmentContentIssue[];
}

export interface EpisodeStoryboard {
  readonly episode: Episode;
  readonly show: Show;
  readonly items: readonly EpisodeStoryboardItem[];
}

export interface EpisodeProgress {
  readonly estimatedRuntimeMs: number;
  readonly needsContentCount: number;
  readonly readyCount: number;
  readonly segmentCount: number;
}

export const calculateEpisodeProgress = (
  items: readonly EpisodeStoryboardItem[],
): EpisodeProgress => {
  const readyCount = items.filter(
    ({ readiness }) => readiness === "ready",
  ).length;
  return {
    estimatedRuntimeMs: items.reduce(
      (total, { episodeSegment, sourceSegment }) =>
        total +
        (episodeSegment.expectedDurationOverrideMs ??
          sourceSegment.expectedDurationMs ??
          0),
      0,
    ),
    needsContentCount: items.filter(
      ({ readiness }) => readiness === "needs-content",
    ).length,
    readyCount,
    segmentCount: items.length,
  };
};

type EpisodeStoryboardRepositories = {
  readonly components?: ComponentRepository;
  readonly episodes: EpisodeRepository;
  readonly layouts?: LayoutRepository;
  readonly resources?: ResourceRepository;
  readonly shows: ShowRepository;
  readonly segments: ShowSegmentRepository;
};

const expectedResourceCategory = (
  type: string,
): Resource["category"] | undefined => {
  if (type === "imageResource") return "image";
  if (type === "videoResource") return "video";
  if (type === "audioResource") return "audio";
  return undefined;
};

const resourceIsVisible = (
  resource: Resource,
  episode: Episode,
  show: Show,
): boolean => {
  switch (resource.owner.scope) {
    case "studio":
      return resource.owner.studioId === show.studioId;
    case "show":
      return resource.owner.showId === show.id;
    case "episode":
      return resource.owner.episodeId === episode.id;
  }
};

export class GetEpisodeStoryboardQuery {
  readonly #repositories: EpisodeStoryboardRepositories;

  constructor(repositories: EpisodeStoryboardRepositories) {
    this.#repositories = repositories;
  }

  async execute(episodeId: EpisodeId): Promise<EpisodeStoryboard> {
    const episode = requireQueryEntity(
      await this.#repositories.episodes.getById(episodeId),
      "Episode",
    );
    const [show, sourceSegmentsById] = await Promise.all([
      this.#repositories.shows
        .getById(episode.showId)
        .then((storedShow) => requireQueryEntity(storedShow, "Show")),
      loadEntitiesById(
        episode.segments.map((segment) => segment.sourceShowSegmentId),
        (showSegmentId) => this.#repositories.segments.getById(showSegmentId),
        "Show Segment",
      ),
    ]);
    const items = await Promise.all(
      episode.segments.map(async (episodeSegment) => {
        const sourceSegment = requireQueryEntity(
          sourceSegmentsById.get(episodeSegment.sourceShowSegmentId) ?? null,
          "Show Segment",
        );
        assertEpisodeSegmentOwnership({
          episode,
          episodeSegment,
          sourceSegment,
        });
        const summary = deriveEpisodeSegmentSummary(
          episodeSegment,
          sourceSegment,
        );
        const validationIssues = [
          ...validateEpisodeSegmentContent(episodeSegment, sourceSegment),
        ];
        for (const field of sourceSegment.dataFields) {
          const expectedCategory = expectedResourceCategory(field.type);
          const value = episodeSegment.fieldValues[field.key];
          if (expectedCategory === undefined || typeof value !== "string")
            continue;
          if (this.#repositories.resources === undefined) continue;
          let resource: Resource | null;
          try {
            resource = await this.#repositories.resources.getById(
              parseEntityId<"resource">(value),
            );
          } catch {
            continue;
          }
          if (
            resource === null ||
            resource.availability === "missing" ||
            resource.availability === "unavailable"
          ) {
            validationIssues.push({
              code: "EPISODE_RESOURCE_MISSING",
              fieldKey: field.key,
              message: `The ${sourceSegment.name} Segment cannot find ${field.label}. Locate it or choose a replacement.`,
              severity: "blocking",
            });
          } else if (resource.availability === "unsupported") {
            validationIssues.push({
              code: "EPISODE_RESOURCE_UNSUPPORTED",
              fieldKey: field.key,
              message: `${field.label} in the ${sourceSegment.name} Segment cannot be played by Showflow. Replace it with a supported file.`,
              severity: "blocking",
            });
          } else if (resource.category !== expectedCategory) {
            validationIssues.push({
              code: "EPISODE_RESOURCE_WRONG_TYPE",
              fieldKey: field.key,
              message: `${field.label} in the ${sourceSegment.name} Segment needs a ${expectedCategory} Resource. Choose a compatible file.`,
              severity: "blocking",
            });
          } else if (!resourceIsVisible(resource, episode, show)) {
            validationIssues.push({
              code: "EPISODE_RESOURCE_OUT_OF_SCOPE",
              fieldKey: field.key,
              message: `${field.label} is not available to this Episode. Import it into this Episode or its Show.`,
              severity: "blocking",
            });
          }
        }
        const activeLayoutId =
          episodeSegment.defaultLayoutOverrideId ??
          sourceSegment.lifecycle.active.defaultLayoutId;
        if (
          activeLayoutId !== undefined &&
          this.#repositories.layouts !== undefined &&
          this.#repositories.components !== undefined
        ) {
          const layout =
            await this.#repositories.layouts.getById(activeLayoutId);
          if (layout === null || layout.showId !== show.id) {
            validationIssues.push({
              code: "LAYOUT_MISSING",
              fieldKey: "defaultLayout",
              message: `The ${sourceSegment.name} Segment cannot find its default Layout. Choose an available Layout.`,
              severity: "blocking",
            });
          } else {
            const components = new Map<string, Component>();
            const resourceIds = new Set<string>();
            for (const placement of layout.componentPlacements) {
              const component = await this.#repositories.components.getById(
                placement.componentId,
              );
              if (component !== null) components.set(component.id, component);
              for (const binding of Object.values(placement.bindings)) {
                if (binding.kind === "resource")
                  resourceIds.add(binding.resourceId);
              }
            }
            for (const replacement of episodeSegment.fixedResourceReplacements)
              resourceIds.add(replacement.resourceId);
            const resources: Resource[] =
              this.#repositories.resources === undefined
                ? []
                : (
                    await Promise.all(
                      [...resourceIds].map(async (id: string) =>
                        this.#repositories.resources?.getById(
                          parseEntityId<"resource">(id),
                        ),
                      ),
                    )
                  ).filter(
                    (resource): resource is Resource =>
                      resource !== null && resource !== undefined,
                  );
            for (const placement of layout.componentPlacements) {
              if (!placement.visibleByDefault) continue;
              const component = components.get(placement.componentId);
              const slot = layout.slots.find(
                ({ id }) => id === placement.slotId,
              );
              if (component === undefined || slot === undefined) {
                validationIssues.push({
                  code: "COMPONENT_PROPERTY_MISSING",
                  fieldKey: "placement",
                  message: `The ${layout.name} Layout has a Component Placement that is no longer available. Replace it before rehearsal.`,
                  severity: "blocking",
                });
                continue;
              }
              try {
                assertComponentSlotCompatibility(component, slot);
              } catch {
                validationIssues.push({
                  code: "COMPONENT_RESOURCE_INVALID",
                  fieldKey: "placement",
                  message: `The ${component.name} Component cannot be used in the ${slot.name} Slot. Choose a compatible Component.`,
                  severity: "blocking",
                });
                continue;
              }
              const replacements = Object.fromEntries(
                episodeSegment.fixedResourceReplacements
                  .filter(
                    ({ componentPlacementId }) =>
                      componentPlacementId === placement.id,
                  )
                  .map(({ propertyKey, resourceId }) => [
                    propertyKey,
                    resourceId,
                  ]),
              );
              for (const issue of validateResolvedComponentPlacement(
                component,
                placement,
                {
                  showMetadata: {
                    name: show.name,
                    description: show.description ?? "",
                  },
                  episodeMetadata: {
                    title: episode.title,
                    subtitle: episode.subtitle ?? "",
                    episodeNumber: episode.episodeNumber ?? 0,
                  },
                  segmentValues: episodeSegment.fieldValues,
                  segmentFields: sourceSegment.dataFields,
                  resources,
                  resourceReplacements: replacements,
                },
              )) {
                validationIssues.push({
                  code: issue.code.startsWith("CAMERA_")
                    ? "CAMERA_UNAVAILABLE"
                    : issue.code === "BINDING_SOURCE_MISSING"
                      ? "COMPONENT_PROPERTY_MISSING"
                      : "COMPONENT_RESOURCE_INVALID",
                  fieldKey: issue.propertyKey ?? "placement",
                  message: `${component.name} in the ${layout.name} Layout: ${issue.message}`,
                  severity: "blocking",
                });
              }
            }
          }
        }
        return {
          episodeSegment,
          readiness:
            calculateEpisodeSegmentReadinessFromIssues(validationIssues),
          sourceSegment,
          ...(summary === undefined ? {} : { summary }),
          validationIssues,
        };
      }),
    );

    return { episode, show, items };
  }
}

type EpisodeListRepositories = {
  readonly episodes: EpisodeRepository;
  readonly shows: ShowRepository;
};

export class ListEpisodesQuery {
  constructor(readonly repositories: EpisodeListRepositories) {}

  async execute(
    studioId: StudioId,
    showId: ShowId,
  ): Promise<readonly Episode[]> {
    const show = requireQueryEntity(
      await this.repositories.shows.getById(showId),
      "Show",
    );
    if (show.studioId !== studioId) {
      throw new ApplicationError("NOT_FOUND", "Show was not found.");
    }
    const episodes = await this.repositories.episodes.listByShowId(show.id);
    for (const episode of episodes) {
      if (episode.showId !== show.id) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "Episode belongs to another Show.",
        );
      }
    }
    return episodes;
  }
}
