import {
  ApplicationError,
  type AddSegmentToBlueprintCommand,
  type ArchiveShowSegmentCommand,
  type CreateShowSegmentCommand,
  type CreateShowSegmentInBlueprintCommand,
  type DuplicateBlueprintPlacementCommand,
  type GetShowDesignQuery,
  type RemoveBlueprintPlacementCommand,
  type ReorderBlueprintPlacementsCommand,
} from "@showflow/application";
import {
  AddBlueprintSegmentRequestSchema,
  ArchiveSegmentRequestSchema,
  BlueprintPlacementMutationRequestSchema,
  CreateSegmentRequestSchema,
  ReorderBlueprintRequestSchema,
  type ApiErrorCode,
  type ShowDesignResult,
} from "@showflow/contracts";
import { parseEntityId } from "@showflow/domain";

import {
  showDesignErrorResult,
  showDesignSuccessResult,
} from "./show-handler.mjs";

export interface DesignShowOperations {
  readonly addSegment: Pick<AddSegmentToBlueprintCommand, "execute">;
  readonly archiveSegment: Pick<ArchiveShowSegmentCommand, "execute">;
  readonly createSegment: Pick<CreateShowSegmentCommand, "execute">;
  readonly createSegmentInBlueprint: Pick<
    CreateShowSegmentInBlueprintCommand,
    "execute"
  >;
  readonly duplicatePlacement: Pick<
    DuplicateBlueprintPlacementCommand,
    "execute"
  >;
  readonly getDesign: Pick<GetShowDesignQuery, "execute">;
  readonly removePlacement: Pick<RemoveBlueprintPlacementCommand, "execute">;
  readonly reorder: Pick<ReorderBlueprintPlacementsCommand, "execute">;
}

const applicationErrorCode = (error: unknown): ApiErrorCode =>
  error instanceof ApplicationError ? error.code : "INTERNAL_ERROR";

const reloadDesign = async (
  studioId: string,
  showId: string,
  query: DesignShowOperations["getDesign"],
): Promise<ShowDesignResult> => {
  const design = await query.execute(
    parseEntityId<"studio">(studioId),
    parseEntityId<"show">(showId),
  );
  return showDesignSuccessResult(
    design.show,
    design.blueprint,
    design.segments,
  );
};

const assertCurrentBlueprint = (
  design: ShowDesignResult,
  blueprintId: string,
): void => {
  if (!design.ok || design.data.blueprint.id !== blueprintId) {
    throw new ApplicationError("NOT_FOUND", "Show Blueprint was not found.");
  }
};

const mutationFailure = (error: unknown): ShowDesignResult =>
  showDesignErrorResult(
    applicationErrorCode(error),
    error instanceof ApplicationError && error.code === "NOT_FOUND"
      ? "This Show or Segment is no longer available. Refresh Design Show."
      : "Showflow could not save the Blueprint change. Your saved Storyboard was not changed. Try again.",
  );

export const handleCreateSegmentRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  operations: DesignShowOperations,
): Promise<ShowDesignResult> => {
  if (!senderIsTrusted) {
    return showDesignErrorResult(
      "IPC_UNTRUSTED_SENDER",
      "The Segment creation request did not come from Showflow.",
    );
  }
  const validRequest = CreateSegmentRequestSchema.safeParse(request);
  if (!validRequest.success) {
    return showDesignErrorResult(
      "IPC_INVALID_REQUEST",
      "Enter a Segment name between 1 and 200 characters.",
    );
  }
  try {
    const currentDesign = await reloadDesign(
      validRequest.data.studioId,
      validRequest.data.showId,
      operations.getDesign,
    );
    if (validRequest.data.blueprintId === undefined) {
      await operations.createSegment.execute({
        context: {
          scope: "show",
          showId: parseEntityId<"show">(validRequest.data.showId),
        },
        name: validRequest.data.name,
        ...(validRequest.data.description === undefined
          ? {}
          : { description: validRequest.data.description }),
      });
    } else {
      assertCurrentBlueprint(currentDesign, validRequest.data.blueprintId);
      await operations.createSegmentInBlueprint.execute({
        showId: parseEntityId<"show">(validRequest.data.showId),
        blueprintId: parseEntityId<"showBlueprint">(
          validRequest.data.blueprintId,
        ),
        name: validRequest.data.name,
        ...(validRequest.data.description === undefined
          ? {}
          : { description: validRequest.data.description }),
        ...(validRequest.data.position === undefined
          ? {}
          : { position: validRequest.data.position }),
      });
    }
    return reloadDesign(
      validRequest.data.studioId,
      validRequest.data.showId,
      operations.getDesign,
    );
  } catch (error) {
    return mutationFailure(error);
  }
};

export const handleArchiveSegmentRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  operations: DesignShowOperations,
): Promise<ShowDesignResult> => {
  if (!senderIsTrusted) {
    return showDesignErrorResult(
      "IPC_UNTRUSTED_SENDER",
      "The Segment archive request did not come from Showflow.",
    );
  }
  const validRequest = ArchiveSegmentRequestSchema.safeParse(request);
  if (!validRequest.success) {
    return showDesignErrorResult(
      "IPC_INVALID_REQUEST",
      "The Segment archive request was invalid.",
    );
  }
  try {
    await reloadDesign(
      validRequest.data.studioId,
      validRequest.data.showId,
      operations.getDesign,
    );
    await operations.archiveSegment.execute({
      showId: parseEntityId<"show">(validRequest.data.showId),
      showSegmentId: parseEntityId<"showSegment">(
        validRequest.data.showSegmentId,
      ),
    });
    return reloadDesign(
      validRequest.data.studioId,
      validRequest.data.showId,
      operations.getDesign,
    );
  } catch (error) {
    return mutationFailure(error);
  }
};

export const handleAddBlueprintSegmentRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  operations: DesignShowOperations,
): Promise<ShowDesignResult> => {
  if (!senderIsTrusted) {
    return showDesignErrorResult(
      "IPC_UNTRUSTED_SENDER",
      "The Add Segment request did not come from Showflow.",
    );
  }
  const validRequest = AddBlueprintSegmentRequestSchema.safeParse(request);
  if (!validRequest.success) {
    return showDesignErrorResult(
      "IPC_INVALID_REQUEST",
      "The Add Segment request was invalid.",
    );
  }
  try {
    const currentDesign = await reloadDesign(
      validRequest.data.studioId,
      validRequest.data.showId,
      operations.getDesign,
    );
    assertCurrentBlueprint(currentDesign, validRequest.data.blueprintId);
    await operations.addSegment.execute({
      blueprintId: parseEntityId<"showBlueprint">(
        validRequest.data.blueprintId,
      ),
      showSegmentId: parseEntityId<"showSegment">(
        validRequest.data.showSegmentId,
      ),
      ...(validRequest.data.position === undefined
        ? {}
        : { position: validRequest.data.position }),
    });
    return reloadDesign(
      validRequest.data.studioId,
      validRequest.data.showId,
      operations.getDesign,
    );
  } catch (error) {
    return mutationFailure(error);
  }
};

export const handleReorderBlueprintRequest = async (
  request: unknown,
  senderIsTrusted: boolean,
  operations: DesignShowOperations,
): Promise<ShowDesignResult> => {
  if (!senderIsTrusted) {
    return showDesignErrorResult(
      "IPC_UNTRUSTED_SENDER",
      "The Blueprint reorder request did not come from Showflow.",
    );
  }
  const validRequest = ReorderBlueprintRequestSchema.safeParse(request);
  if (!validRequest.success) {
    return showDesignErrorResult(
      "IPC_INVALID_REQUEST",
      "The Blueprint reorder request was invalid.",
    );
  }
  try {
    const currentDesign = await reloadDesign(
      validRequest.data.studioId,
      validRequest.data.showId,
      operations.getDesign,
    );
    assertCurrentBlueprint(currentDesign, validRequest.data.blueprintId);
    await operations.reorder.execute({
      blueprintId: parseEntityId<"showBlueprint">(
        validRequest.data.blueprintId,
      ),
      orderedPlacementIds: validRequest.data.orderedPlacementIds.map((id) =>
        parseEntityId<"blueprintSegmentPlacement">(id),
      ),
    });
    return reloadDesign(
      validRequest.data.studioId,
      validRequest.data.showId,
      operations.getDesign,
    );
  } catch (error) {
    return mutationFailure(error);
  }
};

const handlePlacementMutation = async (
  request: unknown,
  senderIsTrusted: boolean,
  operations: DesignShowOperations,
  action: "duplicate" | "remove",
): Promise<ShowDesignResult> => {
  if (!senderIsTrusted) {
    return showDesignErrorResult(
      "IPC_UNTRUSTED_SENDER",
      `The Blueprint ${action} request did not come from Showflow.`,
    );
  }
  const validRequest =
    BlueprintPlacementMutationRequestSchema.safeParse(request);
  if (!validRequest.success) {
    return showDesignErrorResult(
      "IPC_INVALID_REQUEST",
      `The Blueprint ${action} request was invalid.`,
    );
  }
  try {
    const currentDesign = await reloadDesign(
      validRequest.data.studioId,
      validRequest.data.showId,
      operations.getDesign,
    );
    assertCurrentBlueprint(currentDesign, validRequest.data.blueprintId);
    const input = {
      blueprintId: parseEntityId<"showBlueprint">(
        validRequest.data.blueprintId,
      ),
      placementId: parseEntityId<"blueprintSegmentPlacement">(
        validRequest.data.placementId,
      ),
    };
    if (action === "duplicate") {
      await operations.duplicatePlacement.execute(input);
    } else {
      await operations.removePlacement.execute(input);
    }
    return reloadDesign(
      validRequest.data.studioId,
      validRequest.data.showId,
      operations.getDesign,
    );
  } catch (error) {
    return mutationFailure(error);
  }
};

export const handleDuplicateBlueprintPlacementRequest = (
  request: unknown,
  senderIsTrusted: boolean,
  operations: DesignShowOperations,
): Promise<ShowDesignResult> =>
  handlePlacementMutation(request, senderIsTrusted, operations, "duplicate");

export const handleRemoveBlueprintPlacementRequest = (
  request: unknown,
  senderIsTrusted: boolean,
  operations: DesignShowOperations,
): Promise<ShowDesignResult> =>
  handlePlacementMutation(request, senderIsTrusted, operations, "remove");
