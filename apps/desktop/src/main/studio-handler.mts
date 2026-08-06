import {
  ApplicationError,
  type CreateStudioCommand,
  type GetStudioQuery,
} from "@showflow/application";
import {
  CreateStudioRequestSchema,
  GetStudioRequestSchema,
  StudioDtoSchema,
  StudioResultSchema,
  type ApiErrorCode,
  type StudioResult,
} from "@showflow/contracts";
import { parseEntityId, type Studio } from "@showflow/domain";

type CreateStudioOperation = Pick<CreateStudioCommand, "execute">;
type GetStudioOperation = Pick<GetStudioQuery, "execute">;

const createErrorResult = (code: ApiErrorCode, message: string): StudioResult =>
  StudioResultSchema.parse({
    ok: false,
    error: { code, message },
  });

const getApplicationErrorCode = (error: unknown): ApiErrorCode =>
  error instanceof ApplicationError ? error.code : "INTERNAL_ERROR";

const createSuccessResult = (studio: Studio): StudioResult => {
  const studioDto = StudioDtoSchema.safeParse({
    archivedAt: studio.archivedAt ?? null,
    createdAt: studio.createdAt,
    id: studio.id,
    logoResourceId: studio.logoResourceId ?? null,
    name: studio.name,
    updatedAt: studio.updatedAt,
  });

  if (!studioDto.success) {
    return createErrorResult(
      "IPC_INVALID_RESPONSE",
      "Showflow could not validate the Studio response.",
    );
  }

  return StudioResultSchema.parse({
    ok: true,
    data: studioDto.data,
  });
};

export const handleCreateStudioRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  command: CreateStudioOperation,
): Promise<StudioResult> => {
  if (!senderIsTrusted) {
    return createErrorResult(
      "IPC_UNTRUSTED_SENDER",
      "The Studio creation request did not come from Showflow.",
    );
  }

  const validRequest = CreateStudioRequestSchema.safeParse(request);
  if (!validRequest.success) {
    return createErrorResult(
      "IPC_INVALID_REQUEST",
      "Enter a Studio name between 1 and 200 characters.",
    );
  }

  try {
    return createSuccessResult(await command.execute(validRequest.data));
  } catch (error) {
    return createErrorResult(
      getApplicationErrorCode(error),
      "Showflow could not create the Studio. Nothing was saved. Check the name and try again.",
    );
  }
};

export const handleGetStudioRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  query: GetStudioOperation,
): Promise<StudioResult> => {
  if (!senderIsTrusted) {
    return createErrorResult(
      "IPC_UNTRUSTED_SENDER",
      "The Studio request did not come from Showflow.",
    );
  }

  const validRequest = GetStudioRequestSchema.safeParse(request);
  if (!validRequest.success) {
    return createErrorResult(
      "IPC_INVALID_REQUEST",
      "The Studio request was invalid.",
    );
  }

  try {
    return createSuccessResult(
      await query.execute(parseEntityId<"studio">(validRequest.data.studioId)),
    );
  } catch (error) {
    return createErrorResult(
      getApplicationErrorCode(error),
      error instanceof ApplicationError && error.code === "NOT_FOUND"
        ? "This Studio is no longer available. Return to Studio setup."
        : "Showflow could not load the Studio. Your saved work was not changed. Try again.",
    );
  }
};
