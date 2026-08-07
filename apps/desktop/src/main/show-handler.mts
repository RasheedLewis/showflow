import {
  ApplicationError,
  type ArchiveShowCommand,
  type CreateShowCommand,
  type DeleteShowCommand,
  type GetShowDesignQuery,
  type ListStudioShowsQuery,
  type RenameShowCommand,
  type StudioHomeShow,
} from "@showflow/application";
import {
  CreateShowRequestSchema,
  GetShowDesignRequestSchema,
  ListShowsRequestSchema,
  RenameShowRequestSchema,
  ShowDeleteResultSchema,
  ShowDesignResultSchema,
  ShowDtoSchema,
  ShowListResultSchema,
  ShowMutationRequestSchema,
  ShowResultSchema,
  type ApiErrorCode,
  type ShowDeleteResult,
  type ShowDesignResult,
  type ShowDto,
  type ShowListResult,
  type ShowResult,
} from "@showflow/contracts";
import {
  parseEntityId,
  type Show,
  type ShowBlueprint,
  type ShowSegment,
} from "@showflow/domain";

type CreateShowOperation = Pick<CreateShowCommand, "execute">;
type GetShowDesignOperation = Pick<GetShowDesignQuery, "execute">;
type ListShowsOperation = Pick<ListStudioShowsQuery, "execute">;
type RenameShowOperation = Pick<RenameShowCommand, "execute">;
type ArchiveShowOperation = Pick<ArchiveShowCommand, "execute">;
type DeleteShowOperation = Pick<DeleteShowCommand, "execute">;

export const showDesignErrorResult = (
  code: ApiErrorCode,
  message: string,
): ShowDesignResult =>
  ShowDesignResultSchema.parse({ ok: false, error: { code, message } });

const applicationErrorCode = (error: unknown): ApiErrorCode =>
  error instanceof ApplicationError ? error.code : "INTERNAL_ERROR";

const parseShowDto = (show: Show): ShowDto | null => {
  const result = ShowDtoSchema.safeParse({
    archivedAt: show.archivedAt ?? null,
    createdAt: show.createdAt,
    description: show.description ?? null,
    id: show.id,
    name: show.name,
    studioId: show.studioId,
    thumbnailResourceId: show.thumbnailResourceId ?? null,
    updatedAt: show.updatedAt,
  });
  return result.success ? result.data : null;
};

const parseSegmentDto = (segment: ShowSegment) => ({
  archivedAt: segment.archivedAt ?? null,
  createdAt: segment.createdAt,
  description: segment.description ?? null,
  expectedDurationMs: segment.expectedDurationMs ?? null,
  id: segment.id,
  name: segment.name,
  showId: segment.showId,
  updatedAt: segment.updatedAt,
});

export const showDesignSuccessResult = (
  show: Show,
  blueprint: ShowBlueprint,
  segments: readonly ShowSegment[] = [],
): ShowDesignResult => {
  const usageCounts = new Map<string, number>();
  for (const placement of blueprint.placements) {
    usageCounts.set(
      placement.showSegmentId,
      (usageCounts.get(placement.showSegmentId) ?? 0) + 1,
    );
  }
  const result = ShowDesignResultSchema.safeParse({
    ok: true,
    data: {
      show: parseShowDto(show),
      blueprint: {
        createdAt: blueprint.createdAt,
        id: blueprint.id,
        placementCount: blueprint.placements.length,
        placements: blueprint.placements.map((placement) => ({
          createdAt: placement.createdAt,
          defaultData: placement.defaultData,
          defaultDurationMs: placement.defaultDurationMs ?? null,
          id: placement.id,
          label: placement.label ?? null,
          placementOverrides: placement.placementOverrides ?? null,
          position: placement.position,
          showBlueprintId: placement.showBlueprintId,
          showSegmentId: placement.showSegmentId,
          updatedAt: placement.updatedAt,
        })),
        showId: blueprint.showId,
        updatedAt: blueprint.updatedAt,
      },
      segments: segments.map((segment) => ({
        blueprintUsageCount: usageCounts.get(segment.id) ?? 0,
        segment: parseSegmentDto(segment),
      })),
    },
  });
  return result.success
    ? result.data
    : showDesignErrorResult(
        "IPC_INVALID_RESPONSE",
        "Showflow could not validate the Show response.",
      );
};

