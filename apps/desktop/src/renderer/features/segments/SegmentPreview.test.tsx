import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type {
  ComponentDto,
  LayoutDto,
  ResourceDto,
  ShowflowDesktopApi,
  ShowSegmentEditorDto,
} from "@showflow/contracts";

import { createMockDesktopApi } from "../../../../../../tests/support/mock-desktop-api";
import { SegmentPreview } from "./SegmentPreview";

const timestamp = "2026-08-09T12:00:00.000Z";
const studioId = "01942c1f-ae8f-7e42-b911-000000000401";
const showId = "01942c1f-ae8f-7e42-b911-000000000402";
const segmentId = "01942c1f-ae8f-7e42-b911-000000000403";
const layoutId = "01942c1f-ae8f-7e42-b911-000000000404";
const slotId = "01942c1f-ae8f-7e42-b911-000000000405";
const componentId = "01942c1f-ae8f-7e42-b911-000000000406";
const placementId = "01942c1f-ae8f-7e42-b911-000000000407";
const resourceId = "01942c1f-ae8f-7e42-b911-000000000408";
const noAnimation = {
  delayMs: 0,
  durationMs: 0,
  easing: "linear",
  preset: "none" as const,
};

const component: ComponentDto = {
  archivedAt: null,
  createdAt: timestamp,
  defaultEnterAnimation: noAnimation,
  defaultExitAnimation: noAnimation,
  defaultProperties: {},
  id: componentId,
  name: "Headline",
  propertySchema: [
    {
      defaultValue: "On air",
      key: "text",
      label: "Text",
      required: true,
      type: "string",
    },
  ],
  showId,
  supportedSlotRoles: ["center"],
  type: "text",
  updatedAt: timestamp,
};

const layout: LayoutDto = {
  archivedAt: null,
  aspectRatio: "16:9",
  canvas: { height: 1080, width: 1920 },
  componentPlacements: [
    {
      bindings: { text: { kind: "literal", value: "Audience headline" } },
      componentId,
      createdAt: timestamp,
      enterAnimationOverride: null,
      exitAnimationOverride: null,
      fixedProperties: {},
      id: placementId,
      layerOverride: null,
      layoutId,
      slotId,
      updatedAt: timestamp,
      visibleByDefault: true,
    },
  ],
  createdAt: timestamp,
  id: layoutId,
  name: "Audience title",
  showId,
  slots: [
    {
      alignment: "stretch",
      allowedComponentTypes: ["text"],
      bounds: { height: 0.3, width: 0.7, x: 0.15, y: 0.35 },
      clipContent: true,
      createdAt: timestamp,
      id: slotId,
      layerOrder: 1,
      layoutId,
      name: "Title",
      role: "center",
      safeMargins: { bottom: 0, left: 0, right: 0, top: 0 },
      updatedAt: timestamp,
    },
  ],
  updatedAt: timestamp,
};

const editor = (
  enter: ShowSegmentEditorDto["lifecycle"]["enter"] = [],
  exit: ShowSegmentEditorDto["lifecycle"]["exit"] = [],
): ShowSegmentEditorDto => ({
  archivedAt: null,
  createdAt: timestamp,
  dataFields: [],
  description: null,
  expectedDurationMs: null,
  id: segmentId,
  lifecycle: {
    active: {
      availableLayoutIds: [layoutId],
      defaultLayoutId: layoutId,
      hostCueIds: [],
    },
    cleanup: [],
    enter,
    exit,
    prepare: [],
  },
  name: "Opening",
  notesTemplate: "",
  showId,
  updatedAt: timestamp,
  validationIssues: [],
});

const missingResource: ResourceDto = {
  availability: "missing",
  category: "audio",
  contentHash: "missing-audio",
  createdAt: timestamp,
  deviceState: null,
  dimensions: null,
  displayName: "Walk-on sting",
  durationMs: 5000,
  fileSizeBytes: 1024,
  id: resourceId,
  mimeType: "audio/mpeg",
  originalFilename: "walk-on.mp3",
  owner: { scope: "show", showId },
  sourceModifiedAt: timestamp,
  thumbnailCacheKey: null,
  updatedAt: timestamp,
  usage: [],
};

