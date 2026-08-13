import type {
  ComponentDto,
  LayoutDto,
  ResourceDto,
  ShowSegmentEditorDto,
} from "@showflow/contracts";
import {
  ProductionExecutionError,
  EMPTY_RUNTIME_PROGRESS,
  SegmentRuntime,
  createSystemExecutionClock,
  generateSegmentInstructions,
  getAnimationCompletionMs,
  isExecutionAbort,
  type ExecutionContext,
  type ProductionExecutionAdapter,
  type ResourceExecutionTarget,
  type RuntimeSnapshot,
} from "@showflow/execution-contracts";
import { Badge, Button } from "@showflow/ui";
import { useEffect, useMemo, useRef, useState } from "react";

import { ComponentPreview } from "../components/ComponentPreview";
import styles from "./segment-preview.module.css";

const stateLabel = (state: RuntimeSnapshot["state"]): string => {
  switch (state) {
    case "cleaningUp":
      return "Cleaning Up";
    default:
      return state.slice(0, 1).toUpperCase() + state.slice(1);
  }
};

const phaseLabel = (phase: RuntimeSnapshot["progress"]["phase"]): string =>
  phase === null
    ? "Not started"
    : phase.slice(0, 1).toUpperCase() + phase.slice(1);

const actionLabel = (
  actionKind: RuntimeSnapshot["progress"]["actionKind"],
): string => {
  switch (actionKind) {
    case "activateLayout":
      return "Show Layout";
    case "waitForAnimationCompletion":
      return "Wait for animation";
    case "waitForDuration":
      return "Hold for duration";
    case "playResource":
      return "Start media";
    case "stopResource":
      return "Stop media";
    case "preloadResource":
      return "Prepare Resource";
    case "waitForMediaCompletion":
      return "Wait for media";
    case "setActiveDefaults":
      return "Set Active defaults";
    case "clearTemporaryState":
      return "Clear temporary output";
    case null:
      return "No action running";
  }
};

const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(
    () =>
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (query === undefined) return;
    const update = (): void => setReduced(query.matches);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
};

const previewMediaElements = (): readonly HTMLMediaElement[] => [
  ...document.querySelectorAll<HTMLMediaElement>(
    '[data-segment-preview-runtime] audio, [data-segment-preview-runtime] video, [data-segment-preview-detached="true"]',
  ),
];

const mediaElement = (resourceId: string): HTMLMediaElement | undefined =>
  previewMediaElements().find(
    ({ dataset }) => dataset["resourceId"] === resourceId,
  );

const cancellationError = (): Error => {
  const error = new Error("The preview action was cancelled.");
  error.name = "AbortError";
  return error;
};

const withCancellation = <TValue,>(
  operation: Promise<TValue>,
  signal: AbortSignal,
): Promise<TValue> =>
  new Promise<TValue>((resolve, reject) => {
    if (signal.aborted) {
      reject(cancellationError());
      return;
    }
    const cancel = (): void => {
      signal.removeEventListener("abort", cancel);
      reject(cancellationError());
    };
    signal.addEventListener("abort", cancel, { once: true });
    void operation.then(
      (value) => {
        signal.removeEventListener("abort", cancel);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", cancel);
        reject(error);
      },
    );
  });

const layoutCompletionMs = (
  layout: LayoutDto,
  components: readonly ComponentDto[],
  phase: "enter" | "exit",
  reducedMotion: boolean,
): number =>
  layout.componentPlacements.reduce((maximum, placement) => {
    const component = components.find(({ id }) => id === placement.componentId);
    if (component === undefined) return maximum;
    const animation =
      phase === "enter"
        ? (placement.enterAnimationOverride ?? component.defaultEnterAnimation)
        : (placement.exitAnimationOverride ?? component.defaultExitAnimation);
    return Math.max(
      maximum,
      getAnimationCompletionMs(animation, reducedMotion),
    );
  }, 0);

