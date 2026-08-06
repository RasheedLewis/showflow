import {
  ApplicationError,
  type CreateShowCommand,
  type GetShowDesignQuery,
} from "@showflow/application";
import {
  CreateShowRequestSchema,
  GetShowDesignRequestSchema,
  ShowDesignResultSchema,
  type ApiErrorCode,
  type ShowDesignResult,
} from "@showflow/contracts";
import { parseEntityId, type Show, type ShowBlueprint } from "@showflow/domain";

type CreateShowOperation = Pick<CreateShowCommand, "execute">;
type GetShowDesignOperation = Pick<GetShowDesignQuery, "execute">;

const errorResult = (code: ApiErrorCode, message: string): ShowDesignResult =>
  ShowDesignResultSchema.parse({ ok: false, error: { code, message } });

const applicationErrorCode = (error: unknown): ApiErrorCode =>
  error instanceof ApplicationError ? error.code : "INTERNAL_ERROR";

const successResult = (
  show: Show,
  blueprint: ShowBlueprint,
): ShowDesignResult => {
  const result = ShowDesignResultSchema.safeParse({
    ok: true,
    data: {
      show: {
        archivedAt: show.archivedAt ?? null,
        createdAt: show.createdAt,
        description: show.description ?? null,
        id: show.id,
        name: show.name,
        studioId: show.studioId,
        thumbnailResourceId: show.thumbnailResourceId ?? null,
        updatedAt: show.updatedAt,
      },
      blueprint: {
        createdAt: blueprint.createdAt,
        id: blueprint.id,
        placementCount: blueprint.placements.length,
        showId: blueprint.showId,
        updatedAt: blueprint.updatedAt,
      },
    },
  });
  return result.success
    ? result.data
    : errorResult(
        "IPC_INVALID_RESPONSE",
        "Showflow could not validate the Show response.",
      );
};

export const handleCreateShowRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  command: CreateShowOperation,
): Promise<ShowDesignResult> => {
  if (!senderIsTrusted) {
    return errorResult(
      "IPC_UNTRUSTED_SENDER",
      "The Show creation request did not come from Showflow.",
    );
  }
  const validRequest = CreateShowRequestSchema.safeParse(request);
  if (!validRequest.success) {
    return errorResult(
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
    return successResult(created.show, created.blueprint);
  } catch (error) {
    return errorResult(
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
    return errorResult(
      "IPC_UNTRUSTED_SENDER",
      "The Design Show request did not come from Showflow.",
    );
  }
  const validRequest = GetShowDesignRequestSchema.safeParse(request);
  if (!validRequest.success) {
    return errorResult("IPC_INVALID_REQUEST", "The Show request was invalid.");
  }

  try {
    const result = await query.execute(
      parseEntityId<"studio">(validRequest.data.studioId),
      parseEntityId<"show">(validRequest.data.showId),
    );
    return successResult(result.show, result.blueprint);
  } catch (error) {
    return errorResult(
      applicationErrorCode(error),
      error instanceof ApplicationError && error.code === "NOT_FOUND"
        ? "This Show is no longer available. Return to Studio Home."
        : "Showflow could not load Design Show. Your saved work was not changed. Try again.",
    );
  }
};
