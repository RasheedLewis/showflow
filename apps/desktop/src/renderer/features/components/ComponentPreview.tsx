import type {
  ComponentDto,
  ComponentPlacementDto,
  LayoutDto,
  ResourceDto,
  SegmentDataFieldDto,
} from "@showflow/contracts";
import { useEffect, useState } from "react";
import {
  LOWER_THIRD_STYLE_PRESETS,
  parseEntityId,
  parseUtcTimestamp,
  resolveComponentPlacement,
  type BindingResolutionContext,
  type Component,
  type ComponentPlacement,
  type Resource,
  type SegmentDataField,
} from "@showflow/domain";

import styles from "./component-preview.module.css";

const domainComponent = (value: ComponentDto): Component => ({
  id: parseEntityId<"component">(value.id),
  showId: parseEntityId<"show">(value.showId),
  name: value.name,
  type: value.type,
  propertySchema: value.propertySchema.map((property) => ({
    key: property.key,
    label: property.label,
    required: property.required,
    type: property.type,
    ...(property.defaultValue === undefined
      ? {}
      : { defaultValue: property.defaultValue }),
  })),
  defaultProperties: value.defaultProperties,
  defaultEnterAnimation: value.defaultEnterAnimation,
  defaultExitAnimation: value.defaultExitAnimation,
  supportedSlotRoles: value.supportedSlotRoles,
  validationRules: [],
  ...(value.archivedAt === null
    ? {}
    : { archivedAt: parseUtcTimestamp(value.archivedAt) }),
  createdAt: parseUtcTimestamp(value.createdAt),
  updatedAt: parseUtcTimestamp(value.updatedAt),
});
const domainPlacement = (value: ComponentPlacementDto): ComponentPlacement => ({
  id: parseEntityId<"componentPlacement">(value.id),
  layoutId: parseEntityId<"layout">(value.layoutId),
  componentId: parseEntityId<"component">(value.componentId),
  slotId: parseEntityId<"slot">(value.slotId),
  bindings: Object.fromEntries(
    Object.entries(value.bindings).map(([key, binding]) => [
      key,
      binding.kind === "resource"
        ? {
            kind: binding.kind,
            resourceId: parseEntityId<"resource">(binding.resourceId),
          }
        : binding,
    ]),
  ),
  fixedProperties: value.fixedProperties,
  visibleByDefault: value.visibleByDefault,
  ...(value.layerOverride === null
    ? {}
    : { layerOverride: value.layerOverride }),
  ...(value.enterAnimationOverride === null
    ? {}
    : { enterAnimationOverride: value.enterAnimationOverride }),
  ...(value.exitAnimationOverride === null
    ? {}
    : { exitAnimationOverride: value.exitAnimationOverride }),
  createdAt: parseUtcTimestamp(value.createdAt),
  updatedAt: parseUtcTimestamp(value.updatedAt),
});
const domainResource = (value: ResourceDto): Resource => ({
  id: parseEntityId<"resource">(value.id),
  availability: value.availability,
  category: value.category,
  displayName: value.displayName,
  mimeType: value.mimeType,
  owner:
    value.owner.scope === "studio"
      ? {
          scope: "studio",
          studioId: parseEntityId<"studio">(value.owner.studioId),
        }
      : value.owner.scope === "show"
        ? { scope: "show", showId: parseEntityId<"show">(value.owner.showId) }
        : {
            scope: "episode",
            episodeId: parseEntityId<"episode">(value.owner.episodeId),
          },
  ...(value.deviceState === null ? {} : { deviceState: value.deviceState }),
  ...(value.originalFilename === null
    ? {}
    : { originalFilename: value.originalFilename }),
  ...(value.fileSizeBytes === null
    ? {}
    : { fileSizeBytes: value.fileSizeBytes }),
  ...(value.sourceModifiedAt === null
    ? {}
    : { sourceModifiedAt: parseUtcTimestamp(value.sourceModifiedAt) }),
  ...(value.contentHash === null ? {} : { contentHash: value.contentHash }),
  ...(value.dimensions === null ? {} : { dimensions: value.dimensions }),
  ...(value.durationMs === null ? {} : { durationMs: value.durationMs }),
  ...(value.thumbnailCacheKey === null
    ? {}
    : { thumbnailCacheKey: value.thumbnailCacheKey }),
  createdAt: parseUtcTimestamp(value.createdAt),
  updatedAt: parseUtcTimestamp(value.updatedAt),
});
type PreviewSegmentFieldDto = Omit<
  SegmentDataFieldDto,
  "episodeValueUsageCount"
>;

