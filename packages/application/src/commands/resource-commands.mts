import {
  createResource,
  parseEntityId,
  parseUtcTimestamp,
  renameResource,
  updateEntityMetadata,
  type DomainFactoryDependencies,
  type EpisodeId,
  type PixelDimensions,
  type Resource,
  type ResourceCategory,
  type ResourceId,
  type ResourceOwner,
  type ShowId,
  type StudioId,
} from "@showflow/domain";

import {
  DEFAULT_COMMAND_DEPENDENCIES,
  requireEntity,
} from "./command-support.mjs";
import { ApplicationError } from "../errors/application-error.mjs";
import type {
  EpisodeRepository,
  ResourceRepository,
  ShowRepository,
  StudioRepository,
} from "../repositories/repositories.mjs";

export type ResourceScopeContext =
  | { readonly scope: "studio"; readonly studioId: StudioId }
  | {
      readonly scope: "show";
      readonly studioId: StudioId;
      readonly showId: ShowId;
    }
  | {
      readonly scope: "episode";
      readonly studioId: StudioId;
      readonly showId: ShowId;
      readonly episodeId: EpisodeId;
    };

export interface InspectedResourceFile {
  readonly absolutePath: string;
  readonly category: Extract<ResourceCategory, "image" | "video" | "audio">;
  readonly fileSizeBytes: number;
  readonly mimeType: string;
  readonly originalFilename: string;
  readonly sourceModifiedAt: string;
  readonly dimensions?: PixelDimensions;
  readonly durationMs?: number;
  readonly thumbnailCacheKey?: string;
}

export interface ResourceFilePort {
  inspect(filePath: string): Promise<InspectedResourceFile>;
}

type ResourceScopeRepositories = {
  readonly episodes: Pick<EpisodeRepository, "getById">;
  readonly shows: Pick<ShowRepository, "getById">;
  readonly studios: Pick<StudioRepository, "getById">;
};

export const resolveResourceOwner = async (
  context: ResourceScopeContext,
  repositories: ResourceScopeRepositories,
): Promise<ResourceOwner> => {
  const studio = requireEntity(
    await repositories.studios.getById(context.studioId),
    "Studio",
  );
  if (context.scope === "studio")
    return { scope: "studio", studioId: studio.id };

  const show = requireEntity(
    await repositories.shows.getById(context.showId),
    "Show",
  );
  if (show.studioId !== studio.id) {
    throw new ApplicationError(
      "NOT_FOUND",
      "Show was not found in this Studio.",
    );
  }
  if (context.scope === "show") return { scope: "show", showId: show.id };

  const episode = requireEntity(
    await repositories.episodes.getById(context.episodeId),
    "Episode",
  );
  if (episode.showId !== show.id) {
    throw new ApplicationError(
      "NOT_FOUND",
      "Episode was not found in this Show.",
    );
  }
  return { scope: "episode", episodeId: episode.id };
};

export interface ImportResourcesInput {
  readonly context: ResourceScopeContext;
  readonly filePaths: readonly string[];
}

type ResourceCommandRepositories = ResourceScopeRepositories & {
  readonly resources: ResourceRepository;
};

