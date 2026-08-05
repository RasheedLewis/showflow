import type { JsonObject, PixelDimensions } from "./core.mjs";
import { createEntityMetadata } from "./entity-metadata.mjs";
import type { Episode, EpisodeSegment } from "./episode.mjs";
import type { CanvasAspectRatio } from "./composition.mjs";
import type { Layout } from "./layout.mjs";
import { defineSegmentLifecycle } from "./lifecycle.mjs";
import {
  assertLayoutOwnedByShow,
  assertShowSegmentOwnedByShow,
} from "./ownership.mjs";
import type { ShowSegment } from "./segment.mjs";
import type { Show, Studio } from "./studio.mjs";
import { createEntityId } from "../identity/entity-id.mjs";
import type {
  EntityId,
  EntityIdKind,
  ShowId,
  StudioId,
} from "../identity/entity-id.mjs";
import { SYSTEM_CLOCK } from "../time/clock.mjs";
import type { Clock, UtcTimestamp } from "../time/clock.mjs";

export interface DomainFactoryDependencies {
  readonly clock: Clock;
  readonly createId: <TEntity extends EntityIdKind>(
    entityKind: TEntity,
  ) => EntityId<TEntity>;
}

const DEFAULT_DOMAIN_FACTORY_DEPENDENCIES: DomainFactoryDependencies =
  Object.freeze({
    clock: SYSTEM_CLOCK,
    createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
      createEntityId<TEntity>(),
  });

const DEFAULT_LAYOUT_CANVAS: Readonly<
  Record<CanvasAspectRatio, PixelDimensions>
> = Object.freeze({
  "16:9": Object.freeze({ width: 1_920, height: 1_080 }),
  "9:16": Object.freeze({ width: 1_080, height: 1_920 }),
});

export interface CreateStudioInput {
  readonly name: string;
}

export const createStudio = (
  input: CreateStudioInput,
  dependencies: DomainFactoryDependencies = DEFAULT_DOMAIN_FACTORY_DEPENDENCIES,
): Studio => ({
  id: dependencies.createId("studio"),
  name: input.name,
  ...createEntityMetadata(dependencies.clock),
});

export interface CreateShowInput {
  readonly studioId: StudioId;
  readonly name: string;
  readonly description?: string;
  readonly styleDefaults?: JsonObject;
}

export const createShow = (
  input: CreateShowInput,
  dependencies: DomainFactoryDependencies = DEFAULT_DOMAIN_FACTORY_DEPENDENCIES,
): Show => ({
  id: dependencies.createId("show"),
  studioId: input.studioId,
  name: input.name,
  ...(input.description === undefined
    ? {}
    : { description: input.description }),
  styleDefaults:
    input.styleDefaults === undefined ? {} : { ...input.styleDefaults },
  ...createEntityMetadata(dependencies.clock),
});

export interface CreateShowSegmentInput {
  readonly showId: ShowId;
  readonly name: string;
  readonly description?: string;
  readonly expectedDurationMs?: number;
  readonly notesTemplate?: string;
}

export const createShowSegment = (
  input: CreateShowSegmentInput,
  dependencies: DomainFactoryDependencies = DEFAULT_DOMAIN_FACTORY_DEPENDENCIES,
): ShowSegment => {
  const id = dependencies.createId("showSegment");
  const metadata = createEntityMetadata(dependencies.clock);

  return {
    id,
    showId: input.showId,
    name: input.name,
    ...(input.description === undefined
      ? {}
      : { description: input.description }),
    dataFields: [],
    lifecycle: defineSegmentLifecycle({
      showSegmentId: id,
      prepare: [],
      enter: [],
      active: {
        availableLayoutIds: [],
        hostCueIds: [],
      },
      exit: [],
      cleanup: [],
      ...metadata,
    }),
    layoutIds: [],
    hostCues: [],
    ...(input.expectedDurationMs === undefined
      ? {}
      : { expectedDurationMs: input.expectedDurationMs }),
    notesTemplate: input.notesTemplate ?? "",
    ...metadata,
  };
};

