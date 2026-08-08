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
import type { LayoutDto, SlotDraftDto } from "@showflow/contracts";

import { getDesignShowLayoutRoute } from "../../app-routes.mts";
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
  const [layout, setLayout] = useState<LayoutDto>();
  const [selectedId, setSelectedId] = useState<string>();
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [safeArea, setSafeArea] = useState(true);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const [error, setError] = useState<string>();
  const [past, setPast] = useState<readonly Snapshot[]>([]);
  const [future, setFuture] = useState<readonly Snapshot[]>([]);
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
  const origin = complete
    ? resolveLayoutOrigin(location.state, studioId, showId)
    : { label: "Layouts", returnTo: "/" };
  const navigationError = usePersistedNavigation({
    route: complete
      ? getDesignShowLayoutRoute(studioId, showId, layoutId)
      : undefined,
    studioId,
  });

  const persist = async (next: Snapshot, record = true): Promise<void> => {
    const current = saved.current;
    if (current === undefined || !complete) return;
    if (record) {
      setPast((entries) => [...entries, snapshot(current)]);
      setFuture([]);
    }
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
      return;
    }
    saved.current = result.data;
    setLayout(result.data);
    setSaveState("saved");
    await client.invalidateQueries({
      queryKey: layoutCatalogQueryKey(studioId, showId),
    });
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
  const undo = (): void => {
    const previous = past.at(-1);
    const current = saved.current;
    if (previous === undefined || current === undefined) return;
    setPast((entries) => entries.slice(0, -1));
    setFuture((entries) => [...entries, snapshot(current)]);
    void persist(previous, false);
  };
  const redo = (): void => {
    const next = future.at(-1);
    const current = saved.current;
    if (next === undefined || current === undefined) return;
    setFuture((entries) => entries.slice(0, -1));
    setPast((entries) => [...entries, snapshot(current)]);
    void persist(next, false);
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

  const inspector =
    mode === "preview" ? null : (
      <div className={styles.inspector}>
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
          <p>Component placement arrives in Sprint 11.</p>
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
            onClick={undo}
            tooltip="Undo"
          />
          <IconButton
            disabled={future.length === 0 || saveState === "saving"}
            icon="redo"
            label="Redo Layout change"
            onClick={redo}
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
            onClick={() => setSelectedId(undefined)}
            style={{ aspectRatio: layout.aspectRatio.replace(":", " / ") }}
          >
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
