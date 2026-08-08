import { describe, expect, it } from "vitest";

import {
  createThumbnailCacheKey,
  parseResourceProtocolUrl,
  resourceFileDefinition,
  validateResourceFileSignature,
} from "./resource-files.mjs";

describe("Resource file validation", () => {
  it("maps supported extensions and rejects unsupported files", () => {
    expect(resourceFileDefinition("/media/artwork.PNG")).toEqual({
      category: "image",
      mimeType: "image/png",
    });
    expect(resourceFileDefinition("/media/archive.zip")).toBeUndefined();
  });

  it("rejects MIME-confused content", () => {
    const png = resourceFileDefinition("art.png");
    if (png === undefined) throw new Error("PNG definition is missing");
    expect(
      validateResourceFileSignature(
        png,
        new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
      ),
    ).toBe(false);
  });

  it("changes the thumbnail key after source modification", () => {
    expect(
      createThumbnailCacheKey("resource", "2026-08-07T12:00:00.000Z"),
    ).not.toBe(createThumbnailCacheKey("resource", "2026-08-07T12:01:00.000Z"));
  });
});

describe("Resource protocol URL parsing", () => {
  const id = "514ad6df-710d-4301-9bff-b096e9db3dd4";
  const token = "8d9df01f-2584-4b9a-ad13-a96d673918e9";

  it("accepts the allowlisted Resource ID URL", () => {
    expect(
      parseResourceProtocolUrl(
        `showflow-resource://resource/content/${id}?access=${token}`,
      ),
    ).toEqual({ accessToken: token, resourceId: id, variant: "content" });
  });

  it.each([
    `showflow-resource://resource/content/../${id}?access=${token}`,
    `showflow-resource://resource/content/%2e%2e?access=${token}`,
    `showflow-resource://resource/content/${id}/extra?access=${token}`,
    `file:///private/etc/passwd`,
  ])("9.T4 rejects traversal and non-allowlisted URLs: %s", (candidate) => {
    expect(parseResourceProtocolUrl(candidate)).toBeUndefined();
  });
});
