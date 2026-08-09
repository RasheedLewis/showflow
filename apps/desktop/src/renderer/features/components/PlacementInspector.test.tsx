import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import type {
  ComponentDto,
  ComponentPlacementDto,
  ResourceDto,
} from "@showflow/contracts";

import { PlacementInspector } from "./PlacementInspector";

const timestamp = "2026-08-08T12:00:00.000Z";
const showId = "01942c1f-ae8f-7e42-b911-000000000301";
const layoutId = "01942c1f-ae8f-7e42-b911-000000000302";
const slotId = "01942c1f-ae8f-7e42-b911-000000000303";
const componentId = "01942c1f-ae8f-7e42-b911-000000000304";
const placementId = "01942c1f-ae8f-7e42-b911-000000000305";
const studioId = "01942c1f-ae8f-7e42-b911-000000000306";
const firstCameraId = "01942c1f-ae8f-7e42-b911-000000000307";
const secondCameraId = "01942c1f-ae8f-7e42-b911-000000000308";

const placement: ComponentPlacementDto = {
  id: placementId,
  layoutId,
  componentId,
  slotId,
  fixedProperties: {},
  bindings: {},
  visibleByDefault: true,
  layerOverride: null,
  enterAnimationOverride: null,
  exitAnimationOverride: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const component = (
  type: ComponentDto["type"],
  propertySchema: ComponentDto["propertySchema"],
): ComponentDto => ({
  id: componentId,
  showId,
  name: type === "camera" ? "Camera" : "Lower Third",
  type,
  propertySchema,
  defaultProperties: {},
  defaultEnterAnimation: {
    preset: "none",
    durationMs: 0,
    delayMs: 0,
    easing: "linear",
  },
  defaultExitAnimation: {
    preset: "none",
    durationMs: 0,
    delayMs: 0,
    easing: "linear",
  },
  supportedSlotRoles: type === "camera" ? ["hostCamera"] : ["lowerThird"],
  archivedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
});

const camera = (
  id: string,
  displayName: string,
  deviceState: NonNullable<ResourceDto["deviceState"]>,
): ResourceDto => ({
  availability: "available",
  category: "cameraInput",
  contentHash: null,
  deviceState,
  createdAt: timestamp,
  dimensions: null,
  displayName,
  durationMs: null,
  fileSizeBytes: null,
  id,
  mimeType: "video/x-showflow-camera",
  originalFilename: null,
  owner: { scope: "show", showId },
  sourceModifiedAt: null,
  thumbnailCacheKey: null,
  updatedAt: timestamp,
  usage: [],
});

describe("PlacementInspector", () => {
  test("11.T11 lists logical cameras with their current device states", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <PlacementInspector
        component={component("camera", [
          {
            key: "camera",
            label: "Camera",
            type: "cameraResource",
            required: true,
          },
        ])}
        onRemove={vi.fn().mockResolvedValue(undefined)}
        onSave={onSave}
        placement={placement}
        resourceContext={{ scope: "show", studioId, showId }}
        resources={[
          camera(firstCameraId, "Main host camera", "available"),
          camera(secondCameraId, "Backup camera", "permissionRequired"),
        ]}
      />,
    );

    const picker = screen.getByRole("combobox", { name: "Camera device" });
    expect(picker).toHaveTextContent("Main host camera — available");
    expect(picker).toHaveTextContent("Backup camera — permission required");
    fireEvent.change(picker, { target: { value: secondCameraId } });

    expect(onSave).toHaveBeenCalledWith(
      {
        camera: { kind: "resource", resourceId: secondCameraId },
      },
      true,
    );
  });

  test("11.T10 constrains Lower Third styling to approved presets", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <PlacementInspector
        component={component("lowerThird", [
          {
            key: "stylePreset",
            label: "Style preset",
            type: "string",
            required: true,
            defaultValue: "quietGold",
          },
        ])}
        onRemove={vi.fn().mockResolvedValue(undefined)}
        onSave={onSave}
        placement={placement}
        resourceContext={{ scope: "show", studioId, showId }}
        resources={[]}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Style preset" }), {
      target: { value: "highContrast" },
    });

    expect(onSave).toHaveBeenCalledWith(
      { stylePreset: { kind: "literal", value: "highContrast" } },
      true,
    );
  });
});
