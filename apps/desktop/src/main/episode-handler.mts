import {
  ApplicationError,
  calculateEpisodeProgress,
  type CreateEpisodeFromBlueprintCommand,
  type CreateShowSegmentInEpisodeCommand,
  type DuplicateEpisodeSegmentCommand,
  type GetEpisodeStoryboardQuery,
  type GetShowDesignQuery,
  type InsertSegmentIntoEpisodeCommand,
  type ListEpisodesQuery,
  type RemoveEpisodeSegmentCommand,
  type ReorderEpisodeSegmentsCommand,
  type RestoreEpisodeSegmentCommand,
} from "@showflow/application";
import {
  CreateEpisodeRequestSchema,
  CreateEpisodeSegmentRequestSchema,
  EpisodeListResultSchema,
  EpisodeSegmentMutationRequestSchema,
  EpisodeStoryboardResultSchema,
  GetEpisodeRequestSchema,
  InsertEpisodeSegmentRequestSchema,
  ListEpisodesRequestSchema,
  ReorderEpisodeRequestSchema,
  RestoreEpisodeSegmentRequestSchema,
  type ApiErrorCode,
  type EpisodeListResult,
  type EpisodeSegmentDto,
  type EpisodeStoryboardResult,
} from "@showflow/contracts";
import {
  parseEntityId,
  parseUtcTimestamp,
  type Episode,
  type EpisodeSegment,
  type JsonObject,
} from "@showflow/domain";

export interface EpisodeOperations {
  readonly create: Pick<CreateEpisodeFromBlueprintCommand, "execute">;
  readonly createSegment: Pick<CreateShowSegmentInEpisodeCommand, "execute">;
  readonly duplicateSegment: Pick<DuplicateEpisodeSegmentCommand, "execute">;
  readonly get: Pick<GetEpisodeStoryboardQuery, "execute">;
  readonly getDesign: Pick<GetShowDesignQuery, "execute">;
  readonly insertSegment: Pick<InsertSegmentIntoEpisodeCommand, "execute">;
  readonly list: Pick<ListEpisodesQuery, "execute">;
  readonly removeSegment: Pick<RemoveEpisodeSegmentCommand, "execute">;
  readonly reorder: Pick<ReorderEpisodeSegmentsCommand, "execute">;
  readonly restoreSegment: Pick<RestoreEpisodeSegmentCommand, "execute">;
}

const applicationErrorCode = (error: unknown): ApiErrorCode =>
  error instanceof ApplicationError ? error.code : "INTERNAL_ERROR";

const storyboardError = (
  code: ApiErrorCode,
  message: string,
): EpisodeStoryboardResult =>
  EpisodeStoryboardResultSchema.parse({ ok: false, error: { code, message } });

const listError = (code: ApiErrorCode, message: string): EpisodeListResult =>
  EpisodeListResultSchema.parse({ ok: false, error: { code, message } });

const episodeDto = (episode: Episode) => ({
  createdAt: episode.createdAt,
  description: episode.description ?? null,
  episodeNumber: episode.episodeNumber ?? null,
  guestNames: [...episode.guestNames],
  id: episode.id,
  internalNotes: episode.internalNotes,
  plannedAt: episode.plannedAt ?? null,
  segmentCount: episode.segments.length,
  showId: episode.showId,
  sponsorInformation: episode.sponsorInformation ?? null,
  status: episode.status,
  subtitle: episode.subtitle ?? null,
  title: episode.title,
  updatedAt: episode.updatedAt,
});

const segmentDto = (segment: EpisodeSegment): EpisodeSegmentDto => ({
  createdAt: segment.createdAt,
  defaultLayoutOverrideId: segment.defaultLayoutOverrideId ?? null,
  episodeId: segment.episodeId,
  expectedDurationOverrideMs: segment.expectedDurationOverrideMs ?? null,
  fieldValues: segment.fieldValues,
  fixedResourceReplacements: segment.fixedResourceReplacements.map(
    (replacement) => ({ ...replacement }),
  ),
  id: segment.id,
  label: segment.label ?? null,
  notes: segment.notes,
  position: segment.position,
  sourceShowSegmentId: segment.sourceShowSegmentId,
  updatedAt: segment.updatedAt,
});

