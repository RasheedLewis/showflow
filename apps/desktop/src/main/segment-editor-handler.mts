import {
  ApplicationError,
  type CreateSegmentDataFieldCommand,
  type DeleteSegmentDataFieldCommand,
  type GetShowSegmentEditorQuery,
  type ReorderSegmentDataFieldsCommand,
  type RestoreSegmentDataFieldCommand,
  type UpdateSegmentDataFieldCommand,
  type UpdateShowSegmentDetailsCommand,
} from "@showflow/application";
import {
  CreateSegmentFieldRequestSchema,
  DeleteSegmentFieldRequestSchema,
  GetSegmentEditorRequestSchema,
  ReorderSegmentFieldsRequestSchema,
  RestoreSegmentFieldRequestSchema,
  UpdateSegmentDetailsRequestSchema,
  UpdateSegmentFieldRequestSchema,
  type ApiErrorCode,
  type SegmentDataFieldDto,
  type ShowSegmentEditorDto,
  type ShowSegmentEditorResult,
} from "@showflow/contracts";
import {
  parseEntityId,
  parseUtcTimestamp,
  type SegmentDataField,
} from "@showflow/domain";

export interface SegmentEditorOperations {
  readonly createField: Pick<CreateSegmentDataFieldCommand, "execute">;
  readonly deleteField: Pick<DeleteSegmentDataFieldCommand, "execute">;
  readonly get: Pick<GetShowSegmentEditorQuery, "execute">;
  readonly reorderFields: Pick<ReorderSegmentDataFieldsCommand, "execute">;
  readonly restoreField: Pick<RestoreSegmentDataFieldCommand, "execute">;
  readonly updateDetails: Pick<UpdateShowSegmentDetailsCommand, "execute">;
  readonly updateField: Pick<UpdateSegmentDataFieldCommand, "execute">;
}

const errorResult = (
  code: ApiErrorCode,
  message: string,
): ShowSegmentEditorResult => ({ ok: false, error: { code, message } });

const defaultValueDto = (
  value: SegmentDataField["defaultValue"],
): SegmentDataFieldDto["defaultValue"] => {
  if (
    value === undefined ||
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value ?? null;
  }
  throw new ApplicationError(
    "VALIDATION_ERROR",
    "This Segment field has a default value that its field type cannot use.",
  );
};

const successResult = (
  editor: Awaited<ReturnType<GetShowSegmentEditorQuery["execute"]>>,
): ShowSegmentEditorResult => {
  const segment = editor.segment;
  const dataFields: SegmentDataFieldDto[] = segment.dataFields.map((field) => ({
    createdAt: field.createdAt,
    defaultValue: defaultValueDto(field.defaultValue),
    episodeValueUsageCount: editor.episodeValueUsageByFieldId[field.id] ?? 0,
    helpText: field.helpText ?? null,
    id: field.id,
    key: field.key,
    label: field.label,
    position: field.position,
    required: field.required,
    showSegmentId: field.showSegmentId,
    type: field.type,
    updatedAt: field.updatedAt,
  }));
  const data: ShowSegmentEditorDto = {
    archivedAt: segment.archivedAt ?? null,
    createdAt: segment.createdAt,
    dataFields,
    description: segment.description ?? null,
    expectedDurationMs: segment.expectedDurationMs ?? null,
    id: segment.id,
    lifecycle: {
      active: {
        availableLayoutIds: [...segment.lifecycle.active.availableLayoutIds],
        defaultLayoutId: segment.lifecycle.active.defaultLayoutId ?? null,
        hostCueIds: [...segment.lifecycle.active.hostCueIds],
      },
      cleanup: [...segment.lifecycle.cleanup],
      enter: [...segment.lifecycle.enter],
      exit: [...segment.lifecycle.exit],
      prepare: [...segment.lifecycle.prepare],
    },
    name: segment.name,
    notesTemplate: segment.notesTemplate,
    showId: segment.showId,
    updatedAt: segment.updatedAt,
    validationIssues: editor.validationIssues.map((issue) => ({
      code: issue.code,
      fieldId: issue.fieldId ?? null,
      message: issue.message,
    })),
  };
  return { ok: true, data };
};

