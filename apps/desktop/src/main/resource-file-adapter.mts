import fs from "node:fs/promises";
import path from "node:path";

import {
  ApplicationError,
  type InspectedResourceFile,
  type ResourceFilePort,
} from "@showflow/application";
import type { Resource } from "@showflow/domain";
import {
  createThumbnailCacheKey,
  resourceFileDefinition,
  validateResourceFileSignature,
} from "@showflow/resources";
import { nativeImage } from "electron";

const SIGNATURE_BYTES = 32;

const fileError = (error: unknown, fileName: string): ApplicationError => {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  if (code === "EACCES" || code === "EPERM") {
    return new ApplicationError(
      "PERMISSION_DENIED",
      `Showflow does not have permission to read ${fileName}. Choose the file again or update its file permissions.`,
      { cause: error },
    );
  }
  if (code === "ENOENT") {
    return new ApplicationError(
      "FILE_UNAVAILABLE",
      `${fileName} could not be found. Locate it or choose a replacement.`,
      { cause: error },
    );
  }
  return new ApplicationError(
    "FILE_UNAVAILABLE",
    `Showflow could not read ${fileName}. Check the file and try again.`,
    { cause: error },
  );
};

export class DesktopResourceFileAdapter implements ResourceFilePort {
  constructor(readonly thumbnailDirectory: string) {}

  async inspect(filePath: string): Promise<InspectedResourceFile> {
    const absolutePath = path.resolve(filePath);
    const originalFilename = path.basename(absolutePath);
    const definition = resourceFileDefinition(absolutePath);
    if (definition === undefined) {
      throw new ApplicationError(
        "UNSUPPORTED_MEDIA",
        `${originalFilename} is not a supported image, video, or audio file. Choose PNG, JPEG, GIF, WebP, MP4, WebM, MP3, WAV, Ogg, or M4A.`,
      );
    }

    let handle: fs.FileHandle | undefined;
    try {
      const stats = await fs.stat(absolutePath);
      if (!stats.isFile()) {
        throw new ApplicationError(
          "UNSUPPORTED_MEDIA",
          `${originalFilename} is not a file Showflow can import.`,
        );
      }
      handle = await fs.open(absolutePath, "r");
      const signature = new Uint8Array(Math.min(SIGNATURE_BYTES, stats.size));
      await handle.read(signature, 0, signature.length, 0);
      if (!validateResourceFileSignature(definition, signature)) {
        throw new ApplicationError(
          "UNSUPPORTED_MEDIA",
          `${originalFilename} does not match its file type. Choose an unmodified supported media file.`,
        );
      }
      const sourceModifiedAt = stats.mtime.toISOString();
      const base = {
        absolutePath,
        category: definition.category,
        fileSizeBytes: stats.size,
        mimeType: definition.mimeType,
        originalFilename,
        sourceModifiedAt,
      } as const;
      return base;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      throw fileError(error, originalFilename);
    } finally {
      await handle?.close();
    }
  }

  async deriveThumbnail(resource: Resource): Promise<string | undefined> {
    if (
      resource.category !== "image" ||
      resource.localPath === undefined ||
      resource.sourceModifiedAt === undefined
    ) {
      return undefined;
    }
    await fs.mkdir(this.thumbnailDirectory, { recursive: true });
    const cacheKey = createThumbnailCacheKey(
      resource.id,
      resource.sourceModifiedAt,
    );
    const thumbnailPath = path.join(this.thumbnailDirectory, `${cacheKey}.png`);
    try {
      await fs.access(thumbnailPath);
      return thumbnailPath;
    } catch {
      const image = nativeImage.createFromPath(resource.localPath);
      if (image.isEmpty()) return undefined;
      const resized = image.resize({ width: 640, quality: "good" });
      await fs.writeFile(thumbnailPath, resized.toPNG());
      return thumbnailPath;
    }
  }
}