const storyboardSuccess = (
  storyboard: Awaited<ReturnType<GetEpisodeStoryboardQuery["execute"]>>,
): EpisodeStoryboardResult => {
  const progress = calculateEpisodeProgress(storyboard.items);
  const parsed = EpisodeStoryboardResultSchema.safeParse({
    ok: true,
    data: {
      episode: episodeDto(storyboard.episode),
      items: storyboard.items.map(({ episodeSegment, sourceSegment }) => ({
        episodeSegment: segmentDto(episodeSegment),
        expectedDurationMs:
          episodeSegment.expectedDurationOverrideMs ??
          sourceSegment.expectedDurationMs ??
          null,
        readiness: "needs-content",
        sourceSegment: {
          archivedAt: sourceSegment.archivedAt ?? null,
          createdAt: sourceSegment.createdAt,
          description: sourceSegment.description ?? null,
          expectedDurationMs: sourceSegment.expectedDurationMs ?? null,
          id: sourceSegment.id,
          name: sourceSegment.name,
          showId: sourceSegment.showId,
          updatedAt: sourceSegment.updatedAt,
        },
        summary: episodeSegment.label ?? null,
        validationIssueCount: 0,
      })),
      progress,
      show: {
        archivedAt: storyboard.show.archivedAt ?? null,
        createdAt: storyboard.show.createdAt,
        description: storyboard.show.description ?? null,
        id: storyboard.show.id,
        name: storyboard.show.name,
        studioId: storyboard.show.studioId,
        thumbnailResourceId: storyboard.show.thumbnailResourceId ?? null,
        updatedAt: storyboard.show.updatedAt,
      },
    },
  });
  return parsed.success
    ? parsed.data
    : storyboardError(
        "IPC_INVALID_RESPONSE",
        "Showflow could not validate the Episode response.",
      );
};

const loadScopedStoryboard = async (
  studioId: string,
  showId: string,
  episodeId: string,
  query: EpisodeOperations["get"],
) => {
  const storyboard = await query.execute(parseEntityId<"episode">(episodeId));
  if (storyboard.show.id !== showId || storyboard.show.studioId !== studioId) {
    throw new ApplicationError("NOT_FOUND", "Episode was not found.");
  }
  return storyboard;
};

export const handleCreateEpisodeRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  operations: EpisodeOperations,
): Promise<EpisodeStoryboardResult> => {
  if (!senderIsTrusted) {
    return storyboardError(
      "IPC_UNTRUSTED_SENDER",
      "The Episode creation request did not come from Showflow.",
    );
  }
  const validRequest = CreateEpisodeRequestSchema.safeParse(request);
  if (!validRequest.success) {
    return storyboardError(
      "IPC_INVALID_REQUEST",
      "Enter an Episode title and check the optional number and planned date.",
    );
  }
  try {
    const design = await operations.getDesign.execute(
      parseEntityId<"studio">(validRequest.data.studioId),
      parseEntityId<"show">(validRequest.data.showId),
    );
    const blueprintIsEmpty = design.blueprint.placements.length === 0;
    if (blueprintIsEmpty && validRequest.data.source !== "blank") {
      return storyboardError(
        "VALIDATION_ERROR",
        "This Show does not have a Blueprint yet. Design the Show or choose Create Blank Episode.",
      );
    }
    if (!blueprintIsEmpty && validRequest.data.source === "blank") {
      return storyboardError(
        "VALIDATION_ERROR",
        "Create this Episode from the current Show Blueprint.",
      );
    }
    const created = await operations.create.execute({
      showId: design.show.id,
      title: validRequest.data.title,
      ...(validRequest.data.episodeNumber === undefined
        ? {}
        : { episodeNumber: validRequest.data.episodeNumber }),
      ...(validRequest.data.plannedDate === undefined
        ? {}
        : {
            plannedAt: parseUtcTimestamp(
              `${validRequest.data.plannedDate}T12:00:00.000Z`,
            ),
          }),
    });
    return storyboardSuccess(
      await loadScopedStoryboard(
        validRequest.data.studioId,
        validRequest.data.showId,
        created.id,
        operations.get,
      ),
    );
  } catch (error) {
    return storyboardError(
      applicationErrorCode(error),
      "Showflow could not create the Episode. Nothing was saved. Try again.",
    );
  }
};