export class ImportResourcesCommand {
  constructor(
    readonly repositories: ResourceCommandRepositories,
    readonly files: ResourceFilePort,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(input: ImportResourcesInput): Promise<readonly Resource[]> {
    if (input.filePaths.length === 0) return [];
    const owner = await resolveResourceOwner(input.context, this.repositories);
    const imported: Resource[] = [];
    for (const filePath of input.filePaths) {
      const metadata = await this.files.inspect(filePath);
      const resource = createResource(
        {
          owner,
          displayName: metadata.originalFilename.replace(/\.[^.]+$/u, ""),
          category: metadata.category,
          mimeType: metadata.mimeType,
          originalFilename: metadata.originalFilename,
          localPath: metadata.absolutePath,
          fileSizeBytes: metadata.fileSizeBytes,
          sourceModifiedAt: parseUtcTimestamp(metadata.sourceModifiedAt),
          ...(metadata.dimensions === undefined
            ? {}
            : { dimensions: metadata.dimensions }),
          ...(metadata.durationMs === undefined
            ? {}
            : { durationMs: metadata.durationMs }),
          ...(metadata.thumbnailCacheKey === undefined
            ? {}
            : { thumbnailCacheKey: metadata.thumbnailCacheKey }),
        },
        this.dependencies,
      );
      await this.repositories.resources.save(resource);
      imported.push(resource);
    }
    return imported;
  }
}

export interface RepairResourceInput {
  readonly context: ResourceScopeContext;
  readonly filePath: string;
  readonly mode: "locate" | "replace";
  readonly resourceId: ResourceId;
}

const sameOwner = (left: ResourceOwner, right: ResourceOwner): boolean => {
  if (left.scope !== right.scope) return false;
  switch (left.scope) {
    case "studio":
      return right.scope === "studio" && left.studioId === right.studioId;
    case "show":
      return right.scope === "show" && left.showId === right.showId;
    case "episode":
      return right.scope === "episode" && left.episodeId === right.episodeId;
  }
};

export class RepairResourceCommand {
  constructor(
    readonly repositories: ResourceCommandRepositories,
    readonly files: ResourceFilePort,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(input: RepairResourceInput): Promise<Resource> {
    const owner = await resolveResourceOwner(input.context, this.repositories);
    const resource = requireEntity(
      await this.repositories.resources.getById(input.resourceId),
      "Resource",
    );
    if (!sameOwner(owner, resource.owner)) {
      throw new ApplicationError(
        "NOT_FOUND",
        "Resource was not found in this scope.",
      );
    }
    const metadata = await this.files.inspect(input.filePath);
    if (metadata.category !== resource.category) {
      throw new ApplicationError(
        "UNSUPPORTED_MEDIA",
        `Choose a ${resource.category} file to repair this Resource.`,
      );
    }
    const {
      contentHash: _contentHash,
      dimensions: _dimensions,
      durationMs: _durationMs,
      thumbnailCacheKey: _thumbnailCacheKey,
      ...resourceBase
    } = resource;
    void _contentHash;
    void _dimensions;
    void _durationMs;
    void _thumbnailCacheKey;
    const updated: Resource = {
      ...resourceBase,
      availability: "available",
      localPath: metadata.absolutePath,
      originalFilename: metadata.originalFilename,
      mimeType: metadata.mimeType,
      fileSizeBytes: metadata.fileSizeBytes,
      sourceModifiedAt: parseUtcTimestamp(metadata.sourceModifiedAt),
      ...(input.mode === "locate" && resource.contentHash !== undefined
        ? { contentHash: resource.contentHash }
        : {}),
      ...(metadata.dimensions === undefined
        ? {}
        : { dimensions: { ...metadata.dimensions } }),
      ...(metadata.durationMs === undefined
        ? {}
        : { durationMs: metadata.durationMs }),
      ...(metadata.thumbnailCacheKey === undefined
        ? {}
        : { thumbnailCacheKey: metadata.thumbnailCacheKey }),
      ...updateEntityMetadata(resource, this.dependencies.clock),
    };
    await this.repositories.resources.save(updated);
    return updated;
  }
}

export interface UpdateResourceMetadataInput {
  readonly context: ResourceScopeContext;
  readonly resourceId: ResourceId;
  readonly dimensions?: PixelDimensions;
  readonly durationMs?: number;
  readonly unsupported?: boolean;
}

export class UpdateResourceMetadataCommand {
  constructor(
    readonly repositories: ResourceCommandRepositories,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(input: UpdateResourceMetadataInput): Promise<Resource> {
    const owner = await resolveResourceOwner(input.context, this.repositories);
    const resource = requireEntity(
      await this.repositories.resources.getById(input.resourceId),
      "Resource",
    );
    if (!sameOwner(owner, resource.owner)) {
      throw new ApplicationError(
        "NOT_FOUND",
        "Resource was not found in this scope.",
      );
    }
    const updated: Resource = {
      ...resource,
      ...(input.dimensions === undefined
        ? {}
        : { dimensions: { ...input.dimensions } }),
      ...(input.durationMs === undefined
        ? {}
        : { durationMs: Math.round(input.durationMs) }),
      ...(input.unsupported === true ? { availability: "unsupported" } : {}),
      ...updateEntityMetadata(resource, this.dependencies.clock),
    };
    await this.repositories.resources.save(updated);
    return updated;
  }
}

export class DeleteResourceCommand {
  constructor(readonly repositories: ResourceCommandRepositories) {}

  async execute(
    context: ResourceScopeContext,
    resourceId: ResourceId,
  ): Promise<void> {
    const owner = await resolveResourceOwner(context, this.repositories);
    const resource = requireEntity(
      await this.repositories.resources.getById(resourceId),
      "Resource",
    );
    if (!sameOwner(owner, resource.owner)) {
      throw new ApplicationError(
        "NOT_FOUND",
        "Resource was not found in this scope.",
      );
    }
    await this.repositories.resources.delete(resourceId);
  }
}

export class RenameResourceCommand {
  constructor(
    readonly repositories: ResourceCommandRepositories,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(
    context: ResourceScopeContext,
    resourceId: ResourceId,
    displayName: string,
  ): Promise<Resource> {
    const owner = await resolveResourceOwner(context, this.repositories);
    const resource = requireEntity(
      await this.repositories.resources.getById(resourceId),
      "Resource",
    );
    if (!sameOwner(owner, resource.owner)) {
      throw new ApplicationError(
        "NOT_FOUND",
        "Resource was not found in this scope.",
      );
    }
    const updated = renameResource(
      resource,
      displayName,
      this.dependencies.clock,
    );
    await this.repositories.resources.save(updated);
    return updated;
  }
}

export const parseResourceContext = (input: {
  readonly scope: "studio" | "show" | "episode";
  readonly studioId: string;
  readonly showId?: string;
  readonly episodeId?: string;
}): ResourceScopeContext => {
  const studioId = parseEntityId<"studio">(input.studioId);
  if (input.scope === "studio") return { scope: "studio", studioId };
  if (input.showId === undefined) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Choose a Show for this Resource.",
    );
  }
  const showId = parseEntityId<"show">(input.showId);
  if (input.scope === "show") return { scope: "show", studioId, showId };
  if (input.episodeId === undefined) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Choose an Episode for this Resource.",
    );
  }
  return {
    scope: "episode",
    studioId,
    showId,
    episodeId: parseEntityId<"episode">(input.episodeId),
  };
};
