import {
  ApplicationError,
  parseResourceContext,
  type DeleteResourceCommand,
  type ImportResourcesCommand,
  type ListResourcesQuery,
  type RepairResourceCommand,
  type RenameResourceCommand,
  type UpdateResourceMetadataCommand,
} from "@showflow/application";
import {
  GetResourceUrlRequestSchema,
  ImportResourcePathsRequestSchema,
  ImportResourcesRequestSchema,
  ListResourcesRequestSchema,
  RemoveResourceRequestSchema,
  RenameResourceRequestSchema,
  RepairResourceRequestSchema,
  ResourceListResultSchema,
  ResourceUrlResultSchema,
  UpdateResourceMetadataRequestSchema,
  type ApiErrorCode,
  type ResourceDto,
  type ResourceListResult,
  type ResourceUrlResult,
} from "@showflow/contracts";
import { parseEntityId } from "@showflow/domain";
import type { BrowserWindow } from "electron";

import type { ResourceProtocolService } from "./resource-protocol.mjs";

export interface ResourceDialogPort {
  selectFiles(
    window: BrowserWindow,
    options: { readonly multiple: boolean },
  ): Promise<readonly string[] | null>;
}

export interface ResourceOperations {
  readonly accessUrls: Pick<ResourceProtocolService, "issueUrl">;
  readonly delete: Pick<DeleteResourceCommand, "execute">;
  readonly import: Pick<ImportResourcesCommand, "execute">;
  readonly list: Pick<ListResourcesQuery, "execute">;
  readonly repair: Pick<RepairResourceCommand, "execute">;
  readonly rename: Pick<RenameResourceCommand, "execute">;
  readonly updateMetadata: Pick<UpdateResourceMetadataCommand, "execute">;
}

const errorCode = (error: unknown): ApiErrorCode =>
  error instanceof ApplicationError ? error.code : "INTERNAL_ERROR";

const failure = (error: unknown, fallback: string): ResourceListResult =>
  ResourceListResultSchema.parse({
    ok: false,
    error: {
      code: errorCode(error),
      message: error instanceof ApplicationError ? error.message : fallback,
    },
  });

const contextOf = (context: {
  readonly scope: "studio" | "show" | "episode";
  readonly studioId: string;
  readonly showId?: string;
  readonly episodeId?: string;
}) => parseResourceContext(context);

const resourceDto = (
  detail: Awaited<ReturnType<ListResourcesQuery["execute"]>>[number],
): ResourceDto => ({
  availability: detail.resource.availability,
  category: detail.resource.category,
  contentHash: detail.resource.contentHash ?? null,
  createdAt: detail.resource.createdAt,
  dimensions: detail.resource.dimensions ?? null,
  displayName: detail.resource.displayName,
  durationMs: detail.resource.durationMs ?? null,
  fileSizeBytes: detail.resource.fileSizeBytes ?? null,
  id: detail.resource.id,
  mimeType: detail.resource.mimeType,
  originalFilename: detail.resource.originalFilename ?? null,
  owner: detail.resource.owner,
  sourceModifiedAt: detail.resource.sourceModifiedAt ?? null,
  thumbnailCacheKey: detail.resource.thumbnailCacheKey ?? null,
  updatedAt: detail.resource.updatedAt,
  usage: detail.usage.map((usage) => ({ ...usage })),
});

const listSuccess = async (
  context: ReturnType<typeof contextOf>,
  operations: ResourceOperations,
): Promise<ResourceListResult> =>
  ResourceListResultSchema.parse({
    ok: true,
    data: (await operations.list.execute(context)).map(resourceDto),
  });

const untrusted = (): ResourceListResult =>
  ResourceListResultSchema.parse({
    ok: false,
    error: {
      code: "IPC_UNTRUSTED_SENDER",
      message: "The Resource request did not come from Showflow.",
    },
  });

export const handleListResourcesRequest = async (
  request: unknown,
  trusted: boolean,
  operations: ResourceOperations,
): Promise<ResourceListResult> => {
  if (!trusted) return untrusted();
  const valid = ListResourcesRequestSchema.safeParse(request);
  if (!valid.success) {
    return failure(
      new ApplicationError(
        "VALIDATION_ERROR",
        "Choose a valid Resource scope.",
      ),
      "Showflow could not list Resources.",
    );
  }
  try {
    return await listSuccess(contextOf(valid.data.context), operations);
  } catch (error) {
    return failure(error, "Showflow could not load Resources. Try again.");
  }
};

export const handleImportResourcePathsRequest = async (
  request: unknown,
  trusted: boolean,
  operations: ResourceOperations,
): Promise<ResourceListResult> => {
  if (!trusted) return untrusted();
  const valid = ImportResourcePathsRequestSchema.safeParse(request);
  if (!valid.success) {
    return failure(
      new ApplicationError(
        "VALIDATION_ERROR",
        "Choose supported media files to import.",
      ),
      "Showflow could not import these files.",
    );
  }
  try {
    const context = contextOf(valid.data.context);
    await operations.import.execute({
      context,
      filePaths: valid.data.filePaths,
    });
    return await listSuccess(context, operations);
  } catch (error) {
    return failure(
      error,
      "Showflow could not import these files. Check them and try again.",
    );
  }
};