export const handleGetEpisodeRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  operations: EpisodeOperations,
): Promise<EpisodeStoryboardResult> => {
  if (!senderIsTrusted) {
    return storyboardError(
      "IPC_UNTRUSTED_SENDER",
      "The Episode request did not come from Showflow.",
    );
  }
  const validRequest = GetEpisodeRequestSchema.safeParse(request);
  if (!validRequest.success) {
    return storyboardError(
      "IPC_INVALID_REQUEST",
      "The Episode request was invalid.",
    );
  }
  try {
    return storyboardSuccess(
      await loadScopedStoryboard(
        validRequest.data.studioId,
        validRequest.data.showId,
        validRequest.data.episodeId,
        operations.get,
      ),
    );
  } catch (error) {
    return storyboardError(
      applicationErrorCode(error),
      "This Episode is no longer available. Return to Show Detail.",
    );
  }
};

export const handleListEpisodesRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  operations: EpisodeOperations,
): Promise<EpisodeListResult> => {
  if (!senderIsTrusted) {
    return listError(
      "IPC_UNTRUSTED_SENDER",
      "The Episode list request did not come from Showflow.",
    );
  }
  const validRequest = ListEpisodesRequestSchema.safeParse(request);
  if (!validRequest.success) {
    return listError(
      "IPC_INVALID_REQUEST",
      "The Episode list request was invalid.",
    );
  }
  try {
    const episodes = await operations.list.execute(
      parseEntityId<"studio">(validRequest.data.studioId),
      parseEntityId<"show">(validRequest.data.showId),
    );
    const summaries = await Promise.all(
      episodes.map(async (episode) => {
        const storyboard = await operations.get.execute(episode.id);
        return {
          ...episodeDto(episode),
          estimatedRuntimeMs: calculateEpisodeProgress(storyboard.items)
            .estimatedRuntimeMs,
        };
      }),
    );
    const result = EpisodeListResultSchema.safeParse({
      ok: true,
      data: summaries,
    });
    return result.success
      ? result.data
      : listError(
          "IPC_INVALID_RESPONSE",
          "Showflow could not validate the Episode list response.",
        );
  } catch (error) {
    return listError(
      applicationErrorCode(error),
      "Showflow could not load recent Episodes. Try again.",
    );
  }
};

type MutationKind =
  "reorder" | "duplicate" | "remove" | "insert" | "create" | "restore";

