import { describe, expect, it } from "vitest";

import { createResource, renameResource } from "./factories.mjs";
import {
  createFixedClock,
  parseEntityId,
  parseUtcTimestamp,
} from "../index.js";
import type {
  DomainFactoryDependencies,
  EntityId,
  EntityIdKind,
} from "../index.js";

const timestamp = parseUtcTimestamp("2026-08-07T12:00:00.000Z");
let idCounter = 1;
const dependencies: DomainFactoryDependencies = {
  clock: createFixedClock(timestamp),
  createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
    parseEntityId<TEntity>(
      `01942c1f-ae8f-7e42-b900-${String(idCounter++).padStart(12, "0")}`,
    ),
};

describe("createResource", () => {
  it("creates linked metadata without copying file content", () => {
    const resource = createResource(
      {
        owner: {
          scope: "show",
          showId: dependencies.createId("show"),
        },
        displayName: "  Album artwork  ",
        category: "image",
        mimeType: "image/png",
        localPath: "/media/artwork.png",
        originalFilename: "artwork.png",
        fileSizeBytes: 1024,
        sourceModifiedAt: timestamp,
      },
      dependencies,
    );

    expect(resource.displayName).toBe("Album artwork");
    expect(resource.availability).toBe("available");
    expect(resource.localPath).toBe("/media/artwork.png");
  });

  it("renames a Resource without changing its identity or owner", () => {
    const resource = createResource(
      {
        owner: {
          scope: "show",
          showId: dependencies.createId("show"),
        },
        displayName: "Old name",
        category: "image",
        mimeType: "image/png",
      },
      dependencies,
    );

    expect(
      renameResource(resource, "  New name  ", dependencies.clock),
    ).toMatchObject({
      id: resource.id,
      owner: resource.owner,
      displayName: "New name",
    });
    expect(() => renameResource(resource, "   ")).toThrow(
      "Resource name must contain",
    );
  });
});