describe("SegmentPreview", () => {
  afterEach(() => vi.restoreAllMocks());

  test("12.T11 drives an individual Segment to audience-only Active output", async () => {
    render(
      <SegmentPreview
        components={[component]}
        editor={editor()}
        layouts={[layout]}
        onClose={() => undefined}
        resources={[]}
        showName="Late Night"
        studioId={studioId}
      />,
    );

    expect(screen.getByLabelText("Audience output")).not.toHaveTextContent(
      "Audience headline",
    );
    fireEvent.click(screen.getByRole("button", { name: "Enter" }));

    await waitFor(() =>
      expect(screen.getByText("Audience headline")).toBeVisible(),
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText("Segment preview controls").parentElement,
      ).toHaveAttribute("data-runtime-state", "active"),
    );
    expect(screen.getByLabelText("Audience output")).not.toHaveTextContent(
      "Segment preview controls",
    );
  });

  test("12A.T11 keeps live phase, action, Layout, and hold progress outside the audience frame", async () => {
    render(
      <SegmentPreview
        components={[component]}
        editor={editor([
          { kind: "activateLayout", layoutId },
          { durationMs: 300, kind: "waitForDuration" },
        ])}
        layouts={[layout]}
        onClose={() => undefined}
        resources={[]}
        showName="Late Night"
        studioId={studioId}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Enter" }));
    const progress = screen.getByLabelText("Preview progress");
    await waitFor(() => expect(progress).toHaveTextContent("Enter"));
    expect(progress).toHaveTextContent("2. Hold for duration");
    expect(progress).toHaveTextContent("Audience title");
    expect(progress).toHaveTextContent(/Remaining hold:?\s*0\.[0-3] seconds/u);
    expect(screen.getByLabelText("Audience output")).not.toHaveTextContent(
      "Remaining hold",
    );
    await waitFor(
      () => expect(progress).toHaveTextContent("No action running"),
      { timeout: 1_000 },
    );
    expect(progress).toHaveTextContent("Active");
    expect(progress).toHaveTextContent("Audience title");
    expect(progress).toHaveTextContent("Not holding");
  });

  test("12A.T12 focuses the preview heading and keeps controls before the audience output", () => {
    render(
      <SegmentPreview
        components={[component]}
        editor={editor()}
        layouts={[layout]}
        onClose={() => undefined}
        resources={[]}
        showName="Late Night"
        studioId={studioId}
      />,
    );

    const heading = screen.getByRole("heading", { name: "Preview Opening" });
    const controls = screen.getByLabelText("Segment preview controls");
    const audience = screen.getByLabelText("Audience output");
    expect(heading).toHaveFocus();
    expect(
      controls.compareDocumentPosition(audience) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test("12.T12 names the affected production object and offers safe Retry and Stop", async () => {
    render(
      <SegmentPreview
        components={[component]}
        editor={editor([
          { kind: "activateLayout", layoutId },
          { kind: "startMedia", resourceId },
        ])}
        layouts={[layout]}
        onClose={() => undefined}
        resources={[missingResource]}
        showName="Late Night"
        studioId={studioId}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Enter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The Opening Segment could not use Walk-on sting.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Locate or replace this Resource",
    );
    expect(screen.getByLabelText("Preview progress")).toHaveTextContent(
      "Prepare Resource",
    );
    expect(screen.getByLabelText("Preview progress")).toHaveTextContent("None");
    expect(screen.getByRole("button", { name: "Retry Preview" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Stop Preview" }));
    await waitFor(() => expect(screen.getByText("Stopped")).toBeVisible());
    expect(screen.getByLabelText("Preview progress")).toHaveTextContent(
      "No action running",
    );
  });

  test("12.T10 starts an audio Resource without requiring a visual Placement", async () => {
    const baseApi = createMockDesktopApi();
    Object.defineProperty(window, "showflow", {
      configurable: true,
      value: Object.freeze({
        ...baseApi,
        resources: Object.freeze({
          ...baseApi.resources,
          getUrl: async () => ({
            data: "data:audio/mpeg;base64,SUQz",
            ok: true as const,
          }),
        }),
      }) satisfies ShowflowDesktopApi,
    });
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
      () => undefined,
    );

    render(
      <SegmentPreview
        components={[component]}
        editor={editor([{ kind: "startMedia", resourceId }])}
        layouts={[layout]}
        onClose={() => undefined}
        resources={[{ ...missingResource, availability: "available" }]}
        showName="Late Night"
        studioId={studioId}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Enter" }));

    await waitFor(() => expect(play).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(
        screen.getByLabelText("Segment preview controls").parentElement,
      ).toHaveAttribute("data-runtime-state", "active"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    await waitFor(() => expect(screen.getByText("Stopped")).toBeVisible());
  });

  test("12.8 preloads visible video before an ordered start action", async () => {
    const baseApi = createMockDesktopApi();
    Object.defineProperty(window, "showflow", {
      configurable: true,
      value: Object.freeze({
        ...baseApi,
        resources: Object.freeze({
          ...baseApi.resources,
          getUrl: async () => ({
            data: "data:video/mp4;base64,AAAA",
            ok: true as const,
          }),
        }),
      }) satisfies ShowflowDesktopApi,
    });
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
      () => undefined,
    );
    const videoComponent: ComponentDto = {
      ...component,
      name: "Video",
      propertySchema: [
        {
          key: "media",
          label: "Video",
          required: true,
          type: "videoResource",
        },
      ],
      supportedSlotRoles: ["mainVideo"],
      type: "video",
    };
    const basePlacement = layout.componentPlacements[0];
    const baseSlot = layout.slots[0];
    if (basePlacement === undefined || baseSlot === undefined) {
      throw new Error("Expected a preview Placement and Slot.");
    }
    const videoLayout: LayoutDto = {
      ...layout,
      componentPlacements: [
        {
          ...basePlacement,
          bindings: { media: { kind: "resource", resourceId } },
        },
      ],
      slots: [
        {
          ...baseSlot,
          allowedComponentTypes: ["video"],
          role: "mainVideo",
        },
      ],
    };
    const videoResource: ResourceDto = {
      ...missingResource,
      availability: "available",
      category: "video",
      displayName: "Opening video",
      mimeType: "video/mp4",
      originalFilename: "opening.mp4",
    };

    render(
      <SegmentPreview
        components={[videoComponent]}
        editor={editor([
          { kind: "activateLayout", layoutId },
          { kind: "startMedia", resourceId },
        ])}
        layouts={[videoLayout]}
        onClose={() => undefined}
        resources={[videoResource]}
        showName="Late Night"
        studioId={studioId}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Enter" }));

    await waitFor(() => expect(play).toHaveBeenCalledOnce());
    expect(screen.getByLabelText("Opening video")).toHaveAttribute(
      "data-resource-id",
      resourceId,
    );
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    await waitFor(() => expect(screen.getByText("Stopped")).toBeVisible());
  });

  test("12A.T13 resolves a selected image by Resource ID through the preview URL boundary", async () => {
    const baseApi = createMockDesktopApi();
    const getUrl = vi.fn(async () => ({
      data: "data:image/png;base64,iVBORw0KGgo=",
      ok: true as const,
    }));
    Object.defineProperty(window, "showflow", {
      configurable: true,
      value: Object.freeze({
        ...baseApi,
        resources: Object.freeze({ ...baseApi.resources, getUrl }),
      }) satisfies ShowflowDesktopApi,
    });
    const imageComponent: ComponentDto = {
      ...component,
      name: "Exit image",
      propertySchema: [
        {
          key: "image",
          label: "Image",
          required: true,
          type: "imageResource",
        },
      ],
      supportedSlotRoles: ["mainVideo"],
      type: "image",
    };
    const basePlacement = layout.componentPlacements[0];
    const baseSlot = layout.slots[0];
    if (basePlacement === undefined || baseSlot === undefined) {
      throw new Error("Expected a preview Placement and Slot.");
    }
    const imageLayout: LayoutDto = {
      ...layout,
      componentPlacements: [
        {
          ...basePlacement,
          bindings: { image: { kind: "resource", resourceId } },
        },
      ],
      slots: [
        {
          ...baseSlot,
          allowedComponentTypes: ["image"],
          role: "mainVideo",
        },
      ],
    };
    const imageResource: ResourceDto = {
      ...missingResource,
      availability: "available",
      category: "image",
      dimensions: { height: 1080, width: 1920 },
      displayName: "Exit still",
      durationMs: null,
      mimeType: "image/png",
      originalFilename: "exit-still.png",
    };

    render(
      <SegmentPreview
        components={[imageComponent]}
        editor={editor([{ kind: "activateLayout", layoutId }])}
        layouts={[imageLayout]}
        onClose={() => undefined}
        resources={[imageResource]}
        showName="Late Night"
        studioId={studioId}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Enter" }));

    await waitFor(() =>
      expect(screen.getByRole("img", { name: "Exit still" })).toHaveAttribute(
        "data-resource-id",
        resourceId,
      ),
    );
    expect(getUrl).toHaveBeenCalledWith({
      resourceId,
      studioId,
      variant: "content",
    });
  });

  test("14.7 previews Enter directly from the lifecycle action editor", async () => {
    render(
      <SegmentPreview
        components={[component]}
        editor={editor()}
        layouts={[layout]}
        onClose={() => undefined}
        resources={[]}
        showName="Late Night"
        startAt="enter"
        studioId={studioId}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByLabelText("Segment preview controls").parentElement,
      ).toHaveAttribute("data-runtime-state", "active"),
    );
    expect(screen.getByText("Audience headline")).toBeVisible();
  });

  test("14.7 previews Exit directly from the lifecycle action editor", async () => {
    render(
      <SegmentPreview
        components={[component]}
        editor={editor()}
        layouts={[layout]}
        onClose={() => undefined}
        resources={[]}
        showName="Late Night"
        startAt="exit"
        studioId={studioId}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByLabelText("Segment preview controls").parentElement,
      ).toHaveAttribute("data-runtime-state", "stopped"),
    );
    expect(screen.getByLabelText("Preview progress")).toHaveTextContent(
      "No action running",
    );
    expect(screen.getByLabelText("Preview progress")).toHaveTextContent(
      "Not holding",
    );
    expect(screen.getByLabelText("Audience output")).toHaveTextContent(
      "Preview stopped",
    );
  });

  test("12A.T5 cancels an in-flight duration when the preview window closes", async () => {
    render(
      <SegmentPreview
        components={[component]}
        editor={editor([{ durationMs: 10_000, kind: "waitForDuration" }])}
        layouts={[layout]}
        onClose={() => undefined}
        resources={[]}
        showName="Late Night"
        studioId={studioId}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Enter" }));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Segment preview controls").parentElement,
      ).toHaveAttribute("data-runtime-state", "entering"),
    );

    fireEvent(window, new Event("pagehide"));

    await waitFor(() =>
      expect(
        screen.getByLabelText("Segment preview controls").parentElement,
      ).toHaveAttribute("data-runtime-state", "stopped"),
    );
  });

  test("12.T12 identifies a Layout whose Placements cannot be resolved", async () => {
    render(
      <SegmentPreview
        components={[]}
        editor={editor()}
        layouts={[layout]}
        onClose={() => undefined}
        resources={[]}
        showName="Late Night"
        studioId={studioId}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Enter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The Opening Segment could not use Audience title.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Restore the missing Component or Slot",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("activateLayout");
  });
});