const domainField = (value: PreviewSegmentFieldDto): SegmentDataField => ({
  id: parseEntityId<"segmentDataField">(value.id),
  showSegmentId: parseEntityId<"showSegment">(value.showSegmentId),
  key: value.key,
  label: value.label,
  position: value.position,
  required: value.required,
  type: value.type,
  ...(value.defaultValue === null ? {} : { defaultValue: value.defaultValue }),
  ...(value.helpText === null ? {} : { helpText: value.helpText }),
  createdAt: parseUtcTimestamp(value.createdAt),
  updatedAt: parseUtcTimestamp(value.updatedAt),
});

const resolvedValue = (
  values: ReturnType<typeof resolveComponentPlacement>,
  key: string,
): unknown => {
  const value = values[key];
  return value?.status === "resolved" ? value.value : undefined;
};

const deviceStateLabel = (
  resource: ResourceDto | undefined,
): string | undefined => {
  switch (resource?.deviceState) {
    case "permissionRequired":
      return "Permission required";
    case "unavailable":
      return "Unavailable";
    case "disconnected":
      return "Disconnected";
    default:
      return undefined;
  }
};

const availabilityLabel = (
  resource: ResourceDto | undefined,
): string | undefined => {
  switch (resource?.availability) {
    case "missing":
      return "Resource missing";
    case "unavailable":
      return "Resource unavailable";
    case "unsupported":
      return "Resource format unsupported";
    default:
      return undefined;
  }
};

const ResourceVisual = ({
  className,
  fallback,
  resource,
  studioId,
  variant = "content",
}: {
  readonly className?: string | undefined;
  readonly fallback: string;
  readonly resource: ResourceDto | undefined;
  readonly studioId: string | undefined;
  readonly variant?: "content" | "thumbnail";
}) => {
  const requestKey =
    resource === undefined || studioId === undefined
      ? undefined
      : `${studioId}:${resource.id}:${variant}`;
  const [urlResult, setUrlResult] = useState<{
    readonly error?: string;
    readonly key: string;
    readonly url?: string;
  }>();
  useEffect(() => {
    let active = true;
    if (
      resource === undefined ||
      studioId === undefined ||
      resource.availability !== "available" ||
      requestKey === undefined
    )
      return () => {
        active = false;
      };
    void window.showflow.resources
      .getUrl({ resourceId: resource.id, studioId, variant })
      .then((result) => {
        if (!active) return;
        setUrlResult(
          result.ok
            ? { key: requestKey, url: result.data }
            : { key: requestKey, error: result.error.message },
        );
      });
    return () => {
      active = false;
    };
  }, [requestKey, resource, studioId, variant]);

  if (resource === undefined) return <span>{fallback}</span>;
  const activeResult = urlResult?.key === requestKey ? urlResult : undefined;
  const status = availabilityLabel(resource) ?? activeResult?.error;
  if (status !== undefined)
    return (
      <span className={className} role="status">
        {resource.displayName} — {status}
      </span>
    );
  if (activeResult?.url === undefined)
    return <span className={className}>{resource.displayName}</span>;
  if (resource.category === "image")
    return (
      <img
        alt={resource.displayName}
        className={className}
        src={activeResult.url}
      />
    );
  if (resource.category === "video")
    return (
      <video
        aria-label={resource.displayName}
        className={className}
        muted
        playsInline
        preload="metadata"
        src={activeResult.url}
      />
    );
  return <span className={className}>{resource.displayName}</span>;
};

