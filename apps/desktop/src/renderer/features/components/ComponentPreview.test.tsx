import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import type {
  ComponentDto,
  ComponentPlacementDto,
  LayoutDto,
  ResourceDto,
  ShowflowDesktopApi,
} from "@showflow/contracts";

import {
  createMockDesktopApi,
  DEFAULT_STUDIO_ID,
} from "../../../../../../tests/support/mock-desktop-api";
import { ComponentPreview } from "./ComponentPreview";

const timestamp = "2026-08-08T12:00:00.000Z";
const showId = "01942c1f-ae8f-7e42-b911-000000000201";
const layoutId = "01942c1f-ae8f-7e42-b911-000000000202";
const slotId = "01942c1f-ae8f-7e42-b911-000000000203";
const componentId = "01942c1f-ae8f-7e42-b911-000000000204";
const placementId = "01942c1f-ae8f-7e42-b911-000000000205";
const imageResourceId = "01942c1f-ae8f-7e42-b911-000000000208";
const cameraResourceId = "01942c1f-ae8f-7e42-b911-000000000209";

const installDesktopApi = (api: ShowflowDesktopApi): void => {
  Object.defineProperty(window, "showflow", {
    configurable: true,
    value: api,
  });
};

const component: ComponentDto = {
  id: componentId,
  showId,
  name: "Lower Third",
  type: "lowerThird",
  propertySchema: [
    {
      key: "title",
      label: "Title text",
      type: "string",
      required: true,
      defaultValue: "Guest name",
    },
    {
      key: "subtitle",
      label: "Subtitle text",
      type: "string",
      required: false,
      defaultValue: "Role or topic",
    },
  ],
  defaultProperties: {},
  defaultEnterAnimation: {
    preset: "slideUp",
    durationMs: 220,
    delayMs: 0,
    easing: "ease-out",
  },
  defaultExitAnimation: {
    preset: "slideDown",
    durationMs: 180,
    delayMs: 0,
    easing: "ease-in",
  },
  supportedSlotRoles: ["lowerThird"],
  archivedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const placement: ComponentPlacementDto = {
  id: placementId,
  layoutId,
  componentId,
  slotId,
  fixedProperties: {},
  bindings: {
    title: { kind: "segmentField", fieldKey: "guestName" },
    subtitle: { kind: "episodeMetadata", field: "subtitle" },
  },
  visibleByDefault: true,
  layerOverride: null,
  enterAnimationOverride: null,
  exitAnimationOverride: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const layout: LayoutDto = {
  id: layoutId,
  showId,
  name: "Interview",
  aspectRatio: "16:9",
  canvas: { width: 1920, height: 1080 },
  slots: [
    {
      id: slotId,
      layoutId,
      name: "Lower third",
      role: "lowerThird",
      bounds: { x: 0.08, y: 0.72, width: 0.52, height: 0.18 },
      alignment: "stretch",
      safeMargins: { top: 0, right: 0, bottom: 0, left: 0 },
      layerOrder: 2,
      clipContent: true,
      allowedComponentTypes: ["lowerThird"],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  componentPlacements: [placement],
  archivedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};

describe("ComponentPreview", () => {
  test("12.6 resolves a Placement override and exposes deterministic animation timing", () => {
    const { container } = render(
      <ComponentPreview
        animationPhase="enter"
        components={[component]}
        layout={{
          ...layout,
          componentPlacements: [
            {
              ...placement,
              enterAnimationOverride: {
                delayMs: 40,
                durationMs: 260,
                easing: "ease-in-out",
                preset: "wipe",
              },
            },
          ],
        }}
        resources={[]}
      />,
    );

    const renderedPlacement = container.querySelector(
      "[data-animation-preset]",
    );
    expect(renderedPlacement).toHaveAttribute("data-animation-preset", "wipe");
    expect(renderedPlacement).toHaveStyle({
      "--sf-preview-animation-delay": "40ms",
      "--sf-preview-animation-duration": "260ms",
      "--sf-preview-animation-easing": "ease-in-out",
    });
  });

  test("11.T10 renders a restrained Lower Third from resolved Segment and Episode content", () => {
    render(
      <ComponentPreview
        components={[component]}
        episodeMetadata={{ subtitle: "Grammy-winning artist" }}
        layout={layout}
        resources={[]}
        segmentFields={[
          {
            id: "01942c1f-ae8f-7e42-b911-000000000206",
            showSegmentId: "01942c1f-ae8f-7e42-b911-000000000207",
            key: "guestName",
            label: "Guest name",
            type: "shortText",
            required: true,
            defaultValue: null,
            helpText: null,
            position: 0,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ]}
        segmentValues={{ guestName: "SZA" }}
      />,
    );

    expect(screen.getByText("SZA")).toBeVisible();
    expect(screen.getByText("Grammy-winning artist")).toBeVisible();
    expect(
      screen.getByText("SZA").closest("[data-component-type]"),
    ).toHaveAttribute("data-component-type", "lowerThird");
  });

  test("11.T10 renders the Lower Third optional image and restrained style preset", async () => {
    const baseApi = createMockDesktopApi();
    installDesktopApi(
      Object.freeze({
        ...baseApi,
        resources: Object.freeze({
          ...baseApi.resources,
          getUrl: async () => ({
            ok: true as const,
            data: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
          }),
        }),
      }) satisfies ShowflowDesktopApi,
    );
    const lowerThird: ComponentDto = {
      ...component,
      propertySchema: [
        ...component.propertySchema,
        {
          key: "image",
          label: "Optional image or logo",
          type: "imageResource",
          required: false,
        },
        {
          key: "stylePreset",
          label: "Style preset",
          type: "string",
          required: true,
          defaultValue: "quietGold",
        },
      ],
    };
    const resource: ResourceDto = {
      availability: "available",
      category: "image",
      contentHash: "image-hash",
      deviceState: null,
      createdAt: timestamp,
      dimensions: { height: 800, width: 800 },
      displayName: "Guest portrait",
      durationMs: null,
      fileSizeBytes: 2048,
      id: imageResourceId,
      mimeType: "image/png",
      originalFilename: "guest.png",
      owner: { scope: "show", showId },
      sourceModifiedAt: timestamp,
      thumbnailCacheKey: "guest-thumbnail",
      updatedAt: timestamp,
      usage: [],
    };

    render(
      <ComponentPreview
        components={[lowerThird]}
        layout={{
          ...layout,
          componentPlacements: [
            {
              ...placement,
              bindings: {
                ...placement.bindings,
                image: { kind: "resource", resourceId: imageResourceId },
                stylePreset: { kind: "literal", value: "neutralPanel" },
              },
            },
          ],
        }}
        resources={[resource]}
        studioId={DEFAULT_STUDIO_ID}
      />,
    );

    expect(
      (await screen.findByRole("img", { name: "Guest portrait" })).getAttribute(
        "src",
      ),
    ).toMatch(/^data:image\/gif;base64,/u);
    expect(
      screen.getByText("Guest name").parentElement?.parentElement,
    ).toHaveAttribute("data-style-preset", "neutralPanel");
  });

  test("11.T11 shows a disconnected logical camera in production language", () => {
    const cameraComponent: ComponentDto = {
      ...component,
      id: "01942c1f-ae8f-7e42-b911-000000000210",
      name: "Camera",
      type: "camera",
      propertySchema: [
        {
          key: "camera",
          label: "Camera",
          type: "cameraResource",
          required: true,
        },
      ],
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
      supportedSlotRoles: ["hostCamera"],
    };
    const camera: ResourceDto = {
      availability: "available",
      category: "cameraInput",
      contentHash: null,
      deviceState: "disconnected",
      createdAt: timestamp,
      dimensions: null,
      displayName: "Studio camera",
      durationMs: null,
      fileSizeBytes: null,
      id: cameraResourceId,
      mimeType: "video/x-showflow-camera",
      originalFilename: null,
      owner: { scope: "show", showId },
      sourceModifiedAt: null,
      thumbnailCacheKey: null,
      updatedAt: timestamp,
      usage: [],
    };
    const originalSlot = layout.slots[0];
    if (originalSlot === undefined) throw new Error("Expected a preview Slot.");
    const cameraSlot = {
      ...originalSlot,
      role: "hostCamera" as const,
      allowedComponentTypes: ["camera" as const],
    };

    render(
      <ComponentPreview
        components={[cameraComponent]}
        layout={{
          ...layout,
          slots: [cameraSlot],
          componentPlacements: [
            {
              ...placement,
              componentId: cameraComponent.id,
              bindings: {
                camera: {
                  kind: "resource",
                  resourceId: cameraResourceId,
                },
              },
            },
          ],
        }}
        resources={[camera]}
      />,
    );

    expect(screen.getByText("Studio camera")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Disconnected");
  });
});