const showErrorResult = (code: ApiErrorCode, message: string): ShowResult =>
  ShowResultSchema.parse({ ok: false, error: { code, message } });

const showSuccessResult = (show: Show): ShowResult => {
  const dto = parseShowDto(show);
  return dto === null
    ? showErrorResult(
        "IPC_INVALID_RESPONSE",
        "Showflow could not validate the Show response.",
      )
    : ShowResultSchema.parse({ ok: true, data: dto });
};

const listErrorResult = (code: ApiErrorCode, message: string): ShowListResult =>
  ShowListResultSchema.parse({ ok: false, error: { code, message } });

const listSuccessResult = (
  cards: readonly StudioHomeShow[],
): ShowListResult => {
  const data = cards.map(({ episodeCount, show }) => ({
    episodeCount,
    show: parseShowDto(show),
  }));
  const result = ShowListResultSchema.safeParse({ ok: true, data });
  return result.success
    ? result.data
    : listErrorResult(
        "IPC_INVALID_RESPONSE",
        "Showflow could not validate the Show cards response.",
      );
};

export const handleCreateShowRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  command: CreateShowOperation,
): Promise<ShowDesignResult> => {
  if (!senderIsTrusted) {
    return showDesignErrorResult(
      "IPC_UNTRUSTED_SENDER",
      "The Show creation request did not come from Showflow.",
    );
  }
  const validRequest = CreateShowRequestSchema.safeParse(request);
  if (!validRequest.success) {
    return showDesignErrorResult(
      "IPC_INVALID_REQUEST",
      "Enter a Show name between 1 and 200 characters.",
    );
  }

  try {
    const created = await command.execute({
      studioId: parseEntityId<"studio">(validRequest.data.studioId),
      name: validRequest.data.name,
      ...(validRequest.data.description === undefined
        ? {}
        : { description: validRequest.data.description }),
    });
    return showDesignSuccessResult(created.show, created.blueprint);
  } catch (error) {
    return showDesignErrorResult(
      applicationErrorCode(error),
      "Showflow could not create the Show. Nothing was saved. Check the details and try again.",
    );
  }
};

export const handleGetShowDesignRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  query: GetShowDesignOperation,
): Promise<ShowDesignResult> => {
  if (!senderIsTrusted) {
    return showDesignErrorResult(
      "IPC_UNTRUSTED_SENDER",
      "The Design Show request did not come from Showflow.",
    );
  }
  const validRequest = GetShowDesignRequestSchema.safeParse(request);
  if (!validRequest.success) {
    return showDesignErrorResult(
      "IPC_INVALID_REQUEST",
      "The Show request was invalid.",
    );
  }

  try {
    const result = await query.execute(
      parseEntityId<"studio">(validRequest.data.studioId),
      parseEntityId<"show">(validRequest.data.showId),
    );
    return showDesignSuccessResult(
      result.show,
      result.blueprint,
      result.segments,
    );
  } catch (error) {
    return showDesignErrorResult(
      applicationErrorCode(error),
      error instanceof ApplicationError && error.code === "NOT_FOUND"
        ? "This Show is no longer available. Return to Studio Home."
        : "Showflow could not load Design Show. Your saved work was not changed. Try again.",
    );
  }
};