const mediaCompletion = (
  element: HTMLMediaElement,
  context: ExecutionContext,
  resource: ResourceExecutionTarget | undefined,
): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    if (element.ended) {
      resolve();
      return;
    }
    const cleanup = (): void => {
      element.removeEventListener("ended", onEnded);
      element.removeEventListener("error", onError);
      context.signal.removeEventListener("abort", onAbort);
    };
    const onEnded = (): void => {
      cleanup();
      resolve();
    };
    const onError = (): void => {
      cleanup();
      reject(
        new ProductionExecutionError(
          "This media could not finish playing. Replace it with a supported file and retry.",
          resource ?? { id: "active-media", name: "the active media" },
        ),
      );
    };
    const onAbort = (): void => {
      cleanup();
      const error = new Error("The media wait was cancelled.");
      error.name = "AbortError";
      reject(error);
    };
    element.addEventListener("ended", onEnded, { once: true });
    element.addEventListener("error", onError, { once: true });
    context.signal.addEventListener("abort", onAbort, { once: true });
  });

export const SegmentPreview = ({
  components,
  editor,
  layouts,
  onClose,
  resources,
  showName,
  startAt,
  studioId,
}: {
  readonly components: readonly ComponentDto[];
  readonly editor: ShowSegmentEditorDto;
  readonly layouts: readonly LayoutDto[];
  readonly onClose: () => void;
  readonly resources: readonly ResourceDto[];
  readonly showName: string;
  readonly startAt?: "enter" | "exit" | undefined;
  readonly studioId: string;
}) => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reducedMotion = useReducedMotion();
  const [activeLayoutId, setActiveLayoutId] = useState<string>();
  const [animationPhase, setAnimationPhase] = useState<"enter" | "exit">();
  const [resourceUrls, setResourceUrls] = useState<
    Readonly<Record<string, string>>
  >({});
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot>({
    progress: EMPTY_RUNTIME_PROGRESS,
    state: "idle",
  });
  const layoutsById = useMemo(
    () => new Map(layouts.map((layout) => [layout.id, layout])),
    [layouts],
  );
  const resourcesById = useMemo(
    () => new Map(resources.map((resource) => [resource.id, resource])),
    [resources],
  );
  const plan = useMemo(() => {
    const actionLayoutIds = [
      ...editor.lifecycle.enter,
      ...editor.lifecycle.exit,
    ].flatMap((action) =>
      action.kind === "activateLayout" || action.kind === "setActiveDefaults"
        ? [action.layoutId]
        : [],
    );
    return generateSegmentInstructions({
      components,
      layouts,
      resources,
      segment: {
        id: editor.id,
        name: editor.name,
        layoutIds: [
          ...new Set([
            ...editor.lifecycle.active.availableLayoutIds,
            ...(editor.lifecycle.active.defaultLayoutId === null
              ? []
              : [editor.lifecycle.active.defaultLayoutId]),
            ...actionLayoutIds,
          ]),
        ],
        lifecycle: editor.lifecycle,
      },
    });
  }, [components, editor, layouts, resources]);
  const adapter = useMemo<ProductionExecutionAdapter>(() => {
    const resolveMedia = async (
      resource: ResourceExecutionTarget,
      context: ExecutionContext,
    ): Promise<HTMLMediaElement | undefined> => {
      const visible = mediaElement(resource.id);
      if (visible !== undefined) return visible;
      const value = resourcesById.get(resource.id);
      if (value?.category !== "audio") return undefined;
      const result = await withCancellation(
        window.showflow.resources.getUrl({
          resourceId: resource.id,
          studioId,
          variant: "content",
        }),
        context.signal,
      );
      if (!result.ok) {
        throw new ProductionExecutionError(
          "This audio could not be opened. Locate or replace it, then retry.",
          resource,
        );
      }
      const audio = new Audio(result.data);
      audio.dataset["resourceId"] = resource.id;
      audio.dataset["segmentPreviewDetached"] = "true";
      audio.hidden = true;
      document.body.append(audio);
      return audio;
    };
    return {
      activateLayout: async (layout, context) => {
        const value = layoutsById.get(layout.id);
        if (value === undefined || value.archivedAt !== null) {
          throw new ProductionExecutionError(
            "Choose another Layout or restore this Layout before previewing.",
            layout,
          );
        }
        const unresolvedPlacement = value.componentPlacements.find(
          (placement) =>
            !components.some(({ id }) => id === placement.componentId) ||
            components.some(
              ({ archivedAt, id }) =>
                id === placement.componentId && archivedAt !== null,
            ) ||
            !value.slots.some(({ id }) => id === placement.slotId),
        );
        if (unresolvedPlacement !== undefined) {
          throw new ProductionExecutionError(
            "Restore the missing Component or Slot in this Layout, then retry.",
            layout,
          );
        }
        if (context.signal.aborted) throw cancellationError();
        setAnimationPhase("enter");
        setActiveLayoutId(layout.id);
        await context.clock.wait(0, context.signal);
      },
      clearTemporaryState: async () => {
        for (const element of previewMediaElements()) {
          element.pause();
          element.currentTime = 0;
          if (element.dataset["segmentPreviewDetached"] === "true") {
            element.remove();
          }
        }
        setResourceUrls({});
        setActiveLayoutId(undefined);
        setAnimationPhase(undefined);
      },
      deactivateLayout: async (layout, context) => {
        const value = layoutsById.get(layout.id);
        if (value === undefined) return;
        if (context.signal.aborted) throw cancellationError();
        setAnimationPhase("exit");
        const durationMs = layoutCompletionMs(
          value,
          components,
          "exit",
          reducedMotion,
        );
        if (durationMs > 0) {
          await context.clock.wait(durationMs, context.signal);
        }
        setActiveLayoutId(undefined);
      },
      playResource: async (resource, context) => {
        const element = await resolveMedia(resource, context);
        if (element === undefined) {
          throw new ProductionExecutionError(
            "Show this media in an active Layout before starting it.",
            resource,
          );
        }
        try {
          await withCancellation(element.play(), context.signal);
        } catch (error) {
          if (isExecutionAbort(error)) throw error;
          throw new ProductionExecutionError(
            "This media could not play. Replace it with a supported file and retry.",
            resource,
          );
        }
      },
      preloadResource: async (resource, context) => {
        const value = resourcesById.get(resource.id);
        if (value === undefined || value.availability !== "available") {
          throw new ProductionExecutionError(
            "Locate or replace this Resource, then retry.",
            value === undefined
              ? resource
              : {
                  id: value.id,
                  name: value.displayName,
                  category: value.category,
                },
          );
        }
        if (
          value.category === "audio" ||
          value.category === "image" ||
          value.category === "video"
        ) {
          const result = await withCancellation(
            window.showflow.resources.getUrl({
              resourceId: resource.id,
              studioId,
              variant: "content",
            }),
            context.signal,
          );
          if (!result.ok) {
            throw new ProductionExecutionError(
              "This Resource could not be opened. Locate or replace it, then retry.",
              resource,
            );
          }
          if (context.signal.aborted) throw cancellationError();
          setResourceUrls((current) => ({
            ...current,
            [resource.id]: result.data,
          }));
          if (
            value.category === "audio" &&
            mediaElement(resource.id) === undefined
          ) {
            const audio = new Audio(result.data);
            audio.dataset["resourceId"] = resource.id;
            audio.dataset["segmentPreviewDetached"] = "true";
            audio.hidden = true;
            document.body.append(audio);
          }
        }
        if (
          value.category === "cameraInput" &&
          value.deviceState !== null &&
          value.deviceState !== "available"
        ) {
          throw new ProductionExecutionError(
            "Connect this camera or allow camera access, then retry.",
            resource,
          );
        }
      },
      setActiveDefaults: async () => undefined,
      stopResource: async (resource) => {
        const element = mediaElement(resource.id);
        element?.pause();
        if (element !== undefined) element.currentTime = 0;
      },
      waitForAnimation: async (instruction, context) => {
        const durationMs = reducedMotion ? 0 : instruction.durationMs;
        if (durationMs > 0) {
          await context.clock.wait(durationMs, context.signal);
        }
        setAnimationPhase(undefined);
      },
      waitForMedia: async (resource, context) => {
        const element =
          resource === undefined
            ? previewMediaElements()[0]
            : await resolveMedia(resource, context);
        if (element === undefined) {
          throw new ProductionExecutionError(
            "Show this media in an active Layout before waiting for it.",
            resource ?? { id: "active-media", name: "the active media" },
          );
        }
        await mediaCompletion(element, context, resource);
      },
    };
  }, [components, layoutsById, reducedMotion, resourcesById, studioId]);
  const runtime = useMemo(
    () => new SegmentRuntime(adapter, createSystemExecutionClock()),
    [adapter],
  );

  useEffect(() => runtime.subscribe(setSnapshot), [runtime]);
  useEffect(() => {
    headingRef.current?.scrollIntoView?.({ block: "start" });
    headingRef.current?.focus();
  }, []);
  useEffect(() => {
    if (startAt === undefined) return;
    const previewPhase = async (): Promise<void> => {
      await runtime.enter(plan);
      if (startAt === "exit" && runtime.snapshot.state === "active") {
        await runtime.exit();
      }
    };
    void previewPhase().catch(() => undefined);
  }, [plan, runtime, startAt]);
  useEffect(() => {
    const stopForWindowClose = (): void => {
      void runtime.stop();
    };
    window.addEventListener("pagehide", stopForWindowClose);
    return () => window.removeEventListener("pagehide", stopForWindowClose);
  }, [runtime]);
  useEffect(
    () => () => {
      void runtime.stop();
    },
    [runtime],
  );

  const activeLayout =
    activeLayoutId === undefined ? undefined : layoutsById.get(activeLayoutId);
  const sampleValues = Object.fromEntries(
    editor.dataFields.map((field) => [
      field.key,
      field.defaultValue ?? field.label,
    ]),
  );
  const run = (operation: Promise<void>): void => {
    void operation.catch(() => undefined);
  };
  const isRunning =
    snapshot.state === "preparing" ||
    snapshot.state === "entering" ||
    snapshot.state === "exiting" ||
    snapshot.state === "cleaningUp";
  const progressLayout =
    snapshot.progress.activeLayoutId === null
      ? undefined
      : layoutsById.get(snapshot.progress.activeLayoutId);
  const remainingHold =
    snapshot.progress.remainingDurationMs === null
      ? "Not holding"
      : `${(snapshot.progress.remainingDurationMs / 1_000).toFixed(1)} seconds`;
  const announcedRemainingHold =
    snapshot.progress.remainingDurationMs === null
      ? "Not holding"
      : `${Math.ceil(snapshot.progress.remainingDurationMs / 1_000)} seconds`;
  const progressAnnouncement = `${phaseLabel(snapshot.progress.phase)} phase. ${
    snapshot.progress.actionIndex === null
      ? actionLabel(snapshot.progress.actionKind)
      : `Action ${snapshot.progress.actionIndex + 1}: ${actionLabel(snapshot.progress.actionKind)}`
  }. Current Layout: ${progressLayout?.name ?? "none"}. Remaining hold: ${announcedRemainingHold}.`;

  return (
    <section
      aria-labelledby="segment-preview-heading"
      className={styles.preview}
      data-segment-preview-runtime
      data-runtime-state={snapshot.state}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Audience preview</p>
          <h2 id="segment-preview-heading" ref={headingRef} tabIndex={-1}>
            Preview {editor.name}
          </h2>
          <p>Controls stay outside the audience frame.</p>
        </div>
        <div className={styles.headerActions}>
          <Badge tone={snapshot.state === "failed" ? "error" : "info"}>
            {stateLabel(snapshot.state)}
          </Badge>
          <Button
            onClick={() => {
              run(runtime.stop());
              onClose();
            }}
            variant="ghost"
          >
            Close Preview
          </Button>
        </div>
      </header>

      <section aria-label="Preview progress" className={styles.status}>
        <span aria-live="polite" className={styles.srOnly} role="status">
          {progressAnnouncement}
        </span>
        <dl className={styles.statusGrid}>
          <div>
            <dt>Phase</dt>
            <dd>{phaseLabel(snapshot.progress.phase)}</dd>
          </div>
          <div>
            <dt>Action</dt>
            <dd>
              {snapshot.progress.actionIndex === null
                ? actionLabel(snapshot.progress.actionKind)
                : `${snapshot.progress.actionIndex + 1}. ${actionLabel(snapshot.progress.actionKind)}`}
            </dd>
          </div>
          <div>
            <dt>Current Layout</dt>
            <dd>{progressLayout?.name ?? "None"}</dd>
          </div>
          <div>
            <dt>Remaining hold</dt>
            <dd>{remainingHold}</dd>
          </div>
        </dl>
      </section>

      <div
        aria-label="Segment preview controls"
        className={styles.controls}
        role="group"
      >
        <Button
          disabled={isRunning}
          onClick={() =>
            run(
              snapshot.state === "idle"
                ? runtime.enter(plan)
                : runtime.restart(),
            )
          }
        >
          Restart
        </Button>
        <Button
          disabled={snapshot.state !== "idle" && snapshot.state !== "stopped"}
          onClick={() => run(runtime.enter(plan))}
          variant="primary"
        >
          Enter
        </Button>
        <Button
          disabled={
            snapshot.state !== "active" ||
            editor.lifecycle.active.defaultLayoutId === null
          }
          onClick={() => {
            const layoutId = editor.lifecycle.active.defaultLayoutId;
            const layout =
              layoutId === null ? undefined : layoutsById.get(layoutId);
            if (layout !== undefined)
              run(
                runtime.switchLayout(
                  { id: layout.id, name: layout.name },
                  layoutCompletionMs(
                    layout,
                    components,
                    "enter",
                    reducedMotion,
                  ),
                ),
              );
          }}
        >
          Active
        </Button>
        <Button
          disabled={snapshot.state !== "active"}
          onClick={() => run(runtime.exit())}
        >
          Exit
        </Button>
        <Button
          disabled={snapshot.state === "idle" || snapshot.state === "stopped"}
          onClick={() => run(runtime.stop())}
          variant="ghost"
        >
          Stop
        </Button>
      </div>

      <div className={styles.audienceSurround}>
        <div
          aria-label="Audience output"
          className={styles.audienceFrame}
          style={{
            aspectRatio:
              activeLayout?.aspectRatio.replace(":", " / ") ?? "16 / 9",
          }}
        >
          {activeLayout === undefined ? (
            <div className={styles.placeholder}>
              <strong>
                {snapshot.state === "failed"
                  ? "Preview paused"
                  : snapshot.state === "stopped"
                    ? "Preview stopped"
                    : "Run Enter to begin"}
              </strong>
              <span>
                The audience frame shows only active production output.
              </span>
            </div>
          ) : (
            <ComponentPreview
              animationPhase={animationPhase}
              components={components}
              layout={activeLayout}
              reducedMotion={reducedMotion}
              resources={resources}
              resourceUrls={resourceUrls}
              segmentFields={editor.dataFields}
              segmentValues={sampleValues}
              showMetadata={{ name: showName }}
              studioId={studioId}
            />
          )}
        </div>
        <span className={styles.frameLabel}>
          {activeLayout?.name ?? "No active Layout"} · Audience
        </span>
      </div>

      {snapshot.failure === undefined ? null : (
        <section
          className={styles.failure}
          aria-label="Preview issue"
          role="alert"
        >
          <div>
            <strong>Preview needs attention</strong>
            <p>{snapshot.failure.message}</p>
          </div>
          <div className={styles.controlGroup}>
            {snapshot.failure.canRetry ? (
              <Button onClick={() => run(runtime.retry())}>
                Retry Preview
              </Button>
            ) : null}
            <Button onClick={() => run(runtime.stop())} variant="ghost">
              Stop Preview
            </Button>
          </div>
        </section>
      )}

      {editor.lifecycle.active.availableLayoutIds.length === 0 ? null : (
        <div className={styles.layoutControls}>
          <strong>Available Layouts</strong>
          <div className={styles.controlGroup}>
            {editor.lifecycle.active.availableLayoutIds.map((layoutId) => {
              const layout = layoutsById.get(layoutId);
              if (layout === undefined) return null;
              return (
                <Button
                  disabled={
                    snapshot.state !== "active" || activeLayoutId === layout.id
                  }
                  key={layout.id}
                  onClick={() =>
                    run(
                      runtime.switchLayout(
                        { id: layout.id, name: layout.name },
                        layoutCompletionMs(
                          layout,
                          components,
                          "enter",
                          reducedMotion,
                        ),
                      ),
                    )
                  }
                  size="small"
                  variant="ghost"
                >
                  Show {layout.name}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
