import {
  ApplicationShell,
  Button,
  Checkbox,
  IconButton,
  InspectorSection,
  SaveStateIndicator,
  ScopeLabel,
  Select,
  Skeleton,
  TextInput,
  Toggle,
} from "@showflow/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import type {
  BindingDto,
  ComponentDto,
  ComponentPlacementDto,
  LayoutDto,
  SlotDraftDto,
} from "@showflow/contracts";
import {
  BUILT_IN_COMPONENT_TYPES,
  BUILT_IN_COMPONENT_REGISTRY,
  type BuiltInComponentType,
} from "@showflow/domain";

import { getDesignShowLayoutRoute } from "../../app-routes.mts";
import { ComponentPreview } from "../components/ComponentPreview";
import { PlacementInspector } from "../components/PlacementInspector";
import {
  componentQueryKey,
  loadComponents,
} from "../components/component-queries";
import { ParentNavigation } from "../navigation/ParentNavigation";
import {
  createNavigationFocusState,
  resolveLayoutOrigin,
} from "../navigation/navigation-origin.mts";
import { usePersistedNavigation } from "../navigation/usePersistedNavigation";
import { loadResources, resourceQueryKey } from "../resources/resource-queries";
import { StudioSwitcher } from "../studios/StudioSwitcher";
import { loadStudio, studioQueryKey } from "../studios/studio-queries";
import {
  layoutCatalogQueryKey,
  layoutQueryKey,
  loadLayout,
} from "./layout-queries";
import {
  moveSlot,
  percent,
  resizeSlot,
  updateSlotPercent,
} from "./layout-geometry.mts";
import styles from "./layouts.module.css";

type Snapshot = {
  readonly name: string;
  readonly slots: readonly SlotDraftDto[];
};
type PlacementState = {
  readonly bindings: Readonly<Record<string, BindingDto>>;
  readonly componentType: BuiltInComponentType;
  readonly fixedProperties: ComponentPlacementDto["fixedProperties"];
  readonly visibleByDefault: boolean;
};
type HistoryEntry =
  | {
      readonly kind: "layout";
      readonly before: Snapshot;
      readonly after: Snapshot;
    }
  | {
      readonly kind: "placement";
      readonly slotId: string;
      readonly before: PlacementState | null;
      readonly after: PlacementState | null;
    };
type ComponentType = SlotDraftDto["allowedComponentTypes"][number];
const COMPONENT_TYPES: readonly ComponentType[] = [
  "camera",
  "video",
  "image",
  "text",
  "graphic",
  "logo",
  "background",
  "lowerThird",
  "timer",
  "countdown",
  "audioIndicator",
];
const ROLE_OPTIONS = [
  "background",
  "hostCamera",
  "guestCamera",
  "mainVideo",
  "pictureInPicture",
  "logo",
  "lowerThird",
  "banner",
  "chat",
  "center",
  "topCenter",
  "bottomCenter",
  "upperLeft",
  "upperRight",
  "lowerLeft",
  "lowerRight",
].map((value) => ({
  label: value
    .replace(/([A-Z])/gu, " $1")
    .replace(/^./u, (letter) => letter.toUpperCase()),
  value,
}));
const snapshot = (layout: LayoutDto): Snapshot => ({
  name: layout.name,
  slots: layout.slots.map((slot) => ({
    ...slot,
    bounds: { ...slot.bounds },
    safeMargins: { ...slot.safeMargins },
    allowedComponentTypes: [...slot.allowedComponentTypes],
  })),
});
const placementState = (
  placement: ComponentPlacementDto | undefined,
  component: ComponentDto | undefined,
): PlacementState | null =>
  placement === undefined ||
  component === undefined ||
  !BUILT_IN_COMPONENT_TYPES.includes(component.type)
    ? null
    : {
        bindings: { ...placement.bindings },
        componentType: component.type,
        fixedProperties: { ...placement.fixedProperties },
        visibleByDefault: placement.visibleByDefault,
      };

