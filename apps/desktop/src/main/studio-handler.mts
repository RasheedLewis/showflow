import {
  ApplicationError,
  type CreateStudioCommand,
  type GetStudioQuery,
  type ListStudiosQuery,
} from "@showflow/application";
import {
  CreateStudioRequestSchema,
  GetStudioRequestSchema,
  ListStudiosRequestSchema,
  StudioDtoSchema,
  StudioListResultSchema,
  StudioResultSchema,
  type ApiErrorCode,
  type StudioDto,
  type StudioListResult,
  type StudioResult,
} from "@showflow/contracts";
import { parseEntityId, type Studio } from "@showflow/domain";

type CreateStudioOperation = Pick<CreateStudioCommand, "execute">;
type GetStudioOperation = Pick<GetStudioQuery, "execute">;
type ListStudiosOperation = Pick<ListStudiosQuery, "execute">;

const createErrorResult = (code: ApiErrorCode, message: string): StudioResult =>
  StudioResultSchema.parse({
    ok: false,
    error: { code, message },
  });

const createListErrorResult = (
  code: ApiErrorCode,
  message: string,
): StudioListResult =>
  StudioListResultSchema.parse({
    ok: false,
    error: { code, message },
  });

const getApplicationErrorCode = (error: unknown): ApiErrorCode =>
  error instanceof ApplicationError ? error.code : "INTERNAL_ERROR";

const parseStudioDto = (studio: Studio): StudioDto | null => {
  const studioDto = StudioDtoSchema.safeParse({
    archivedAt: studio.archivedAt ?? null,
    createdAt: studio.createdAt,
    id: studio.id,
    logoResourceId: studio.logoResourceId ?? null,
    name: studio.name,
    updatedAt: studio.updatedAt,
  });

  return studioDto.success ? studioDto.data : null;
};

const createSuccessResult = (studio: Studio): StudioResult => {
  const studioDto = parseStudioDto(studio);

  if (studioDto === null)
    return createErrorResult(
      "IPC_INVALID_RESPONSE",
      "Showflow could not validate the Studio response.",
    );

  return StudioResultSchema.parse({
    ok: true,
    data: studioDto,
  });
};

const createListSuccessResult = (
  studios: readonly Studio[],
): StudioListResult => {
  const studioDtos = studios.map(parseStudioDto);

  if (studioDtos.some((studio) => studio === null)) {
    return createListErrorResult(
      "IPC_INVALID_RESPONSE",
      "Showflow could not validate the Studio list response.",
    );
  }

  return StudioListResultSchema.parse({
    ok: true,
    data: studioDtos,
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

export const handleListStudiosRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  query: ListStudiosOperation,
): Promise<StudioListResult> => {
  if (!senderIsTrusted) {
    return createListErrorResult(
      "IPC_UNTRUSTED_SENDER",
      "The Studio list request did not come from Showflow.",
    );
  }

  if (!ListStudiosRequestSchema.safeParse(request).success) {
    return createListErrorResult(
      "IPC_INVALID_REQUEST",
      "The Studio list request was invalid.",
    );
  }

  try {
    return createListSuccessResult(await query.execute());
  } catch (error) {
    return createListErrorResult(
      getApplicationErrorCode(error),
      "Showflow could not load the Studios. Your saved work was not changed. Try again.",
    );
  }
};
