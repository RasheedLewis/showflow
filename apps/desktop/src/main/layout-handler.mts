import {
  ApplicationError,
  type ArchiveLayoutCommand,
  type CreateEpisodeLayoutCommand,
  type CreateLayoutFromPresetCommand,
  type DuplicateLayoutCommand,
  type GetLayoutEditorQuery,
  type ListLayoutCatalogQuery,
  type RenameLayoutCommand,
  type UpdateLayoutCommand,
} from "@showflow/application";
import {
  CreateLayoutRequestSchema,
  GetLayoutRequestSchema,
  LayoutCatalogResultSchema,
  LayoutMutationRequestSchema,
  LayoutResultSchema,
  ListLayoutsRequestSchema,
  RenameLayoutRequestSchema,
  UpdateLayoutRequestSchema,
  type ApiErrorCode,
  type LayoutCatalogResult,
  type LayoutResult,
} from "@showflow/contracts";
import {
  parseEntityId,
  parseUtcTimestamp,
  type Layout,
} from "@showflow/domain";

export interface LayoutOperations {
  readonly archive: Pick<ArchiveLayoutCommand, "execute">;
  readonly createEpisode: Pick<CreateEpisodeLayoutCommand, "execute">;
  readonly create: Pick<CreateLayoutFromPresetCommand, "execute">;
  readonly duplicate: Pick<DuplicateLayoutCommand, "execute">;
  readonly get: Pick<GetLayoutEditorQuery, "execute">;
  readonly list: Pick<ListLayoutCatalogQuery, "execute">;
  readonly rename: Pick<RenameLayoutCommand, "execute">;
  readonly update: Pick<UpdateLayoutCommand, "execute">;
}

const errorCode = (error: unknown): ApiErrorCode =>
  error instanceof ApplicationError ? error.code : "INTERNAL_ERROR";

const layoutDto = (layout: Layout) => ({
  id: layout.id,
  showId: layout.showId,
  name: layout.name,
  aspectRatio: layout.aspectRatio,
  canvas: layout.canvas,
  slots: layout.slots.map((slot) => ({
    id: slot.id,
    layoutId: slot.layoutId,
    name: slot.name,
    role: slot.role,
    bounds: slot.bounds,
    alignment: slot.alignment,
    safeMargins: slot.safeMargins,
    layerOrder: slot.layerOrder,
    clipContent: slot.clipContent,
    allowedComponentTypes: [...slot.allowedComponentTypes],
    createdAt: slot.createdAt,
    updatedAt: slot.updatedAt,
  })),
  archivedAt: layout.archivedAt ?? null,
  createdAt: layout.createdAt,
  updatedAt: layout.updatedAt,
});

const layoutError = (code: ApiErrorCode, message: string): LayoutResult =>
  LayoutResultSchema.parse({ ok: false, error: { code, message } });
const catalogError = (
  code: ApiErrorCode,
  message: string,
): LayoutCatalogResult =>
  LayoutCatalogResultSchema.parse({ ok: false, error: { code, message } });
const success = (layout: Layout): LayoutResult => {
  const parsed = LayoutResultSchema.safeParse({
    ok: true,
    data: layoutDto(layout),
  });
  return parsed.success
    ? parsed.data
    : layoutError(
        "IPC_INVALID_RESPONSE",
        "Showflow could not validate the Layout response.",
      );
};

export const handleListLayoutsRequest = async (
  request: unknown,
  trusted: boolean,
  operations: LayoutOperations,
): Promise<LayoutCatalogResult> => {
  if (!trusted)
    return catalogError(
      "IPC_UNTRUSTED_SENDER",
      "The Layout request did not come from Showflow.",
    );
  const parsed = ListLayoutsRequestSchema.safeParse(request);
  if (!parsed.success)
    return catalogError(
      "IPC_INVALID_REQUEST",
      "The Layout Catalog request was invalid.",
    );
  try {
    const items = await operations.list.execute(
      parseEntityId<"studio">(parsed.data.studioId),
      parseEntityId<"show">(parsed.data.showId),
    );
    return LayoutCatalogResultSchema.parse({
      ok: true,
      data: items.map(({ layout, usageCount }) => ({
        layout: layoutDto(layout),
        usageCount,
      })),
    });
  } catch (error) {
    return catalogError(
      errorCode(error),
      "Showflow could not load the Layout Catalog. Your saved work was not changed.",
    );
  }
};

export const handleGetLayoutRequest = async (
  request: unknown,
  trusted: boolean,
  operations: LayoutOperations,
): Promise<LayoutResult> => {
  if (!trusted)
    return layoutError(
      "IPC_UNTRUSTED_SENDER",
      "The Layout request did not come from Showflow.",
    );
  const parsed = GetLayoutRequestSchema.safeParse(request);
  if (!parsed.success)
    return layoutError(
      "IPC_INVALID_REQUEST",
      "The Layout request was invalid.",
    );
  try {
    return success(
      await operations.get.execute(
        parseEntityId<"studio">(parsed.data.studioId),
        parseEntityId<"show">(parsed.data.showId),
        parseEntityId<"layout">(parsed.data.layoutId),
      ),
    );
  } catch (error) {
    return layoutError(
      errorCode(error),
      "This Layout is no longer available. Return to the Layout Catalog.",
    );
  }
};