const PlacementContent = ({
  component,
  placement,
  context,
  resources,
  studioId,
}: {
  readonly component: Component;
  readonly placement: ComponentPlacement;
  readonly context: BindingResolutionContext;
  readonly resources: readonly ResourceDto[];
  readonly studioId: string | undefined;
}) => {
  const values = resolveComponentPlacement(component, placement, context);
  const resourceFor = (key: string) => {
    const resolved = resolvedValue(values, key);
    const binding = placement.bindings[key];
    const boundResourceId =
      binding?.kind === "resource" ? binding.resourceId : undefined;
    const id =
      typeof resolved === "string"
        ? resolved
        : (context.resourceReplacements?.[key] ?? boundResourceId);
    return typeof id === "string"
      ? resources.find((resource) => resource.id === id)
      : undefined;
  };
  switch (component.type) {
    case "background":
      return (
        <div className={styles["background"]}>
          <ResourceVisual
            className={styles["backgroundMedia"]}
            fallback="Show background"
            resource={resourceFor("image")}
            studioId={studioId}
          />
        </div>
      );
    case "camera":
      return (
        <div className={styles["camera"]}>
          <span>Camera</span>
          <strong>
            {resourceFor("camera")?.displayName ?? "Camera placeholder"}
          </strong>
          {resourceFor("camera") === undefined ? null : (
            <span role="status">
              {availabilityLabel(resourceFor("camera")) ??
                deviceStateLabel(resourceFor("camera")) ??
                "Available"}
            </span>
          )}
        </div>
      );
    case "video":
      return (
        <div className={styles["media"]}>
          <span>Video</span>
          <ResourceVisual
            className={styles["mediaContent"]}
            fallback="Choose video"
            resource={resourceFor("media")}
            studioId={studioId}
          />
        </div>
      );
    case "image":
    case "logo":
      return (
        <div
          className={
            component.type === "logo" ? styles["logo"] : styles["media"]
          }
        >
          <ResourceVisual
            className={styles["imageContent"]}
            fallback={component.type === "logo" ? "Show logo" : "Choose image"}
            resource={resourceFor("image")}
            studioId={studioId}
            variant="thumbnail"
          />
        </div>
      );
    case "text":
      return (
        <div className={styles["text"]}>
          {String(resolvedValue(values, "text") ?? "Text")}
        </div>
      );
    case "lowerThird": {
      const requestedPreset = String(
        resolvedValue(values, "stylePreset") ?? "quietGold",
      );
      const stylePreset = LOWER_THIRD_STYLE_PRESETS.some(
        ({ value }) => value === requestedPreset,
      )
        ? requestedPreset
        : "quietGold";
      return (
        <div className={styles["lowerThird"]} data-style-preset={stylePreset}>
          {resourceFor("image") === undefined ? null : (
            <ResourceVisual
              className={styles["lowerThirdImage"]}
              fallback=""
              resource={resourceFor("image")}
              studioId={studioId}
              variant="thumbnail"
            />
          )}
          <div className={styles["lowerThirdCopy"]}>
            <strong>
              {String(resolvedValue(values, "title") ?? "Guest name")}
            </strong>
            <span>
              {String(resolvedValue(values, "subtitle") ?? "Role or topic")}
            </span>
          </div>
        </div>
      );
    }
    default:
      return null;
  }
};

export const ComponentPreview = ({
  layout,
  components,
  resources,
  segmentFields = [],
  segmentValues = {},
  showMetadata = {},
  episodeMetadata = {},
  resourceReplacements = [],
  studioId,
}: {
  readonly layout: LayoutDto;
  readonly components: readonly ComponentDto[];
  readonly resources: readonly ResourceDto[];
  readonly segmentFields?: readonly PreviewSegmentFieldDto[];
  readonly segmentValues?: Readonly<Record<string, unknown>>;
  readonly showMetadata?: Readonly<Record<string, unknown>>;
  readonly episodeMetadata?: Readonly<Record<string, unknown>>;
  readonly resourceReplacements?: readonly {
    readonly componentPlacementId: string;
    readonly propertyKey: string;
    readonly resourceId: string;
  }[];
  readonly studioId?: string | undefined;
}) => {
  const context: BindingResolutionContext = {
    showMetadata: showMetadata as BindingResolutionContext["showMetadata"],
    episodeMetadata:
      episodeMetadata as BindingResolutionContext["episodeMetadata"],
    segmentValues: segmentValues as BindingResolutionContext["segmentValues"],
    segmentFields: segmentFields.map(domainField),
    resources: resources.map(domainResource),
  };
  return (
    <>
      {[...layout.componentPlacements]
        .sort((left, right) => {
          const leftSlot = layout.slots.find(({ id }) => id === left.slotId);
          const rightSlot = layout.slots.find(({ id }) => id === right.slotId);
          return (
            (left.layerOverride ?? leftSlot?.layerOrder ?? 0) -
            (right.layerOverride ?? rightSlot?.layerOrder ?? 0)
          );
        })
        .map((placementDto) => {
          const slot = layout.slots.find(
            ({ id }) => id === placementDto.slotId,
          );
          const componentDto = components.find(
            ({ id }) => id === placementDto.componentId,
          );
          if (
            slot === undefined ||
            componentDto === undefined ||
            !placementDto.visibleByDefault
          )
            return null;
          return (
            <div
              className={styles["placement"]}
              data-component-type={componentDto.type}
              key={placementDto.id}
              style={{
                left: `${slot.bounds.x * 100}%`,
                top: `${slot.bounds.y * 100}%`,
                width: `${slot.bounds.width * 100}%`,
                height: `${slot.bounds.height * 100}%`,
                zIndex: placementDto.layerOverride ?? slot.layerOrder,
              }}
            >
              <PlacementContent
                component={domainComponent(componentDto)}
                context={{
                  ...context,
                  resourceReplacements: Object.fromEntries(
                    resourceReplacements
                      .filter(
                        ({ componentPlacementId }) =>
                          componentPlacementId === placementDto.id,
                      )
                      .map(({ propertyKey, resourceId }) => [
                        propertyKey,
                        parseEntityId<"resource">(resourceId),
                      ]),
                  ),
                }}
                placement={domainPlacement(placementDto)}
                resources={resources}
                studioId={studioId}
              />
            </div>
          );
        })}
    </>
  );
};