export const handleEpisodeMutationRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  operations: EpisodeOperations,
  kind: MutationKind,
): Promise<EpisodeStoryboardResult> => {
  if (!senderIsTrusted) {
    return storyboardError(
      "IPC_UNTRUSTED_SENDER",
      `The Episode ${kind} request did not come from Showflow.`,
    );
  }
  const schema =
    kind === "reorder"
      ? ReorderEpisodeRequestSchema
      : kind === "insert"
        ? InsertEpisodeSegmentRequestSchema
        : kind === "create"
          ? CreateEpisodeSegmentRequestSchema
          : kind === "restore"
            ? RestoreEpisodeSegmentRequestSchema
            : EpisodeSegmentMutationRequestSchema;
  const validRequest = schema.safeParse(request);
  if (!validRequest.success) {
    return storyboardError(
      "IPC_INVALID_REQUEST",
      `The Episode ${kind} request was invalid.`,
    );
  }
  const scope = validRequest.data;
  try {
    await loadScopedStoryboard(
      scope.studioId,
      scope.showId,
      scope.episodeId,
      operations.get,
    );
    if (kind === "reorder" && "orderedEpisodeSegmentIds" in scope) {
      await operations.reorder.execute({
        episodeId: parseEntityId<"episode">(scope.episodeId),
        orderedEpisodeSegmentIds: scope.orderedEpisodeSegmentIds.map((id) =>
          parseEntityId<"episodeSegment">(id),
        ),
      });
    } else if (kind === "duplicate" && "episodeSegmentId" in scope) {
      await operations.duplicateSegment.execute({
        episodeId: parseEntityId<"episode">(scope.episodeId),
        episodeSegmentId: parseEntityId<"episodeSegment">(
          scope.episodeSegmentId,
        ),
      });
    } else if (kind === "remove" && "episodeSegmentId" in scope) {
      await operations.removeSegment.execute({
        episodeId: parseEntityId<"episode">(scope.episodeId),
        episodeSegmentId: parseEntityId<"episodeSegment">(
          scope.episodeSegmentId,
        ),
      });
    } else if (kind === "insert" && "showSegmentId" in scope) {
      await operations.insertSegment.execute({
        episodeId: parseEntityId<"episode">(scope.episodeId),
        showSegmentId: parseEntityId<"showSegment">(scope.showSegmentId),
        ...(scope.position === undefined ? {} : { position: scope.position }),
      });
    } else if (kind === "create" && "name" in scope) {
      await operations.createSegment.execute({
        episodeId: parseEntityId<"episode">(scope.episodeId),
        name: scope.name,
        ...(scope.description === undefined
          ? {}
          : { description: scope.description }),
        ...(scope.position === undefined ? {} : { position: scope.position }),
      });
    } else if (kind === "restore" && "segment" in scope) {
      await operations.restoreSegment.execute({
        episodeId: parseEntityId<"episode">(scope.episodeId),
        segment: {
          id: parseEntityId<"episodeSegment">(scope.segment.id),
          episodeId: parseEntityId<"episode">(scope.segment.episodeId),
          sourceShowSegmentId: parseEntityId<"showSegment">(
            scope.segment.sourceShowSegmentId,
          ),
          position: scope.segment.position,
          ...(scope.segment.label === null
            ? {}
            : { label: scope.segment.label }),
          fieldValues: scope.segment.fieldValues as JsonObject,
          notes: scope.segment.notes,
          ...(scope.segment.expectedDurationOverrideMs === null
            ? {}
            : {
                expectedDurationOverrideMs:
                  scope.segment.expectedDurationOverrideMs,
              }),
          ...(scope.segment.defaultLayoutOverrideId === null
            ? {}
            : {
                defaultLayoutOverrideId: parseEntityId<"layout">(
                  scope.segment.defaultLayoutOverrideId,
                ),
              }),
          fixedResourceReplacements:
            scope.segment.fixedResourceReplacements.map((replacement) => ({
              componentPlacementId: parseEntityId<"componentPlacement">(
                replacement.componentPlacementId,
              ),
              propertyKey: replacement.propertyKey,
              resourceId: parseEntityId<"resource">(replacement.resourceId),
            })),
          createdAt: parseUtcTimestamp(scope.segment.createdAt),
          updatedAt: parseUtcTimestamp(scope.segment.updatedAt),
        },
      });
    }
    return storyboardSuccess(
      await loadScopedStoryboard(
        scope.studioId,
        scope.showId,
        scope.episodeId,
        operations.get,
      ),
    );
  } catch (error) {
    return storyboardError(
      applicationErrorCode(error),
      "Showflow could not save the Episode change. Your saved Storyboard was not changed. Try again.",
    );
  }
};
