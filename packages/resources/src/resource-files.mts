import type { PixelDimensions, ResourceCategory } from "@showflow/domain";

export const SUPPORTED_RESOURCE_FILES = Object.freeze({
  ".gif": { category: "image", mimeType: "image/gif" },
  ".jpeg": { category: "image", mimeType: "image/jpeg" },
  ".jpg": { category: "image", mimeType: "image/jpeg" },
  ".m4a": { category: "audio", mimeType: "audio/mp4" },
  ".mp3": { category: "audio", mimeType: "audio/mpeg" },
  ".mp4": { category: "video", mimeType: "video/mp4" },
  ".ogg": { category: "audio", mimeType: "audio/ogg" },
  ".png": { category: "image", mimeType: "image/png" },
  ".wav": { category: "audio", mimeType: "audio/wav" },
  ".webm": { category: "video", mimeType: "video/webm" },
  ".webp": { category: "image", mimeType: "image/webp" },
} satisfies Readonly<
  Record<
    string,
    { readonly category: ResourceCategory; readonly mimeType: string }
  >
>);

export type SupportedFileCategory = "image" | "video" | "audio";

export interface ResourceFileMetadata {
  readonly absolutePath: string;
  readonly category: SupportedFileCategory;
  readonly fileSizeBytes: number;
  readonly mimeType: string;
  readonly originalFilename: string;
  readonly sourceModifiedAt: string;
  readonly dimensions?: PixelDimensions;
  readonly durationMs?: number;
}

export const resourceFileDefinition = (
  filePath: string,
):
  | { readonly category: SupportedFileCategory; readonly mimeType: string }
  | undefined =>
  SUPPORTED_RESOURCE_FILES[
    (filePath.match(/\.[^.\\/]+$/u)?.[0]?.toLowerCase() ??
      "") as keyof typeof SUPPORTED_RESOURCE_FILES
  ];

export const validateResourceFileSignature = (
  definition: {
    readonly category: SupportedFileCategory;
    readonly mimeType: string;
  },
  bytes: Uint8Array,
): boolean => {
  if (bytes.length === 0) return false;
  const starts = (...expected: number[]): boolean =>
    expected.every((value, index) => bytes[index] === value);

  switch (definition.mimeType) {
    case "image/png":
      return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/jpeg":
      return starts(0xff, 0xd8, 0xff);
    case "image/gif":
      return (
        new TextDecoder().decode(bytes.slice(0, 6)) === "GIF87a" ||
        new TextDecoder().decode(bytes.slice(0, 6)) === "GIF89a"
      );
    case "image/webp":
      return (
        new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
        new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
      );
    case "video/mp4":
    case "audio/mp4":
      return new TextDecoder().decode(bytes.slice(4, 8)) === "ftyp";
    case "video/webm":
      return starts(0x1a, 0x45, 0xdf, 0xa3);
    case "audio/mpeg":
      return (
        new TextDecoder().decode(bytes.slice(0, 3)) === "ID3" ||
        (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0)
      );
    case "audio/ogg":
      return new TextDecoder().decode(bytes.slice(0, 4)) === "OggS";
    case "audio/wav":
      return (
        new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
        new TextDecoder().decode(bytes.slice(8, 12)) === "WAVE"
      );
  }
  return false;
};

export const createThumbnailCacheKey = (
  resourceId: string,
  sourceModifiedAt: string,
  derivationVersion = 1,
): string =>
  `${resourceId}-${sourceModifiedAt.replaceAll(/[^0-9A-Za-z]/gu, "")}-v${derivationVersion}`;

export type ResourceProtocolVariant = "content" | "thumbnail";

export interface ParsedResourceProtocolUrl {
  readonly accessToken: string;
  readonly resourceId: string;
  readonly variant: ResourceProtocolVariant;
}

export const parseResourceProtocolUrl = (
  candidate: string,
): ParsedResourceProtocolUrl | undefined => {
  try {
    const url = new URL(candidate);
    if (
      url.protocol !== "showflow-resource:" ||
      url.hostname !== "resource" ||
      url.username !== "" ||
      url.password !== "" ||
      url.hash !== ""
    ) {
      return undefined;
    }
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length !== 2) return undefined;
    const [variant, resourceId] = segments;
    if (
      (variant !== "content" && variant !== "thumbnail") ||
      resourceId === undefined ||
      !/^[0-9a-f-]{36}$/u.test(resourceId)
    ) {
      return undefined;
    }
    const accessToken = url.searchParams.get("access");
    if (
      accessToken === null ||
      url.searchParams.size !== 1 ||
      !/^[0-9a-f-]{36}$/u.test(accessToken)
    ) {
      return undefined;
    }
    return { accessToken, resourceId, variant };
  } catch {
    return undefined;
  }
};