export const handleListShowsRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  query: ListShowsOperation,
): Promise<ShowListResult> => {
  if (!senderIsTrusted) {
    return listErrorResult(
      "IPC_UNTRUSTED_SENDER",
      "The Show list request did not come from Showflow.",
    );
  }
  const validRequest = ListShowsRequestSchema.safeParse(request);
  if (!validRequest.success) {
    return listErrorResult(
      "IPC_INVALID_REQUEST",
      "The Show list request was invalid.",
    );
  }
  try {
    return listSuccessResult(
      await query.execute(parseEntityId<"studio">(validRequest.data.studioId)),
    );
  } catch (error) {
    return listErrorResult(
      applicationErrorCode(error),
      "Showflow could not load the Shows. Your saved work was not changed. Try again.",
    );
  }
};

const handleShowMutation = async (
  request: unknown,
  senderIsTrusted: boolean,
  operation: RenameShowOperation | ArchiveShowOperation,
  action: "archive" | "rename",
): Promise<ShowResult> => {
  if (!senderIsTrusted) {
    return showErrorResult(
      "IPC_UNTRUSTED_SENDER",
      `The Show ${action} request did not come from Showflow.`,
    );
  }
  const validRequest =
    action === "rename"
      ? RenameShowRequestSchema.safeParse(request)
      : ShowMutationRequestSchema.safeParse(request);
  if (!validRequest.success) {
    return showErrorResult(
      "IPC_INVALID_REQUEST",
      action === "rename"
        ? "Enter a Show name between 1 and 200 characters."
        : "The Show archive request was invalid.",
    );
  }
  try {
    const identifiers = {
      studioId: parseEntityId<"studio">(validRequest.data.studioId),
      showId: parseEntityId<"show">(validRequest.data.showId),
    };
    const requestedName =
      "name" in validRequest.data && typeof validRequest.data.name === "string"
        ? validRequest.data.name
        : "";
    const show =
      action === "rename"
        ? await (operation as RenameShowOperation).execute({
            ...identifiers,
            name: requestedName,
          })
        : await (operation as ArchiveShowOperation).execute(identifiers);
    return showSuccessResult(show);
  } catch (error) {
    return showErrorResult(
      applicationErrorCode(error),
      error instanceof ApplicationError && error.code === "NOT_FOUND"
        ? "This Show is no longer available. Refresh Studio Home."
        : `Showflow could not ${action} the Show. Your saved work was not changed. Try again.`,
    );
  }
};

export const handleRenameShowRequest = (
  request: unknown,
  senderIsTrusted: boolean,
  command: RenameShowOperation,
): Promise<ShowResult> =>
  handleShowMutation(request, senderIsTrusted, command, "rename");

export const handleArchiveShowRequest = (
  request: unknown,
  senderIsTrusted: boolean,
  command: ArchiveShowOperation,
): Promise<ShowResult> =>
  handleShowMutation(request, senderIsTrusted, command, "archive");

export const handleDeleteShowRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  command: DeleteShowOperation,
): Promise<ShowDeleteResult> => {
  const error = (code: ApiErrorCode, message: string): ShowDeleteResult =>
    ShowDeleteResultSchema.parse({ ok: false, error: { code, message } });
  if (!senderIsTrusted) {
    return error(
      "IPC_UNTRUSTED_SENDER",
      "The Show deletion request did not come from Showflow.",
    );
  }
  const validRequest = ShowMutationRequestSchema.safeParse(request);
  if (!validRequest.success) {
    return error(
      "IPC_INVALID_REQUEST",
      "The Show deletion request was invalid.",
    );
  }
  try {
    const showId = await command.execute({
      studioId: parseEntityId<"studio">(validRequest.data.studioId),
      showId: parseEntityId<"show">(validRequest.data.showId),
    });
    return ShowDeleteResultSchema.parse({ ok: true, data: { showId } });
  } catch (caught) {
    return error(
      applicationErrorCode(caught),
      caught instanceof ApplicationError && caught.code === "NOT_FOUND"
        ? "This Show is no longer available. Refresh Studio Home."
        : "Showflow could not delete the Show. Nothing was removed. Try again.",
    );
  }
};
