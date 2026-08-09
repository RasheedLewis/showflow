import type {
  Component,
  ComponentPlacement,
  ComponentPropertyDefinition,
} from "./component.mjs";
import type { Binding } from "./composition.mjs";
import type { JsonObject, JsonValue } from "./core.mjs";
import type { Resource, ResourceCategory } from "./resource.mjs";
import type { SegmentDataField } from "./segment.mjs";

export type BindingResolutionCode =
  | "BINDING_SOURCE_MISSING"
  | "BINDING_SOURCE_INVALID"
  | "RESOURCE_MISSING"
  | "RESOURCE_WRONG_TYPE"
  | "CAMERA_PERMISSION_REQUIRED"
  | "CAMERA_UNAVAILABLE"
  | "CAMERA_DISCONNECTED";

export type ResolvedProperty =
  | { readonly status: "resolved"; readonly value: JsonValue }
  | {
      readonly status: "missing";
      readonly code: BindingResolutionCode;
      readonly reason: string;
    }
  | {
      readonly status: "invalid";
      readonly code: BindingResolutionCode;
      readonly reason: string;
    };

export interface BindingResolutionContext {
  readonly showMetadata: JsonObject;
  readonly episodeMetadata: JsonObject;
  readonly segmentValues: JsonObject;
  readonly segmentFields: readonly SegmentDataField[];
  readonly resources: readonly Resource[];
  readonly resourceReplacements?: Readonly<Record<string, Resource["id"]>>;
}

const expectedResourceCategory = (
  property: ComponentPropertyDefinition,
): ResourceCategory | undefined => {
  switch (property.type) {
    case "cameraResource":
      return "cameraInput";
    case "imageResource":
      return "image";
    case "videoResource":
      return "video";
    case "audioResource":
      return "audio";
    case "string":
    case "number":
    case "boolean":
      return undefined;
  }
};

const isPropertyValueValid = (
  property: ComponentPropertyDefinition,
  value: JsonValue,
): boolean => {
  switch (property.type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "cameraResource":
    case "imageResource":
    case "videoResource":
    case "audioResource":
      return typeof value === "string";
  }
};

const missing = (reason: string): ResolvedProperty => ({
  status: "missing",
  code: "BINDING_SOURCE_MISSING",
  reason,
});

const resolveResource = (
  resourceId: string,
  property: ComponentPropertyDefinition,
  context: BindingResolutionContext,
): ResolvedProperty => {
  const replacement = context.resourceReplacements?.[property.key];
  const selectedId = replacement ?? resourceId;
  const resource = context.resources.find(({ id }) => id === selectedId);
  if (resource === undefined || resource.availability === "missing") {
    return {
      status: "missing",
      code: "RESOURCE_MISSING",
      reason: `Choose an available ${property.label} Resource.`,
    };
  }
  const category = expectedResourceCategory(property);
  if (category === undefined || resource.category !== category) {
    return {
      status: "invalid",
      code: "RESOURCE_WRONG_TYPE",
      reason: `The selected Resource cannot be used for ${property.label}.`,
    };
  }
  if (resource.category === "cameraInput") {
    const state =
      resource.deviceState ??
      (resource.availability === "available" ? "available" : "unavailable");
    if (state !== "available") {
      const labels = {
        permissionRequired: {
          code: "CAMERA_PERMISSION_REQUIRED" as const,
          reason: `${resource.displayName} needs camera permission before preview.`,
        },
        unavailable: {
          code: "CAMERA_UNAVAILABLE" as const,
          reason: `${resource.displayName} is unavailable. Choose another camera.`,
        },
        disconnected: {
          code: "CAMERA_DISCONNECTED" as const,
          reason: `${resource.displayName} is disconnected. Reconnect it or choose another camera.`,
        },
      };
      const issue = labels[state];
      return { status: "invalid", ...issue };
    }
  } else if (resource.availability !== "available") {
    return {
      status: "invalid",
      code: "RESOURCE_MISSING",
      reason: `${resource.displayName} is not available for preview.`,
    };
  }
  return { status: "resolved", value: resource.id };
};

export const resolveBinding = (
  property: ComponentPropertyDefinition,
  binding: Binding | undefined,
  context: BindingResolutionContext,
): ResolvedProperty => {
  if (binding === undefined) {
    return property.defaultValue === undefined
      ? missing(`${property.label} has no value or data source.`)
      : { status: "resolved", value: property.defaultValue };
  }
  if (binding.kind === "resource") {
    return resolveResource(binding.resourceId, property, context);
  }
  let value: JsonValue | undefined;
  switch (binding.kind) {
    case "literal":
      value = binding.value;
      break;
    case "segmentField": {
      const field = context.segmentFields.find(
        ({ key }) => key === binding.fieldKey,
      );
      if (field === undefined)
        return missing(
          `The Segment field used by ${property.label} no longer exists.`,
        );
      value = context.segmentValues[binding.fieldKey] ?? field.defaultValue;
      break;
    }
    case "episodeMetadata":
      value = context.episodeMetadata[binding.field];
      break;
    case "showMetadata":
      value = context.showMetadata[binding.field];
      break;
  }
  if (value === undefined || value === null || value === "") {
    return missing(`${property.label} needs content before preview.`);
  }
  if (!isPropertyValueValid(property, value)) {
    return {
      status: "invalid",
      code: "BINDING_SOURCE_INVALID",
      reason: `${property.label} does not match the Component property type.`,
    };
  }
  return { status: "resolved", value };
};

export type ResolvedComponentProperties = Readonly<
  Record<string, ResolvedProperty>
>;

export const resolveComponentPlacement = (
  component: Component,
  placement: ComponentPlacement,
  context: BindingResolutionContext,
): ResolvedComponentProperties =>
  Object.fromEntries(
    component.propertySchema.map((property) => {
      const fixed = placement.fixedProperties[property.key];
      const binding =
        placement.bindings[property.key] ??
        (fixed === undefined
          ? undefined
          : ({ kind: "literal", value: fixed } as const));
      return [property.key, resolveBinding(property, binding, context)];
    }),
  );

export interface ComponentPlacementIssue {
  readonly code:
    BindingResolutionCode | "COMPONENT_SLOT_INCOMPATIBLE" | "PROPERTY_REQUIRED";
  readonly propertyKey?: string;
  readonly message: string;
}

export const validateResolvedComponentPlacement = (
  component: Component,
  placement: ComponentPlacement,
  context: BindingResolutionContext,
): readonly ComponentPlacementIssue[] => {
  const resolved = resolveComponentPlacement(component, placement, context);
  return component.propertySchema.flatMap((property) => {
    const result = resolved[property.key];
    if (result === undefined || result.status === "resolved") return [];
    if (!property.required && result.status === "missing") return [];
    return [
      {
        code: result.code,
        propertyKey: property.key,
        message: result.reason,
      },
    ];
  });
};
