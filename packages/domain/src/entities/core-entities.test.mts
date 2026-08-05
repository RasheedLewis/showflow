import { describe, expect, expectTypeOf, test } from "vitest";

import type {
  BlueprintSegmentPlacement,
  Component,
  ComponentPlacement,
  EntityId,
  EntityIdKind,
  Episode,
  EpisodeSegment,
  HostCue,
  Layout,
  Resource,
  ResourceOwner,
  SegmentDataField,
  SegmentLifecycle,
  Show,
  ShowBlueprint,
  ShowSegment,
  Slot,
  Studio,
  ValidationIssue,
} from "../index.js";
import { parseEntityId, parseUtcTimestamp } from "../index.js";

const entityId = <TEntity extends EntityIdKind>(
  suffix: number,
): EntityId<TEntity> =>
  parseEntityId<TEntity>(
    `01942c1f-ae8f-7e42-b900-${suffix.toString(16).padStart(12, "0")}`,
  );

const timestamp = parseUtcTimestamp("2026-08-05T15:42:03.125Z");
const metadata = {
  createdAt: timestamp,
  updatedAt: timestamp,
} as const;

const jsonRoundTrip = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value)) as unknown;

describe("core domain entities", () => {
  test("represents Studio, Show, and ordered Show Blueprint ownership", () => {
    const studioId = entityId<"studio">(1);
    const showId = entityId<"show">(2);
    const showBlueprintId = entityId<"showBlueprint">(3);
    const showSegmentId = entityId<"showSegment">(4);
    const resourceId = entityId<"resource">(5);

    const studio = {
      id: studioId,
      name: "Public Sphere Studio",
      logoResourceId: resourceId,
      ...metadata,
    } satisfies Studio;

    const show = {
      id: showId,
      studioId,
      name: "Top 10 Music Videos",
      description: "A weekly music countdown.",
      thumbnailResourceId: resourceId,
      styleDefaults: { lowerThirdStyle: "warm" },
      ...metadata,
    } satisfies Show;

    const placement = {
      id: entityId<"blueprintSegmentPlacement">(6),
      showBlueprintId,
      showSegmentId,
      position: 0,
      label: "Opening",
      defaultData: { lowerThirdTitle: "This week" },
      defaultDurationMs: 90_000,
      placementOverrides: {},
      ...metadata,
    } satisfies BlueprintSegmentPlacement;

    const blueprint = {
      id: showBlueprintId,
      showId,
      placements: [placement],
      ...metadata,
    } satisfies ShowBlueprint;

    expectTypeOf(studio).toMatchTypeOf<Studio>();
    expectTypeOf(show).toMatchTypeOf<Show>();
    expectTypeOf(blueprint).toMatchTypeOf<ShowBlueprint>();
    expect(jsonRoundTrip({ studio, show, blueprint })).toEqual({
      studio,
      show,
      blueprint,
    });
  });

  test("represents Show Segment data, fixed lifecycle shape, and manual Host Cues", () => {
    const showId = entityId<"show">(2);
    const showSegmentId = entityId<"showSegment">(4);
    const layoutId = entityId<"layout">(7);
    const resourceId = entityId<"resource">(5);
    const hostCueId = entityId<"hostCue">(8);

    const dataField = {
      id: entityId<"segmentDataField">(9),
      showSegmentId,
      key: "lowerThirdTitle",
      label: "Lower Third Title",
      type: "shortText",
      required: true,
      defaultValue: "",
      helpText: "Shown while the host is on screen.",
      position: 0,
      ...metadata,
    } satisfies SegmentDataField;

    const hostCue = {
      id: hostCueId,
      showSegmentId,
      name: "Play applause",
      actions: [{ kind: "playSound", resourceId }],
      lifetime: { kind: "fixedDuration", durationMs: 2_500 },
      completionBehavior: { kind: "stopMedia", resourceId },
      retriggerBehavior: "restartPlayback",
      keyboardShortcut: "A",
      ...metadata,
    } satisfies HostCue;

    const lifecycle = {
      showSegmentId,
      prepare: [{ kind: "preloadResource", resourceId }],
      enter: [
        { kind: "activateLayout", layoutId },
        { kind: "waitForAnimationCompletion" },
      ],
      active: {
        defaultLayoutId: layoutId,
        availableLayoutIds: [layoutId],
        hostCueIds: [hostCueId],
      },
      exit: [{ kind: "stopMedia", resourceId }],
      cleanup: [{ kind: "clearTemporaryState" }],
      ...metadata,
    } satisfies SegmentLifecycle;

    const segment = {
      id: showSegmentId,
      showId,
      name: "Opening",
      description: "Welcome the audience and introduce the countdown.",
      dataFields: [dataField],
      lifecycle,
      layoutIds: [layoutId],
      hostCues: [hostCue],
      expectedDurationMs: 90_000,
      notesTemplate: "Welcome viewers and introduce this week's theme.",
      ...metadata,
    } satisfies ShowSegment;

    expect(Object.keys(lifecycle)).toEqual([
      "showSegmentId",
      "prepare",
      "enter",
      "active",
      "exit",
      "cleanup",
      "createdAt",
      "updatedAt",
    ]);
    expect(hostCue).not.toHaveProperty("trigger");
    expect(jsonRoundTrip(segment)).toEqual(segment);
  });

  test("represents constrained Layouts, Slots, Components, Placements, and bindings", () => {
    const showId = entityId<"show">(2);
    const layoutId = entityId<"layout">(7);
    const slotId = entityId<"slot">(10);
    const componentId = entityId<"component">(11);
    const resourceId = entityId<"resource">(5);

    const slot = {
      id: slotId,
      layoutId,
      name: "Lower Third",
      role: "lowerThird",
      bounds: { x: 0.05, y: 0.75, width: 0.5, height: 0.2 },
      alignment: "start",
      safeMargins: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 },
      layerOrder: 2,
      clipContent: true,
      allowedComponentTypes: ["lowerThird"],
      ...metadata,
    } satisfies Slot;

    const noAnimation = {
      preset: "none",
      durationMs: 0,
      delayMs: 0,
      easing: "linear",
    } as const;

    const component = {
      id: componentId,
      showId,
      name: "Show Lower Third",
      type: "lowerThird",
      propertySchema: [
        {
          key: "title",
          label: "Title",
          type: "string",
          required: true,
          defaultValue: "",
        },
      ],
      defaultProperties: { subtitle: "" },
      defaultEnterAnimation: {
        preset: "slideUp",
        durationMs: 300,
        delayMs: 0,
        easing: "ease-out",
      },
      defaultExitAnimation: noAnimation,
      supportedSlotRoles: ["lowerThird"],
      validationRules: [
        {
          code: "REQUIRED_TITLE",
          propertyKey: "title",
          configuration: {},
        },
      ],
      ...metadata,
    } satisfies Component;

    const placement = {
      id: entityId<"componentPlacement">(12),
      layoutId,
      componentId,
      slotId,
      fixedProperties: { subtitle: "Public Sphere" },
      bindings: {
        title: { kind: "segmentField", fieldKey: "lowerThirdTitle" },
        logo: { kind: "resource", resourceId },
      },
      visibleByDefault: true,
      enterAnimationOverride: noAnimation,
      ...metadata,
    } satisfies ComponentPlacement;

    const layout = {
      id: layoutId,
      showId,
      name: "Host",
      aspectRatio: "16:9",
      canvas: { width: 1_920, height: 1_080 },
      slots: [slot],
      componentPlacements: [placement],
      ...metadata,
    } satisfies Layout;

    expect(jsonRoundTrip({ component, layout })).toEqual({
      component,
      layout,
    });
  });

  test("represents Episode instances, scoped Resources, and actionable validation", () => {
    const studioId = entityId<"studio">(1);
    const showId = entityId<"show">(2);
    const showSegmentId = entityId<"showSegment">(4);
    const layoutId = entityId<"layout">(7);
    const episodeId = entityId<"episode">(13);
    const componentPlacementId = entityId<"componentPlacement">(12);
    const resourceId = entityId<"resource">(5);

    const episodeSegment = {
      id: entityId<"episodeSegment">(14),
      episodeId,
      sourceShowSegmentId: showSegmentId,
      position: 0,
      label: "Week 32 Opening",
      fieldValues: { lowerThirdTitle: "Week 32" },
      notes: "Welcome viewers before the countdown begins.",
      expectedDurationOverrideMs: 75_000,
      defaultLayoutOverrideId: layoutId,
      fixedResourceReplacements: [
        {
          componentPlacementId,
          propertyKey: "logo",
          resourceId,
        },
      ],
      ...metadata,
    } satisfies EpisodeSegment;

    const episode = {
      id: episodeId,
      showId,
      title: "Week 32",
      subtitle: "New releases",
      episodeNumber: 32,
      description: "The week's top music videos.",
      plannedAt: timestamp,
      status: "draft",
      guestNames: ["Jane Doe"],
      sponsorInformation: "Example sponsor",
      internalNotes: "Confirm final ranking before rehearsal.",
      segments: [episodeSegment],
      ...metadata,
    } satisfies Episode;

    const resource = {
      id: resourceId,
      owner: { scope: "show", showId },
      displayName: "Public Sphere Logo",
      category: "image",
      mimeType: "image/png",
      availability: "available",
      originalFilename: "public-sphere-logo.png",
      localPath: "/media/public-sphere-logo.png",
      fileSizeBytes: 4_096,
      sourceModifiedAt: timestamp,
      contentHash: "sha256:example",
      dimensions: { width: 1_024, height: 1_024 },
      thumbnailCacheKey: "logo-v1",
      ...metadata,
    } satisfies Resource;

    const resourceOwners = [
      { scope: "studio", studioId },
      { scope: "show", showId },
      { scope: "episode", episodeId },
    ] as const satisfies readonly ResourceOwner[];

    const validationIssue = {
      id: entityId<"validationIssue">(15),
      severity: "blocking",
      code: "MISSING_SEGMENT_ARTWORK",
      message: "The Opening Segment needs artwork for the Show Logo component.",
      entityType: "showSegment",
      entityId: showSegmentId,
      fieldPath: "data.artwork",
      suggestedAction: "Choose artwork for the Opening Segment.",
      blocks: ["preview", "rehearsal"],
      ...metadata,
    } satisfies ValidationIssue;

    expect(resourceOwners.map((owner) => owner.scope)).toEqual([
      "studio",
      "show",
      "episode",
    ]);
    expect(jsonRoundTrip({ episode, resource, validationIssue })).toEqual({
      episode,
      resource,
      validationIssue,
    });
  });
});