export const LayoutEditorDestination = () => {
  const { studioId, showId, layoutId } = useParams<{
    studioId: string;
    showId: string;
    layoutId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const client = useQueryClient();
  const complete =
    studioId !== undefined && showId !== undefined && layoutId !== undefined;
  const query = useQuery({
    enabled: complete,
    queryFn: () => loadLayout(studioId ?? "", showId ?? "", layoutId ?? ""),
    queryKey: layoutQueryKey(studioId ?? "", showId ?? "", layoutId ?? ""),
    retry: false,
  });
  const studioQuery = useQuery({
    enabled: studioId !== undefined,
    queryFn: () => loadStudio(studioId ?? ""),
    queryKey: studioQueryKey(studioId ?? ""),
    retry: false,
  });
  const resourcesQuery = useQuery({
    enabled: complete,
    queryFn: () =>
      loadResources({
        scope: "show",
        studioId: studioId ?? "",
        showId: showId ?? "",
      }),
    queryKey: resourceQueryKey({
      scope: "show",
      studioId: studioId ?? "",
      showId: showId ?? "",
    }),
    retry: false,
  });
  const componentsQuery = useQuery({
    enabled: complete,
    queryFn: () => loadComponents(studioId ?? "", showId ?? ""),
    queryKey: componentQueryKey(studioId ?? "", showId ?? ""),
    retry: false,
  });
  const [layout, setLayout] = useState<LayoutDto>();
  const [selectedId, setSelectedId] = useState<string>();
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [safeArea, setSafeArea] = useState(true);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const [error, setError] = useState<string>();
  const [past, setPast] = useState<readonly HistoryEntry[]>([]);
  const [future, setFuture] = useState<readonly HistoryEntry[]>([]);
  const saved = useRef<LayoutDto | undefined>(undefined);
  const drag = useRef<
    | {
        id: string;
        mode: "move" | "resize";
        x: number;
        y: number;
        start: SlotDraftDto;
      }
    | undefined
  >(undefined);

  useEffect(() => {
    if (query.data === undefined || layout !== undefined) return;
    const initial = query.data;
    const timeout = window.setTimeout(() => {
      setLayout(initial);
      saved.current = initial;
      setSelectedId(initial.slots.at(-1)?.id);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [layout, query.data]);
  const selected = layout?.slots.find(({ id }) => id === selectedId);
  const selectedPlacement = layout?.componentPlacements.find(
    ({ slotId }) => slotId === selectedId,
  );
  const selectedComponent = componentsQuery.data?.find(
    ({ id }) => id === selectedPlacement?.componentId,
  );
  const origin = complete
    ? resolveLayoutOrigin(location.state, studioId, showId)
    : { label: "Layouts", returnTo: "/" };
  const navigationError = usePersistedNavigation({
    route: complete
      ? getDesignShowLayoutRoute(studioId, showId, layoutId)
      : undefined,
    studioId,
  });

  const cacheLayout = async (next: LayoutDto): Promise<void> => {
    if (!complete) return;
    saved.current = next;
    setLayout(next);
    client.setQueryData(layoutQueryKey(studioId, showId, layoutId), next);
    await client.invalidateQueries({
      queryKey: layoutCatalogQueryKey(studioId, showId),
    });
  };
  const recordHistory = (entry: HistoryEntry): void => {
    setPast((entries) => [...entries, entry]);
    setFuture([]);
  };
  const persist = async (next: Snapshot, record = true): Promise<boolean> => {
    const current = saved.current;
    if (current === undefined || !complete) return false;
    setSaveState("saving");
    const result = await window.showflow.layouts.update({
      studioId,
      showId,
      layoutId,
      expectedUpdatedAt: current.updatedAt,
      name: next.name,
      slots: next.slots.map(
        ({
          id,
          name,
          role,
          bounds,
          alignment,
          safeMargins,
          layerOrder,
          clipContent,
          allowedComponentTypes,
        }) => ({
          ...(id === undefined ? {} : { id }),
          name,
          role,
          bounds,
          alignment,
          safeMargins,
          layerOrder,
          clipContent,
          allowedComponentTypes,
        }),
      ),
    });
    if (!result.ok) {
      setError(result.error.message);
      setSaveState("error");
      setLayout(current);
      return false;
    }
    if (record)
      recordHistory({
        kind: "layout",
        before: snapshot(current),
        after: snapshot(result.data),
      });
    await cacheLayout(result.data);
    setSaveState("saved");
    return true;
  };
  const commitSlots = (slots: readonly SlotDraftDto[], record = true) =>
    persist({ name: layout?.name ?? "Layout", slots }, record);
  const updateSelected = (next: SlotDraftDto): void => {
    if (layout === undefined) return;
    void commitSlots(
      layout.slots.map((slot) =>
        slot.id === selectedId ? { ...slot, ...next } : slot,
      ),
    );
  };
  const moveSelectedLayer = (destination: number): void => {
    if (layout === undefined || selected === undefined) return;
    const reordered = [...layout.slots]
      .sort((left, right) => left.layerOrder - right.layerOrder)
      .filter(({ id }) => id !== selected.id);
    reordered.splice(
      Math.min(Math.max(destination, 0), reordered.length),
      0,
      selected,
    );
    void commitSlots(
      reordered.map((slot, index) => ({ ...slot, layerOrder: index })),
    );
  };
  const addSlot = async (): Promise<void> => {
    if (layout === undefined) return;
    const next: SlotDraftDto = {
      name: `Slot ${layout.slots.length + 1}`,
      role: "center",
      bounds: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
      alignment: "stretch",
      safeMargins: { top: 0, right: 0, bottom: 0, left: 0 },
      layerOrder: layout.slots.length,
      clipContent: true,
      allowedComponentTypes: [],
    };
    await commitSlots([...layout.slots, next]);
    setSelectedId(saved.current?.slots.at(-1)?.id);
  };
  const pointerDown = (
    event: ReactPointerEvent<HTMLElement>,
    slot: SlotDraftDto,
    pointerMode: "move" | "resize",
  ): void => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: slot.id ?? "",
      mode: pointerMode,
      x: event.clientX,
      y: event.clientY,
      start: slot,
    };
    setSelectedId(slot.id);
  };
  const pointerMove = (event: ReactPointerEvent<HTMLElement>): void => {
    const active = drag.current;
    if (active === undefined || layout === undefined) return;
    const frame = event.currentTarget.closest<HTMLElement>(
      "[data-layout-frame]",
    );
    if (frame === null) return;
    const deltaX = (event.clientX - active.x) / frame.clientWidth;
    const deltaY = (event.clientY - active.y) / frame.clientHeight;
    const next =
      active.mode === "move"
        ? moveSlot(active.start, deltaX, deltaY)
        : resizeSlot(active.start, deltaX, deltaY);
    setLayout({
      ...layout,
      slots: layout.slots.map((slot) =>
        slot.id === active.id ? { ...slot, bounds: next.bounds } : slot,
      ),
    });
  };
  const pointerUp = (): void => {
    if (drag.current === undefined || layout === undefined) return;
    drag.current = undefined;
    void commitSlots(layout.slots);
  };
  const assignComponent = async (type: BuiltInComponentType): Promise<void> => {
    if (selected === undefined || layout === undefined) {
      setError("Select a compatible Slot before adding a Component.");
      return;
    }
    const before = placementState(selectedPlacement, selectedComponent);
    setSaveState("saving");
    const result = await window.showflow.components.assign({
      studioId: studioId ?? "",
      showId: showId ?? "",
      layoutId: layoutId ?? "",
      expectedUpdatedAt: layout.updatedAt,
      slotId: selected.id,
      componentType: type,
    });
    if (!result.ok) {
      setError(result.error.message);
      setSaveState("error");
      return;
    }
    const assignedPlacement = result.data.componentPlacements.find(
      (placement) => placement.slotId === selected.id,
    );
    if (assignedPlacement === undefined) {
      setError("Showflow could not confirm the Component Placement.");
      setSaveState("error");
      return;
    }
    recordHistory({
      kind: "placement",
      slotId: selected.id,
      before,
      after: {
        bindings: { ...assignedPlacement.bindings },
        componentType: type,
        fixedProperties: { ...assignedPlacement.fixedProperties },
        visibleByDefault: assignedPlacement.visibleByDefault,
      },
    });
    await cacheLayout(result.data);
    setError(undefined);
    setSaveState("saved");
    await client.invalidateQueries({
      queryKey: componentQueryKey(studioId ?? "", showId ?? ""),
    });
  };
  const updatePlacement = async (
    bindings: Readonly<Record<string, BindingDto>>,
    visibleByDefault: boolean,
  ): Promise<void> => {
    if (selectedPlacement === undefined || layout === undefined) return;
    const before = placementState(selectedPlacement, selectedComponent);
    if (before === null) return;
    setSaveState("saving");
    const result = await window.showflow.components.updatePlacement({
      studioId: studioId ?? "",
      showId: showId ?? "",
      layoutId: layoutId ?? "",
      expectedUpdatedAt: layout.updatedAt,
      placementId: selectedPlacement.id,
      bindings,
      fixedProperties: selectedPlacement.fixedProperties,
      visibleByDefault,
    });
    if (!result.ok) {
      setError(result.error.message);
      setSaveState("error");
      return;
    }
    recordHistory({
      kind: "placement",
      slotId: selectedPlacement.slotId,
      before,
      after: {
        ...before,
        bindings: { ...bindings },
        visibleByDefault,
      },
    });
    await cacheLayout(result.data);
    setError(undefined);
    setSaveState("saved");
  };
  const removePlacement = async (): Promise<void> => {
    if (selectedPlacement === undefined || layout === undefined) return;
    const before = placementState(selectedPlacement, selectedComponent);
    if (before === null) return;
    setSaveState("saving");
    const result = await window.showflow.components.removePlacement({
      studioId: studioId ?? "",
      showId: showId ?? "",
      layoutId: layoutId ?? "",
      expectedUpdatedAt: layout.updatedAt,
      placementId: selectedPlacement.id,
    });
    if (!result.ok) {
      setError(result.error.message);
      setSaveState("error");
      return;
    }
    recordHistory({
      kind: "placement",
      slotId: selectedPlacement.slotId,
      before,
      after: null,
    });
    await cacheLayout(result.data);
    setError(undefined);
    setSaveState("saved");
  };

  const applyPlacementState = async (
    slotId: string,
    target: PlacementState | null,
  ): Promise<boolean> => {
    const current = saved.current;
    if (current === undefined || !complete) return false;
    const currentPlacement = current.componentPlacements.find(
      (placement) => placement.slotId === slotId,
    );
    setSaveState("saving");
    if (target === null) {
      if (currentPlacement === undefined) {
        setSaveState("saved");
        return true;
      }
      const removed = await window.showflow.components.removePlacement({
        studioId,
        showId,
        layoutId,
        expectedUpdatedAt: current.updatedAt,
        placementId: currentPlacement.id,
      });
      if (!removed.ok) {
        setError(removed.error.message);
        setSaveState("error");
        return false;
      }
      await cacheLayout(removed.data);
      setError(undefined);
      setSaveState("saved");
      return true;
    }
    const assigned = await window.showflow.components.assign({
      studioId,
      showId,
      layoutId,
      expectedUpdatedAt: current.updatedAt,
      slotId,
      componentType: target.componentType,
    });
    if (!assigned.ok) {
      setError(assigned.error.message);
      setSaveState("error");
      return false;
    }
    const assignedPlacement = assigned.data.componentPlacements.find(
      (placement) => placement.slotId === slotId,
    );
    if (assignedPlacement === undefined) {
      setError("Showflow could not restore the Component Placement.");
      setSaveState("error");
      return false;
    }
    const updated = await window.showflow.components.updatePlacement({
      studioId,
      showId,
      layoutId,
      expectedUpdatedAt: assigned.data.updatedAt,
      placementId: assignedPlacement.id,
      bindings: target.bindings,
      fixedProperties: target.fixedProperties,
      visibleByDefault: target.visibleByDefault,
    });
    if (!updated.ok) {
      await cacheLayout(assigned.data);
      setError(updated.error.message);
      setSaveState("error");
      return false;
    }
    await cacheLayout(updated.data);
    setError(undefined);
    setSaveState("saved");
    await client.invalidateQueries({
      queryKey: componentQueryKey(studioId, showId),
    });
    return true;
  };
  const applyHistory = async (
    entry: HistoryEntry,
    direction: "undo" | "redo",
  ): Promise<boolean> =>
    entry.kind === "layout"
      ? persist(direction === "undo" ? entry.before : entry.after, false)
      : applyPlacementState(
          entry.slotId,
          direction === "undo" ? entry.before : entry.after,
        );
  const undo = async (): Promise<void> => {
    const entry = past.at(-1);
    if (entry === undefined || !(await applyHistory(entry, "undo"))) return;
    setPast((entries) => entries.slice(0, -1));
    setFuture((entries) => [...entries, entry]);
  };
  const redo = async (): Promise<void> => {
    const entry = future.at(-1);
    if (entry === undefined || !(await applyHistory(entry, "redo"))) return;
    setFuture((entries) => entries.slice(0, -1));
    setPast((entries) => [...entries, entry]);
  };

  if (!complete) return <Navigate replace to="/" />;
  if (query.isPending || studioQuery.isPending)
    return (
      <ApplicationShell
        studioSwitcher={
          <Button disabled size="small">
            Studio
          </Button>
        }
        title="Layout Editor"
      >
        <Skeleton label="Loading Layout Editor" />
      </ApplicationShell>
    );
  if (query.isError || layout === undefined)
    return (
      <ApplicationShell
        studioSwitcher={
          <Button disabled size="small">
            Studio
          </Button>
        }
        title="Layout Editor"
      >
        <p className={styles.error} role="alert">
          {query.error instanceof Error
            ? query.error.message
            : "This Layout is no longer available."}
        </p>
      </ApplicationShell>
    );

  const segmentFieldSamples = [
    ...new Map(
      layout.componentPlacements.flatMap((placement) =>
        Object.values(placement.bindings).flatMap((binding) =>
          binding.kind === "segmentField"
            ? [
                [
                  binding.fieldKey,
                  {
                    id: placement.id,
                    showSegmentId: layout.id,
                    key: binding.fieldKey,
                    label: binding.fieldKey.replace(/([A-Z])/gu, " $1"),
                    type: "shortText" as const,
                    required: false,
                    defaultValue: null,
                    helpText: null,
                    position: 0,
                    createdAt: placement.createdAt,
                    updatedAt: placement.updatedAt,
                  },
                ] as const,
              ]
            : [],
        ),
      ),
    ).values(),
  ];

  const inspector =
    mode === "preview" ? null : (
      <div className={styles.inspector}>
        {selectedPlacement !== undefined && selectedComponent !== undefined ? (
          <InspectorSection
            description="Set fixed values and Resources once, or use production data when this Layout is active."
            heading="Component"
          >
            <PlacementInspector
              component={selectedComponent}
              key={`${selectedPlacement.id}-${selectedPlacement.updatedAt}`}
              onRemove={removePlacement}
              onSave={updatePlacement}
              placement={selectedPlacement}
              resourceContext={{
                scope: "show",
                studioId: studioId ?? "",
                showId: showId ?? "",
              }}
              resources={resourcesQuery.data ?? []}
            />
          </InspectorSection>
        ) : null}
        <InspectorSection
          description="Normalized percentages keep every composition deterministic."
          heading={selected === undefined ? "Layout" : "Slot geometry"}
        >
          {selected === undefined ? (
            <p>Select a Slot in the audience frame.</p>
          ) : (
            <>
              <TextInput
                label="Slot name"
                onBlur={(event) =>
                  updateSelected({
                    ...selected,
                    name: event.currentTarget.value,
                  })
                }
                defaultValue={selected.name}
                key={`${selected.id}-${selected.updatedAt}-name`}
              />
              <div className={styles.geometryGrid}>
                {(["x", "y", "width", "height"] as const).map((property) => (
                  <TextInput
                    defaultValue={percent(selected.bounds[property])}
                    key={`${selected.id}-${selected.updatedAt}-${property}`}
                    label={
                      property === "x" || property === "y"
                        ? property.toUpperCase()
                        : property[0]?.toUpperCase() + property.slice(1)
                    }
                    min={property === "width" || property === "height" ? 2 : 0}
                    max={100}
                    onBlur={(event) => {
                      const value = Number(event.currentTarget.value);
                      if (Number.isFinite(value))
                        updateSelected(
                          updateSlotPercent(selected, property, value),
                        );
                    }}
                    step="0.1"
                    type="number"
                  />
                ))}
              </div>
              <TextInput
                defaultValue={selected.layerOrder}
                key={`${selected.id}-${selected.updatedAt}-layer`}
                label="Layer"
                min={0}
                onBlur={(event) => {
                  const layerOrder = Number(event.currentTarget.value);
                  if (Number.isInteger(layerOrder) && layerOrder >= 0) {
                    moveSelectedLayer(layerOrder);
                  }
                }}
                step={1}
                type="number"
              />
              <div className={styles.toolbarActions}>
                <Button
                  disabled={selected.layerOrder === 0}
                  onClick={() => moveSelectedLayer(selected.layerOrder - 1)}
                  size="small"
                  variant="ghost"
                >
                  Move backward
                </Button>
                <Button
                  disabled={selected.layerOrder === layout.slots.length - 1}
                  onClick={() => moveSelectedLayer(selected.layerOrder + 1)}
                  size="small"
                  variant="ghost"
                >
                  Move forward
                </Button>
              </div>
              <Select
                label="Content role"
                onChange={(event) =>
                  updateSelected({
                    ...selected,
                    role: event.currentTarget.value as SlotDraftDto["role"],
                  })
                }
                options={ROLE_OPTIONS}
                value={selected.role}
              />
              <Checkbox
                checked={selected.clipContent}
                label="Clip content to Slot"
                onChange={(event) =>
                  updateSelected({
                    ...selected,
                    clipContent: event.currentTarget.checked,
                  })
                }
              />
              <fieldset className={styles.typeList}>
                <legend>Accepted Component types</legend>
                {COMPONENT_TYPES.map((type) => (
                  <Checkbox
                    checked={selected.allowedComponentTypes.includes(type)}
                    key={type}
                    label={type.replace(/([A-Z])/gu, " $1")}
                    onChange={(event) =>
                      updateSelected({
                        ...selected,
                        allowedComponentTypes: event.currentTarget.checked
                          ? [...selected.allowedComponentTypes, type]
                          : selected.allowedComponentTypes.filter(
                              (candidate) => candidate !== type,
                            ),
                      })
                    }
                  />
                ))}
              </fieldset>
              <Button
                onClick={() => {
                  setSelectedId(undefined);
                  void commitSlots(
                    layout.slots
                      .filter(({ id }) => id !== selected.id)
                      .map((slot, index) => ({ ...slot, layerOrder: index })),
                  );
                }}
                variant="destructive"
              >
                Delete Slot
              </Button>
            </>
          )}
        </InspectorSection>
      </div>
    );
  const catalog =
    mode === "preview" ? null : (
      <div className={styles.sidePanel}>
        <section>
          <p className={styles.eyebrow}>Components</p>
          <h2>Component Catalog</h2>
          <p>
            Select a compatible Slot, then add or drag a built-in Component.
          </p>
          <div className={styles.componentGrid}>
            {BUILT_IN_COMPONENT_TYPES.map((type) => {
              const definition = BUILT_IN_COMPONENT_REGISTRY[type];
              const compatible =
                selected !== undefined &&
                selected.allowedComponentTypes.includes(type) &&
                definition.supportedSlotRoles.includes(selected.role);
              return (
                <button
                  className={styles.componentTile}
                  disabled={!compatible}
                  draggable={compatible}
                  key={type}
                  onClick={() => void assignComponent(type)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData(
                      "application/x-showflow-component",
                      type,
                    );
                  }}
                  type="button"
                >
                  <strong>{definition.name}</strong>
                  <span>{definition.description}</span>
                  <small>
                    {compatible
                      ? "Add to selected Slot"
                      : "Select a compatible Slot"}
                  </small>
                </button>
              );
            })}
          </div>
        </section>
        <section>
          <p className={styles.eyebrow}>Resources</p>
          <h2>Show Resources</h2>
          {resourcesQuery.data?.length ? (
            <ul>
              {resourcesQuery.data.map((resource) => (
                <li key={resource.id}>{resource.displayName}</li>
              ))}
            </ul>
          ) : (
            <p>No Show Resources yet.</p>
          )}
        </section>
      </div>
    );

  return (
    <ApplicationShell
      catalog={catalog}
      catalogLabel="Layout assets"
      defaultCatalogOpen={mode === "edit"}
      historyActions={
        <>
          <IconButton
            disabled={past.length === 0 || saveState === "saving"}
            icon="undo"
            label="Undo Layout change"
            onClick={() => void undo()}
            tooltip="Undo"
          />
          <IconButton
            disabled={future.length === 0 || saveState === "saving"}
            icon="redo"
            label="Redo Layout change"
            onClick={() => void redo()}
            tooltip="Redo"
          />
        </>
      }
      inspector={inspector}
      inspectorLabel="Layout inspector"
      parentNavigation={
        <ParentNavigation
          accessibleLabel={`Back to ${origin.label}`}
          label={origin.label}
          onClick={(event) => {
            event.preventDefault();
            navigate(origin.returnTo, {
              state:
                origin.focusId === undefined
                  ? undefined
                  : createNavigationFocusState(origin.focusId),
            });
          }}
          to={origin.returnTo}
        />
      }
      primaryAction={
        mode === "edit" ? (
          <Button
            leadingIcon="plus"
            onClick={() => void addSlot()}
            variant="primary"
          >
            Rectangle Slot
          </Button>
        ) : undefined
      }
      saveState={<SaveStateIndicator state={saveState} />}
      scope={<ScopeLabel scope="show" />}
      studioSwitcher={
        studioQuery.data === undefined ? (
          <Button disabled size="small">
            Studio
          </Button>
        ) : (
          <StudioSwitcher
            currentStudio={studioQuery.data}
            onSelectionError={setError}
          />
        )
      }
      title={layout.name}
    >
      <div className={styles.editorWorkspace}>
        <header className={styles.editorToolbar}>
          <div>
            <p className={styles.eyebrow}>Layout Editor · Show scope</p>
            <h2 data-route-heading tabIndex={-1}>
              {layout.name}
            </h2>
            <p>
              {layout.aspectRatio} · {layout.slots.length} Slot
              {layout.slots.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className={styles.toolbarActions}>
            <Toggle
              checked={mode === "preview"}
              label="Audience preview"
              onCheckedChange={(checked) =>
                setMode(checked ? "preview" : "edit")
              }
            />
            {mode === "edit" ? (
              <Toggle
                checked={safeArea}
                label="Safe area"
                onCheckedChange={setSafeArea}
              />
            ) : null}
          </div>
        </header>
        {(error ?? navigationError) ? (
          <p className={styles.error} role="alert">
            {error ?? navigationError}
          </p>
        ) : null}
        <section
          aria-label={
            mode === "preview" ? "Audience preview" : "Editable audience frame"
          }
          className={styles.canvasStage}
          data-preview={mode === "preview" || undefined}
        >
          <div
            className={styles.audienceFrame}
            data-layout-frame
            data-ratio={layout.aspectRatio}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const type = event.dataTransfer.getData(
                "application/x-showflow-component",
              );
              if (
                (BUILT_IN_COMPONENT_TYPES as readonly string[]).includes(type)
              )
                void assignComponent(type as BuiltInComponentType);
            }}
            onClick={() => setSelectedId(undefined)}
            style={{ aspectRatio: layout.aspectRatio.replace(":", " / ") }}
          >
            <ComponentPreview
              components={componentsQuery.data ?? []}
              layout={layout}
              resources={resourcesQuery.data ?? []}
              studioId={studioId}
              segmentFields={segmentFieldSamples}
              segmentValues={Object.fromEntries(
                layout.componentPlacements.flatMap((placement) =>
                  Object.values(placement.bindings).flatMap((binding) =>
                    binding.kind === "segmentField"
                      ? [
                          [
                            binding.fieldKey,
                            binding.fieldKey
                              .replace(/([A-Z])/gu, " $1")
                              .replace(/^./u, (letter) => letter.toUpperCase()),
                          ],
                        ]
                      : [],
                  ),
                ),
              )}
            />
            {mode === "edit" && safeArea ? (
              <div aria-hidden="true" className={styles.safeArea} />
            ) : null}
            {mode === "edit"
              ? [...layout.slots]
                  .sort((a, b) => a.layerOrder - b.layerOrder)
                  .map((slot) => (
                    <button
                      aria-label={`${slot.name} Slot`}
                      aria-pressed={slot.id === selectedId}
                      className={styles.slot}
                      data-selected={slot.id === selectedId || undefined}
                      key={slot.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedId(slot.id);
                      }}
                      onPointerDown={(event) =>
                        pointerDown(event, slot, "move")
                      }
                      onPointerMove={(event) => {
                        event.stopPropagation();
                        pointerMove(event);
                      }}
                      onPointerUp={(event) => {
                        event.stopPropagation();
                        pointerUp();
                      }}
                      style={{
                        left: `${slot.bounds.x * 100}%`,
                        top: `${slot.bounds.y * 100}%`,
                        width: `${slot.bounds.width * 100}%`,
                        height: `${slot.bounds.height * 100}%`,
                        zIndex: slot.layerOrder,
                      }}
                      type="button"
                    >
                      <span>{slot.name}</span>
                      {slot.id === selectedId ? (
                        <span
                          aria-hidden="true"
                          className={styles.resizeHandle}
                          onPointerDown={(event) =>
                            pointerDown(event, slot, "resize")
                          }
                          onPointerMove={pointerMove}
                          onPointerUp={pointerUp}
                        />
                      ) : null}
                    </button>
                  ))
              : null}
          </div>
          <span className={styles.fitLabel}>
            Fit · {layout.canvas.width} × {layout.canvas.height}
          </span>
        </section>
      </div>
    </ApplicationShell>
  );
};