export interface CreateLayoutInput {
  readonly showId: ShowId;
  readonly name: string;
  readonly aspectRatio?: CanvasAspectRatio;
}

export const createLayout = (
  input: CreateLayoutInput,
  dependencies: DomainFactoryDependencies = DEFAULT_DOMAIN_FACTORY_DEPENDENCIES,
): Layout => {
  const aspectRatio = input.aspectRatio ?? "16:9";
  const canvas = DEFAULT_LAYOUT_CANVAS[aspectRatio];

  return {
    id: dependencies.createId("layout"),
    showId: input.showId,
    name: input.name,
    aspectRatio,
    canvas: { ...canvas },
    slots: [],
    componentPlacements: [],
    ...createEntityMetadata(dependencies.clock),
  };
};

export interface CreateEpisodeInput {
  readonly showId: ShowId;
  readonly title: string;
  readonly subtitle?: string;
  readonly episodeNumber?: number;
  readonly description?: string;
  readonly plannedAt?: UtcTimestamp;
  readonly guestNames?: readonly string[];
  readonly sponsorInformation?: string;
  readonly internalNotes?: string;
}

export const createEpisode = (
  input: CreateEpisodeInput,
  dependencies: DomainFactoryDependencies = DEFAULT_DOMAIN_FACTORY_DEPENDENCIES,
): Episode => ({
  id: dependencies.createId("episode"),
  showId: input.showId,
  title: input.title,
  ...(input.subtitle === undefined ? {} : { subtitle: input.subtitle }),
  ...(input.episodeNumber === undefined
    ? {}
    : { episodeNumber: input.episodeNumber }),
  ...(input.description === undefined
    ? {}
    : { description: input.description }),
  ...(input.plannedAt === undefined ? {} : { plannedAt: input.plannedAt }),
  status: "draft",
  guestNames: [...(input.guestNames ?? [])],
  ...(input.sponsorInformation === undefined
    ? {}
    : { sponsorInformation: input.sponsorInformation }),
  internalNotes: input.internalNotes ?? "",
  segments: [],
  ...createEntityMetadata(dependencies.clock),
});

export interface CreateEpisodeSegmentInput {
  readonly episode: Pick<Episode, "id" | "showId">;
  readonly sourceSegment: ShowSegment;
  readonly position: number;
  readonly label?: string;
  readonly fieldValues?: JsonObject;
  readonly notes?: string;
  readonly expectedDurationOverrideMs?: number;
  readonly defaultLayoutOverride?: Layout;
}

export const createEpisodeSegment = (
  input: CreateEpisodeSegmentInput,
  dependencies: DomainFactoryDependencies = DEFAULT_DOMAIN_FACTORY_DEPENDENCIES,
): EpisodeSegment => {
  assertShowSegmentOwnedByShow(input.sourceSegment, input.episode.showId);

  if (input.defaultLayoutOverride !== undefined) {
    assertLayoutOwnedByShow(input.defaultLayoutOverride, input.episode.showId);
  }

  return {
    id: dependencies.createId("episodeSegment"),
    episodeId: input.episode.id,
    sourceShowSegmentId: input.sourceSegment.id,
    position: input.position,
    ...(input.label === undefined ? {} : { label: input.label }),
    fieldValues:
      input.fieldValues === undefined ? {} : { ...input.fieldValues },
    notes: input.notes ?? "",
    ...(input.expectedDurationOverrideMs === undefined
      ? {}
      : { expectedDurationOverrideMs: input.expectedDurationOverrideMs }),
    ...(input.defaultLayoutOverride === undefined
      ? {}
      : { defaultLayoutOverrideId: input.defaultLayoutOverride.id }),
    fixedResourceReplacements: [],
    ...createEntityMetadata(dependencies.clock),
  };
};
