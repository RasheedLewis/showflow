import { describe, expect, test } from "vitest";

import {
  assertComponentSlotCompatibility,
  BUILT_IN_COMPONENT_REGISTRY,
  BUILT_IN_COMPONENT_TYPES,
  createBuiltInComponent,
  createFixedClock,
  createResource,
  parseEntityId,
  parseUtcTimestamp,
  resolveBinding,
  resolveComponentPlacement,
  validateResolvedComponentPlacement,
  type BindingResolutionContext,
  type ComponentPlacement,
  type DomainFactoryDependencies,
  type EntityId,
  type EntityIdKind,
  type SegmentDataField,
  type Slot,
} from "../index.js";

let suffix = 1;
const dependencies: DomainFactoryDependencies = {
  clock: createFixedClock(parseUtcTimestamp("2026-08-08T12:00:00.000Z")),
  createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
    parseEntityId<TEntity>(
      `01942c1f-ae8f-7e42-b911-${(suffix++).toString(16).padStart(12, "0")}`,
    ),
};
const showId = parseEntityId<"show">("01942c1f-ae8f-7e42-b911-000000000100");
const layoutId = parseEntityId<"layout">(
  "01942c1f-ae8f-7e42-b911-000000000101",
);
const segmentId = parseEntityId<"showSegment">(
  "01942c1f-ae8f-7e42-b911-000000000102",
);
const metadata = {
  createdAt: parseUtcTimestamp("2026-08-08T12:00:00.000Z"),
  updatedAt: parseUtcTimestamp("2026-08-08T12:00:00.000Z"),
};
const titleField: SegmentDataField = {
  id: parseEntityId<"segmentDataField">("01942c1f-ae8f-7e42-b911-000000000103"),
  showSegmentId: segmentId,
  key: "lowerThirdTitle",
  label: "Lower Third Title",
  type: "shortText",
  required: true,
  position: 0,
  ...metadata,
};
const context = (
  resources: BindingResolutionContext["resources"] = [],
): BindingResolutionContext => ({
  showMetadata: { name: "Public Sphere" },
  episodeMetadata: { title: "Week 32" },
  segmentValues: { lowerThirdTitle: "SZA" },
  segmentFields: [titleField],
  resources,
});

const slot = (
  role: Slot["role"],
  allowed: Slot["allowedComponentTypes"],
): Slot => ({
  id: dependencies.createId("slot"),
  layoutId,
  name: "Test Slot",
  role,
  bounds: { x: 0, y: 0, width: 1, height: 1 },
  alignment: "stretch",
  safeMargins: { top: 0, right: 0, bottom: 0, left: 0 },
  layerOrder: 0,
  clipContent: true,
  allowedComponentTypes: allowed,
  ...metadata,
});