const applicationErrorCode = (error: unknown): ApiErrorCode =>
  error instanceof ApplicationError ? error.code : "INTERNAL_ERROR";

const mutationFailure = (error: unknown): ShowSegmentEditorResult =>
  errorResult(
    applicationErrorCode(error),
    error instanceof ApplicationError
      ? error.message
      : "Showflow could not save this Segment change. Your last saved version is still available. Try again.",
  );

const reloadEditor = async (
  studioId: string,
  showId: string,
  showSegmentId: string,
  query: SegmentEditorOperations["get"],
): Promise<ShowSegmentEditorResult> =>
  successResult(
    await query.execute(
      parseEntityId<"studio">(studioId),
      parseEntityId<"show">(showId),
      parseEntityId<"showSegment">(showSegmentId),
    ),
  );

export const handleGetSegmentEditorRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  operations: SegmentEditorOperations,
): Promise<ShowSegmentEditorResult> => {
  if (!senderIsTrusted) {
    return errorResult(
      "IPC_UNTRUSTED_SENDER",
      "The Segment editor request did not come from Showflow.",
    );
  }
  const validRequest = GetSegmentEditorRequestSchema.safeParse(request);
  if (!validRequest.success) {
    return errorResult(
      "IPC_INVALID_REQUEST",
      "Showflow could not identify the Segment to open.",
    );
  }
  try {
    return await reloadEditor(
      validRequest.data.studioId,
      validRequest.data.showId,
      validRequest.data.showSegmentId,
      operations.get,
    );
  } catch (error) {
    return mutationFailure(error);
  }
};

const scope = (value: {
  readonly expectedUpdatedAt: string;
  readonly showId: string;
  readonly showSegmentId: string;
}) => ({
  expectedUpdatedAt: parseUtcTimestamp(value.expectedUpdatedAt),
  showId: parseEntityId<"show">(value.showId),
  showSegmentId: parseEntityId<"showSegment">(value.showSegmentId),
});

const finishMutation = async (
  request: {
    readonly showId: string;
    readonly showSegmentId: string;
    readonly studioId: string;
  },
  query: SegmentEditorOperations["get"],
): Promise<ShowSegmentEditorResult> =>
  reloadEditor(request.studioId, request.showId, request.showSegmentId, query);

export const handleUpdateSegmentDetailsRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  operations: SegmentEditorOperations,
): Promise<ShowSegmentEditorResult> => {
  if (!senderIsTrusted)
    return errorResult(
      "IPC_UNTRUSTED_SENDER",
      "The Segment save request did not come from Showflow.",
    );
  const valid = UpdateSegmentDetailsRequestSchema.safeParse(request);
  if (!valid.success)
    return errorResult(
      "IPC_INVALID_REQUEST",
      "Check the Segment name and expected duration, then try again.",
    );
  try {
    await operations.updateDetails.execute({
      ...scope(valid.data),
      name: valid.data.name,
      notesTemplate: valid.data.notesTemplate,
      ...(valid.data.expectedDurationMs === null
        ? {}
        : { expectedDurationMs: valid.data.expectedDurationMs }),
    });
    return finishMutation(valid.data, operations.get);
  } catch (error) {
    return mutationFailure(error);
  }
};

export const handleCreateSegmentFieldRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  operations: SegmentEditorOperations,
): Promise<ShowSegmentEditorResult> => {
  if (!senderIsTrusted)
    return errorResult(
      "IPC_UNTRUSTED_SENDER",
      "The field creation request did not come from Showflow.",
    );
  const valid = CreateSegmentFieldRequestSchema.safeParse(request);
  if (!valid.success)
    return errorResult(
      "IPC_INVALID_REQUEST",
      "Enter a field label and choose one of the supported field types.",
    );
  try {
    await operations.createField.execute({
      ...scope(valid.data),
      label: valid.data.label,
      type: valid.data.type,
    });
    return finishMutation(valid.data, operations.get);
  } catch (error) {
    return mutationFailure(error);
  }
};

export const handleUpdateSegmentFieldRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  operations: SegmentEditorOperations,
): Promise<ShowSegmentEditorResult> => {
  if (!senderIsTrusted)
    return errorResult(
      "IPC_UNTRUSTED_SENDER",
      "The field save request did not come from Showflow.",
    );
  const valid = UpdateSegmentFieldRequestSchema.safeParse(request);
  if (!valid.success)
    return errorResult(
      "IPC_INVALID_REQUEST",
      "Check this Segment field and try again.",
    );
  try {
    await operations.updateField.execute({
      ...scope(valid.data),
      fieldId: parseEntityId<"segmentDataField">(valid.data.fieldId),
      label: valid.data.label,
      required: valid.data.required,
      type: valid.data.type,
      ...(valid.data.defaultValue === null
        ? {}
        : { defaultValue: valid.data.defaultValue }),
      ...(valid.data.helpText === null
        ? {}
        : { helpText: valid.data.helpText }),
    });
    return finishMutation(valid.data, operations.get);
  } catch (error) {
    return mutationFailure(error);
  }
};

export const handleDeleteSegmentFieldRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  operations: SegmentEditorOperations,
): Promise<ShowSegmentEditorResult> => {
  if (!senderIsTrusted)
    return errorResult(
      "IPC_UNTRUSTED_SENDER",
      "The field deletion request did not come from Showflow.",
    );
  const valid = DeleteSegmentFieldRequestSchema.safeParse(request);
  if (!valid.success)
    return errorResult(
      "IPC_INVALID_REQUEST",
      "Showflow could not identify the Segment field to delete.",
    );
  try {
    await operations.deleteField.execute({
      ...scope(valid.data),
      fieldId: parseEntityId<"segmentDataField">(valid.data.fieldId),
    });
    return finishMutation(valid.data, operations.get);
  } catch (error) {
    return mutationFailure(error);
  }
};

const restoredField = (
  field: Omit<SegmentDataFieldDto, "episodeValueUsageCount">,
): SegmentDataField => ({
  id: parseEntityId<"segmentDataField">(field.id),
  showSegmentId: parseEntityId<"showSegment">(field.showSegmentId),
  key: field.key,
  label: field.label,
  type: field.type,
  required: field.required,
  ...(field.defaultValue === null ? {} : { defaultValue: field.defaultValue }),
  ...(field.helpText === null ? {} : { helpText: field.helpText }),
  position: field.position,
  createdAt: parseUtcTimestamp(field.createdAt),
  updatedAt: parseUtcTimestamp(field.updatedAt),
});

export const handleRestoreSegmentFieldRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  operations: SegmentEditorOperations,
): Promise<ShowSegmentEditorResult> => {
  if (!senderIsTrusted)
    return errorResult(
      "IPC_UNTRUSTED_SENDER",
      "The field restore request did not come from Showflow.",
    );
  const valid = RestoreSegmentFieldRequestSchema.safeParse(request);
  if (!valid.success)
    return errorResult(
      "IPC_INVALID_REQUEST",
      "Showflow could not restore that Segment field.",
    );
  try {
    await operations.restoreField.execute({
      ...scope(valid.data),
      field: restoredField(valid.data.field),
    });
    return finishMutation(valid.data, operations.get);
  } catch (error) {
    return mutationFailure(error);
  }
};

export const handleReorderSegmentFieldsRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  operations: SegmentEditorOperations,
): Promise<ShowSegmentEditorResult> => {
  if (!senderIsTrusted)
    return errorResult(
      "IPC_UNTRUSTED_SENDER",
      "The field reorder request did not come from Showflow.",
    );
  const valid = ReorderSegmentFieldsRequestSchema.safeParse(request);
  if (!valid.success)
    return errorResult(
      "IPC_INVALID_REQUEST",
      "Choose every Segment field once when changing the field order.",
    );
  try {
    await operations.reorderFields.execute({
      ...scope(valid.data),
      orderedFieldIds: valid.data.orderedFieldIds.map((id) =>
        parseEntityId<"segmentDataField">(id),
      ),
    });
    return finishMutation(valid.data, operations.get);
  } catch (error) {
    return mutationFailure(error);
  }
};
