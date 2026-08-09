import {
  ApplicationError,
  type AssignComponentPlacementCommand,
  type ListComponentsQuery,
  type RemoveComponentPlacementCommand,
  type UpdateComponentPlacementCommand,
} from "@showflow/application";
import {
  AssignComponentRequestSchema,
  ComponentListResultSchema,
  LayoutResultSchema,
  ListComponentsRequestSchema,
  RemoveComponentPlacementRequestSchema,
  UpdateComponentPlacementRequestSchema,
  type ApiErrorCode,
  type ComponentListResult,
  type LayoutResult,
} from "@showflow/contracts";
import {
  parseEntityId,
  parseUtcTimestamp,
  type Binding,
  type Component,
} from "@showflow/domain";

import { layoutDto } from "./layout-handler.mjs";

export interface ComponentOperations {
  readonly assign: Pick<AssignComponentPlacementCommand, "execute">;
  readonly list: Pick<ListComponentsQuery, "execute">;
  readonly remove: Pick<RemoveComponentPlacementCommand, "execute">;
  readonly update: Pick<UpdateComponentPlacementCommand, "execute">;
}

const code = (error: unknown): ApiErrorCode =>
  error instanceof ApplicationError ? error.code : "INTERNAL_ERROR";
const layoutFailure = (
  errorCode: ApiErrorCode,
  message: string,
): LayoutResult =>
  LayoutResultSchema.parse({ ok: false, error: { code: errorCode, message } });
const componentDto = (component: Component) => ({
  id: component.id,
  showId: component.showId,
  name: component.name,
  type: component.type,
  propertySchema: component.propertySchema,
  defaultProperties: component.defaultProperties,
  defaultEnterAnimation: component.defaultEnterAnimation,
  defaultExitAnimation: component.defaultExitAnimation,
  supportedSlotRoles: component.supportedSlotRoles,
  archivedAt: component.archivedAt ?? null,
  createdAt: component.createdAt,
  updatedAt: component.updatedAt,
});

export const handleListComponentsRequest = async (
  request: unknown,
  trusted: boolean,
  operations: ComponentOperations,
): Promise<ComponentListResult> => {
  if (!trusted)
    return ComponentListResultSchema.parse({
      ok: false,
      error: {
        code: "IPC_UNTRUSTED_SENDER",
        message: "The Component request did not come from Showflow.",
      },
    });
  const parsed = ListComponentsRequestSchema.safeParse(request);
  if (!parsed.success)
    return ComponentListResultSchema.parse({
      ok: false,
      error: {
        code: "IPC_INVALID_REQUEST",
        message: "The Component Browser request was invalid.",
      },
    });
  try {
    const components = await operations.list.execute(
      parseEntityId<"studio">(parsed.data.studioId),
      parseEntityId<"show">(parsed.data.showId),
    );
    return ComponentListResultSchema.parse({
      ok: true,
      data: components.map(componentDto),
    });
  } catch (error) {
    return ComponentListResultSchema.parse({
      ok: false,
      error: {
        code: code(error),
        message: "Showflow could not load reusable Components.",
      },
    });
  }
};

export const handleAssignComponentRequest = async (
  request: unknown,
  trusted: boolean,
  operations: ComponentOperations,
): Promise<LayoutResult> => {
  if (!trusted)
    return layoutFailure(
      "IPC_UNTRUSTED_SENDER",
      "The Component request did not come from Showflow.",
    );
  const parsed = AssignComponentRequestSchema.safeParse(request);
  if (!parsed.success)
    return layoutFailure(
      "IPC_INVALID_REQUEST",
      "Choose a compatible Component and Slot.",
    );
  try {
    const layout = await operations.assign.execute({
      showId: parseEntityId<"show">(parsed.data.showId),
      layoutId: parseEntityId<"layout">(parsed.data.layoutId),
      slotId: parseEntityId<"slot">(parsed.data.slotId),
      expectedUpdatedAt: parseUtcTimestamp(parsed.data.expectedUpdatedAt),
      componentType: parsed.data.componentType,
    });
    return LayoutResultSchema.parse({ ok: true, data: layoutDto(layout) });
  } catch (error) {
    return layoutFailure(
      code(error),
      error instanceof ApplicationError
        ? error.message
        : "Showflow could not place that Component. Your Layout was not changed.",
    );
  }
};

export const handleUpdateComponentPlacementRequest = async (
  request: unknown,
  trusted: boolean,
  operations: ComponentOperations,
): Promise<LayoutResult> => {
  if (!trusted)
    return layoutFailure(
      "IPC_UNTRUSTED_SENDER",
      "The Placement request did not come from Showflow.",
    );
  const parsed = UpdateComponentPlacementRequestSchema.safeParse(request);
  if (!parsed.success)
    return layoutFailure(
      "IPC_INVALID_REQUEST",
      "Review the Component values and data sources.",
    );
  try {
    const bindings = Object.fromEntries(
      Object.entries(parsed.data.bindings).map(([key, binding]) => [
        key,
        binding.kind === "resource"
          ? {
              kind: binding.kind,
              resourceId: parseEntityId<"resource">(binding.resourceId),
            }
          : binding,
      ]),
    ) as Readonly<Record<string, Binding>>;
    const layout = await operations.update.execute({
      showId: parseEntityId<"show">(parsed.data.showId),
      layoutId: parseEntityId<"layout">(parsed.data.layoutId),
      placementId: parseEntityId<"componentPlacement">(parsed.data.placementId),
      expectedUpdatedAt: parseUtcTimestamp(parsed.data.expectedUpdatedAt),
      fixedProperties: parsed.data.fixedProperties,
      bindings,
      visibleByDefault: parsed.data.visibleByDefault,
    });
    return LayoutResultSchema.parse({ ok: true, data: layoutDto(layout) });
  } catch (error) {
    return layoutFailure(
      code(error),
      error instanceof ApplicationError
        ? error.message
        : "Showflow could not update the Placement.",
    );
  }
};

export const handleRemoveComponentPlacementRequest = async (
  request: unknown,
  trusted: boolean,
  operations: ComponentOperations,
): Promise<LayoutResult> => {
  if (!trusted)
    return layoutFailure(
      "IPC_UNTRUSTED_SENDER",
      "The Placement request did not come from Showflow.",
    );
  const parsed = RemoveComponentPlacementRequestSchema.safeParse(request);
  if (!parsed.success)
    return layoutFailure(
      "IPC_INVALID_REQUEST",
      "The Placement removal request was invalid.",
    );
  try {
    const layout = await operations.remove.execute({
      showId: parseEntityId<"show">(parsed.data.showId),
      layoutId: parseEntityId<"layout">(parsed.data.layoutId),
      placementId: parseEntityId<"componentPlacement">(parsed.data.placementId),
      expectedUpdatedAt: parseUtcTimestamp(parsed.data.expectedUpdatedAt),
    });
    return LayoutResultSchema.parse({ ok: true, data: layoutDto(layout) });
  } catch (error) {
    return layoutFailure(
      code(error),
      "Showflow could not remove that Component Placement.",
    );
  }
};