export const handleCreateLayoutRequest = async (
  request: unknown,
  trusted: boolean,
  operations: LayoutOperations,
): Promise<LayoutResult> => {
  if (!trusted)
    return layoutError(
      "IPC_UNTRUSTED_SENDER",
      "The Layout creation request did not come from Showflow.",
    );
  const parsed = CreateLayoutRequestSchema.safeParse(request);
  if (!parsed.success)
    return layoutError(
      "IPC_INVALID_REQUEST",
      "Choose a Layout name, preset, and aspect ratio.",
    );
  try {
    await operations.list.execute(
      parseEntityId<"studio">(parsed.data.context.studioId),
      parseEntityId<"show">(parsed.data.context.showId),
    );
    const context = parsed.data.context;
    const isEpisode = context.scope === "episode";
    const layout = isEpisode
      ? await operations.createEpisode.execute({
          episodeId: parseEntityId<"episode">(context.episodeId),
          episodeSegmentId: parseEntityId<"episodeSegment">(
            context.episodeSegmentId,
          ),
          expectedShowId: parseEntityId<"show">(context.showId),
          name: parsed.data.name,
          aspectRatio: parsed.data.aspectRatio,
          presetId: parsed.data.presetId,
        })
      : await operations.create.execute({
          context: {
            scope: "show",
            showId: parseEntityId<"show">(context.showId),
          },
          expectedShowId: parseEntityId<"show">(context.showId),
          name: parsed.data.name,
          aspectRatio: parsed.data.aspectRatio,
          presetId: parsed.data.presetId,
        });
    return success(layout);
  } catch (error) {
    return layoutError(
      errorCode(error),
      "Showflow could not create the Layout. Nothing was assigned. Try again.",
    );
  }
};

const handleCatalogMutation = async (
  request: unknown,
  trusted: boolean,
  operations: LayoutOperations,
  action: "archive" | "duplicate" | "rename",
): Promise<LayoutResult> => {
  if (!trusted)
    return layoutError(
      "IPC_UNTRUSTED_SENDER",
      `The Layout ${action} request did not come from Showflow.`,
    );
  const parsed =
    action === "rename"
      ? RenameLayoutRequestSchema.safeParse(request)
      : LayoutMutationRequestSchema.safeParse(request);
  if (!parsed.success)
    return layoutError(
      "IPC_INVALID_REQUEST",
      `The Layout ${action} request was invalid.`,
    );
  try {
    await operations.list.execute(
      parseEntityId<"studio">(parsed.data.studioId),
      parseEntityId<"show">(parsed.data.showId),
    );
    const scope = {
      showId: parseEntityId<"show">(parsed.data.showId),
      layoutId: parseEntityId<"layout">(parsed.data.layoutId),
    };
    const layout =
      action === "archive"
        ? await operations.archive.execute(scope)
        : action === "duplicate"
          ? await operations.duplicate.execute(scope)
          : await operations.rename.execute({
              ...scope,
              name:
                "name" in parsed.data && typeof parsed.data.name === "string"
                  ? parsed.data.name
                  : "",
            });
    return success(layout);
  } catch (error) {
    return layoutError(
      errorCode(error),
      `Showflow could not ${action} the Layout. Your saved Layouts were not changed.`,
    );
  }
};

export const handleArchiveLayoutRequest = (
  request: unknown,
  trusted: boolean,
  operations: LayoutOperations,
) => handleCatalogMutation(request, trusted, operations, "archive");
export const handleDuplicateLayoutRequest = (
  request: unknown,
  trusted: boolean,
  operations: LayoutOperations,
) => handleCatalogMutation(request, trusted, operations, "duplicate");
export const handleRenameLayoutRequest = (
  request: unknown,
  trusted: boolean,
  operations: LayoutOperations,
) => handleCatalogMutation(request, trusted, operations, "rename");

export const handleUpdateLayoutRequest = async (
  request: unknown,
  trusted: boolean,
  operations: LayoutOperations,
): Promise<LayoutResult> => {
  if (!trusted)
    return layoutError(
      "IPC_UNTRUSTED_SENDER",
      "The Layout update request did not come from Showflow.",
    );
  const parsed = UpdateLayoutRequestSchema.safeParse(request);
  if (!parsed.success)
    return layoutError(
      "IPC_INVALID_REQUEST",
      "Keep every Slot inside the audience frame and check the inspector values.",
    );
  try {
    await operations.list.execute(
      parseEntityId<"studio">(parsed.data.studioId),
      parseEntityId<"show">(parsed.data.showId),
    );
    return success(
      await operations.update.execute({
        showId: parseEntityId<"show">(parsed.data.showId),
        layoutId: parseEntityId<"layout">(parsed.data.layoutId),
        expectedUpdatedAt: parseUtcTimestamp(parsed.data.expectedUpdatedAt),
        name: parsed.data.name,
        slots: parsed.data.slots.map((slot) => {
          const draft = {
            name: slot.name,
            role: slot.role,
            bounds: slot.bounds,
            alignment: slot.alignment,
            safeMargins: slot.safeMargins,
            layerOrder: slot.layerOrder,
            clipContent: slot.clipContent,
            allowedComponentTypes: slot.allowedComponentTypes,
          };
          return slot.id === undefined
            ? draft
            : { ...draft, id: parseEntityId<"slot">(slot.id) };
        }),
      }),
    );
  } catch (error) {
    return layoutError(
      errorCode(error),
      error instanceof ApplicationError
        ? error.message
        : "Showflow could not save the Layout change. Your saved composition was not changed.",
    );
  }
};
