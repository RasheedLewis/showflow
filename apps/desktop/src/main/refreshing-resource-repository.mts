import {
  ApplicationError,
  type ResourceFilePort,
  type ResourceRepository,
} from "@showflow/application";
import {
  parseUtcTimestamp,
  SYSTEM_CLOCK,
  updateEntityMetadata,
  type Resource,
  type ResourceId,
} from "@showflow/domain";
import { createThumbnailCacheKey } from "@showflow/resources";

export class RefreshingResourceRepository implements ResourceRepository {
  constructor(
    readonly stored: ResourceRepository,
    readonly files: ResourceFilePort,
  ) {}

  async #refresh(resource: Resource | null): Promise<Resource | null> {
    if (resource === null || resource.localPath === undefined) return resource;
    try {
      const metadata = await this.files.inspect(resource.localPath);
      if (metadata.category !== resource.category) {
        return this.#saveAvailability(resource, "unsupported");
      }
      const sourceModifiedAt = parseUtcTimestamp(metadata.sourceModifiedAt);
      const expectedThumbnailCacheKey =
        resource.category === "image"
          ? createThumbnailCacheKey(resource.id, sourceModifiedAt)
          : undefined;
      const changed =
        resource.availability !== "available" ||
        resource.sourceModifiedAt !== sourceModifiedAt ||
        resource.fileSizeBytes !== metadata.fileSizeBytes ||
        resource.thumbnailCacheKey !== expectedThumbnailCacheKey;
      if (!changed) return resource;
      const updated: Resource = {
        ...resource,
        availability: "available",
        fileSizeBytes: metadata.fileSizeBytes,
        mimeType: metadata.mimeType,
        sourceModifiedAt,
        ...(metadata.dimensions === undefined
          ? {}
          : { dimensions: metadata.dimensions }),
        ...(metadata.durationMs === undefined
          ? {}
          : { durationMs: metadata.durationMs }),
        ...(expectedThumbnailCacheKey === undefined
          ? {}
          : { thumbnailCacheKey: expectedThumbnailCacheKey }),
        ...updateEntityMetadata(resource, SYSTEM_CLOCK),
      };
      await this.stored.save(updated);
      return updated;
    } catch (error) {
      if (
        error instanceof ApplicationError &&
        (error.code === "FILE_UNAVAILABLE" ||
          error.code === "PERMISSION_DENIED")
      ) {
        return this.#saveAvailability(
          resource,
          error.code === "PERMISSION_DENIED" ? "unavailable" : "missing",
        );
      }
      if (
        error instanceof ApplicationError &&
        error.code === "UNSUPPORTED_MEDIA"
      ) {
        return this.#saveAvailability(resource, "unsupported");
      }
      throw error;
    }
  }

  async #saveAvailability(
    resource: Resource,
    availability: Resource["availability"],
  ): Promise<Resource> {
    if (resource.availability === availability) return resource;
    const updated = {
      ...resource,
      availability,
      ...updateEntityMetadata(resource, SYSTEM_CLOCK),
    };
    await this.stored.save(updated);
    return updated;
  }

  async getById(id: ResourceId): Promise<Resource | null> {
    return this.#refresh(await this.stored.getById(id));
  }

  async listByOwner(owner: Resource["owner"]): Promise<readonly Resource[]> {
    const refreshed = await Promise.all(
      (await this.stored.listByOwner(owner)).map((resource) =>
        this.#refresh(resource),
      ),
    );
    return refreshed.filter(
      (resource): resource is Resource => resource !== null,
    );
  }

  save(resource: Resource): Promise<void> {
    return this.stored.save(resource);
  }

  delete(id: ResourceId): Promise<void> {
    return this.stored.delete(id);
  }

  listUsage(id: ResourceId) {
    return this.stored.listUsage(id);
  }
}