describe("Sprint 11 Component registry and binding resolution", () => {
  test("11.T1 every MVP Component has a schema, renderer, Slot roles, and defaults", () => {
    expect(BUILT_IN_COMPONENT_TYPES).toEqual([
      "camera",
      "video",
      "image",
      "text",
      "background",
      "logo",
      "lowerThird",
    ]);
    for (const type of BUILT_IN_COMPONENT_TYPES) {
      const definition = BUILT_IN_COMPONENT_REGISTRY[type];
      expect(definition.renderer).toBe(type);
      expect(definition.propertySchema.length).toBeGreaterThan(0);
      expect(definition.supportedSlotRoles.length).toBeGreaterThan(0);
      expect(definition.defaultEnterAnimation.preset).toBeTruthy();
      expect(definition.defaultExitAnimation.preset).toBeTruthy();
      const entity = createBuiltInComponent(showId, type, dependencies);
      expect(entity.type).toBe(type);
      expect(entity.defaultProperties).toEqual(definition.defaults);
    }
  });

  test("11.T2 rejects an incompatible Component and Slot", () => {
    const camera = createBuiltInComponent(showId, "camera", dependencies);
    expect(() =>
      assertComponentSlotCompatibility(camera, slot("logo", ["logo"])),
    ).toThrow(/not compatible/u);
  });

  test("11.T3 resolves a literal", () => {
    const result = resolveBinding(
      { key: "text", label: "Text", type: "string", required: true },
      { kind: "literal", value: "Welcome" },
      context(),
    );
    expect(result).toEqual({ status: "resolved", value: "Welcome" });
  });

  test("11.T4 resolves a compatible Resource and rejects the wrong type", () => {
    const image = createResource(
      {
        owner: { scope: "show", showId },
        displayName: "Show logo",
        category: "image",
        mimeType: "image/png",
      },
      dependencies,
    );
    const property = {
      key: "image",
      label: "Logo image",
      type: "imageResource" as const,
      required: true,
    };
    expect(
      resolveBinding(
        property,
        { kind: "resource", resourceId: image.id },
        context([image]),
      ),
    ).toEqual({ status: "resolved", value: image.id });
    expect(
      resolveBinding(
        { ...property, type: "videoResource" },
        { kind: "resource", resourceId: image.id },
        context([image]),
      ),
    ).toMatchObject({ status: "invalid", code: "RESOURCE_WRONG_TYPE" });
  });

  test("11.T5 resolves an Episode Segment value", () => {
    expect(
      resolveBinding(
        { key: "title", label: "Title text", type: "string", required: true },
        { kind: "segmentField", fieldKey: "lowerThirdTitle" },
        context(),
      ),
    ).toEqual({ status: "resolved", value: "SZA" });
  });

  test("11.T6 resolves Show and Episode metadata", () => {
    const property = {
      key: "text",
      label: "Text",
      type: "string" as const,
      required: true,
    };
    expect(
      resolveBinding(
        property,
        { kind: "showMetadata", field: "name" },
        context(),
      ),
    ).toEqual({ status: "resolved", value: "Public Sphere" });
    expect(
      resolveBinding(
        property,
        { kind: "episodeMetadata", field: "title" },
        context(),
      ),
    ).toEqual({ status: "resolved", value: "Week 32" });
  });

  test("11.T7 returns a structured missing result", () => {
    expect(
      resolveBinding(
        { key: "text", label: "Text", type: "string", required: true },
        { kind: "segmentField", fieldKey: "missingField" },
        context(),
      ),
    ).toMatchObject({ status: "missing", code: "BINDING_SOURCE_MISSING" });
  });

  test("11.T8 and 11.T9 share deterministic resolution and fixed Resource reuse", () => {
    const logo = createBuiltInComponent(showId, "logo", dependencies);
    const image = createResource(
      {
        owner: { scope: "show", showId },
        displayName: "Show logo",
        category: "image",
        mimeType: "image/png",
      },
      dependencies,
    );
    const placement: ComponentPlacement = {
      id: dependencies.createId("componentPlacement"),
      layoutId,
      componentId: logo.id,
      slotId: dependencies.createId("slot"),
      fixedProperties: {},
      bindings: { image: { kind: "resource", resourceId: image.id } },
      visibleByDefault: true,
      ...metadata,
    };
    const first = resolveComponentPlacement(logo, placement, context([image]));
    const second = resolveComponentPlacement(logo, placement, {
      ...context([image]),
      segmentValues: { lowerThirdTitle: "Another Segment" },
    });
    expect(first).toEqual(second);
    expect(first["image"]).toEqual({ status: "resolved", value: image.id });
    expect(
      validateResolvedComponentPlacement(logo, placement, context([image])),
    ).toEqual([]);
  });

  test("11.T11 reports every unavailable logical camera state in production language", () => {
    const camera = createResource(
      {
        owner: { scope: "show", showId },
        displayName: "Main Host Camera",
        category: "cameraInput",
        mimeType: "application/x-showflow-camera",
        deviceState: "disconnected",
      },
      dependencies,
    );
    expect(
      resolveBinding(
        {
          key: "camera",
          label: "Camera",
          type: "cameraResource",
          required: true,
        },
        { kind: "resource", resourceId: camera.id },
        context([camera]),
      ),
    ).toMatchObject({
      status: "invalid",
      code: "CAMERA_DISCONNECTED",
      reason: expect.stringMatching(/disconnected/u),
    });
  });
});