export const handleNativeImportResourcesRequest = async (
  request: unknown,
  trusted: boolean,
  operations: ResourceOperations,
  dialogs: ResourceDialogPort,
  window: BrowserWindow,
): Promise<ResourceListResult> => {
  if (!trusted) return untrusted();
  const valid = ImportResourcesRequestSchema.safeParse(request);
  if (!valid.success) {
    return failure(
      new ApplicationError(
        "VALIDATION_ERROR",
        "Choose a valid Resource scope.",
      ),
      "Showflow could not import Resources.",
    );
  }
  try {
    const filePaths = await dialogs.selectFiles(window, { multiple: true });
    const context = contextOf(valid.data.context);
    if (filePaths === null) return listSuccess(context, operations);
    await operations.import.execute({ context, filePaths });
    return await listSuccess(context, operations);
  } catch (error) {
    return failure(
      error,
      "Showflow could not open or import these files. Try again.",
    );
  }
};

export const handleRepairResourceRequest = async (
  request: unknown,
  trusted: boolean,
  operations: ResourceOperations,
  dialogs: ResourceDialogPort,
  window: BrowserWindow,
  mode: "locate" | "replace",
): Promise<ResourceListResult> => {
  if (!trusted) return untrusted();
  const valid = RepairResourceRequestSchema.safeParse(request);
  if (!valid.success) {
    return failure(
      new ApplicationError("VALIDATION_ERROR", "Choose a Resource to repair."),
      "Showflow could not repair this Resource.",
    );
  }
  try {
    const context = contextOf(valid.data.context);
    const files = await dialogs.selectFiles(window, { multiple: false });
    if (files === null) return listSuccess(context, operations);
    const filePath = files[0];
    if (filePath === undefined) return listSuccess(context, operations);
    await operations.repair.execute({
      context,
      filePath,
      mode,
      resourceId: parseEntityId<"resource">(valid.data.resourceId),
    });
    return await listSuccess(context, operations);
  } catch (error) {
    return failure(
      error,
      "Showflow could not repair this Resource. Choose another file.",
    );
  }
};

export const handleRemoveResourceRequest = async (
  request: unknown,
  trusted: boolean,
  operations: ResourceOperations,
): Promise<ResourceListResult> => {
  if (!trusted) return untrusted();
  const valid = RemoveResourceRequestSchema.safeParse(request);
  if (!valid.success) {
    return failure(
      new ApplicationError("VALIDATION_ERROR", "Choose a Resource to remove."),
      "Showflow could not remove this Resource.",
    );
  }
  try {
    const context = contextOf(valid.data.context);
    await operations.delete.execute(
      context,
      parseEntityId<"resource">(valid.data.resourceId),
    );
    return await listSuccess(context, operations);
  } catch (error) {
    return failure(
      error,
      "Showflow could not remove this Resource. Try again.",
    );
  }
};

export const handleRenameResourceRequest = async (
  request: unknown,
  trusted: boolean,
  operations: ResourceOperations,
): Promise<ResourceListResult> => {
  if (!trusted) return untrusted();
  const valid = RenameResourceRequestSchema.safeParse(request);
  if (!valid.success) {
    return failure(
      new ApplicationError(
        "VALIDATION_ERROR",
        "Resource name must contain between 1 and 255 characters.",
      ),
      "Showflow could not rename this Resource.",
    );
  }
  try {
    const context = contextOf(valid.data.context);
    await operations.rename.execute(
      context,
      parseEntityId<"resource">(valid.data.resourceId),
      valid.data.displayName,
    );
    return await listSuccess(context, operations);
  } catch (error) {
    return failure(error, "Showflow could not rename this Resource.");
  }
};

export const handleUpdateResourceMetadataRequest = async (
  request: unknown,
  trusted: boolean,
  operations: ResourceOperations,
): Promise<ResourceListResult> => {
  if (!trusted) return untrusted();
  const valid = UpdateResourceMetadataRequestSchema.safeParse(request);
  if (!valid.success) {
    return failure(
      new ApplicationError(
        "VALIDATION_ERROR",
        "Resource preview metadata is invalid.",
      ),
      "Showflow could not update the Resource preview.",
    );
  }
  try {
    const context = contextOf(valid.data.context);
    await operations.updateMetadata.execute({
      context,
      resourceId: parseEntityId<"resource">(valid.data.resourceId),
      ...(valid.data.dimensions === undefined
        ? {}
        : { dimensions: valid.data.dimensions }),
      ...(valid.data.durationMs === undefined
        ? {}
        : { durationMs: valid.data.durationMs }),
      ...(valid.data.unsupported === undefined
        ? {}
        : { unsupported: valid.data.unsupported }),
    });
    return await listSuccess(context, operations);
  } catch (error) {
    return failure(error, "Showflow could not update the Resource preview.");
  }
};

export const handleGetResourceUrlRequest = async (
  request: unknown,
  trusted: boolean,
  operations: ResourceOperations,
): Promise<ResourceUrlResult> => {
  if (!trusted) {
    return ResourceUrlResultSchema.parse({
      ok: false,
      error: {
        code: "IPC_UNTRUSTED_SENDER",
        message: "The Resource preview request did not come from Showflow.",
      },
    });
  }
  const valid = GetResourceUrlRequestSchema.safeParse(request);
  if (!valid.success) {
    return ResourceUrlResultSchema.parse({
      ok: false,
      error: {
        code: "IPC_INVALID_REQUEST",
        message: "Choose a valid Resource preview.",
      },
    });
  }
  try {
    return ResourceUrlResultSchema.parse({
      ok: true,
      data: await operations.accessUrls.issueUrl(
        parseEntityId<"resource">(valid.data.resourceId),
        parseEntityId<"studio">(valid.data.studioId),
        valid.data.variant,
      ),
    });
  } catch (error) {
    return ResourceUrlResultSchema.parse({
      ok: false,
      error: {
        code: errorCode(error),
        message:
          error instanceof ApplicationError
            ? error.message
            : "Showflow could not open this Resource preview.",
      },
    });
  }
};
