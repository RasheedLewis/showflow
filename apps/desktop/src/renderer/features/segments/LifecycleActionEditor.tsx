import type {
  ComponentDto,
  LayoutDto,
  LifecycleActionDto,
  ResourceDto,
} from "@showflow/contracts";
import { calculateLifecycleTiming } from "@showflow/execution-contracts";
import { Button, Select, TextInput } from "@showflow/ui";
import { useMemo, useState } from "react";

import styles from "./segment-editor.module.css";

const formatSeconds = (durationMs: number): string => {
  const seconds = durationMs / 1_000;
  const value = Number.isInteger(seconds)
    ? String(seconds)
    : seconds.toFixed(3).replace(/0+$/u, "").replace(/\.$/u, "");
  return `${value} ${seconds === 1 ? "second" : "seconds"}`;
};

const instructionCopy = (
  action: LifecycleActionDto,
  layouts: readonly LayoutDto[],
  resources: readonly ResourceDto[],
): string => {
  switch (action.kind) {
    case "activateLayout":
      return `Show ${layouts.find(({ id }) => id === action.layoutId)?.name ?? "an unavailable Layout"}`;
    case "waitForAnimationCompletion":
      return "Wait for the animation to finish";
    case "waitForDuration":
      return `Hold for ${formatSeconds(action.durationMs)}`;
    case "startMedia":
      return `Start ${resources.find(({ id }) => id === action.resourceId)?.displayName ?? "unavailable media"}`;
    case "stopMedia":
      return `Stop ${resources.find(({ id }) => id === action.resourceId)?.displayName ?? "unavailable media"}`;
    case "preloadResource":
      return `Prepare ${resources.find(({ id }) => id === action.resourceId)?.displayName ?? "an unavailable Resource"}`;
    case "playSound":
      return `Play ${resources.find(({ id }) => id === action.resourceId)?.displayName ?? "an unavailable sound"}`;
    case "waitForMediaCompletion":
      return "Wait for the media to finish";
    case "setActiveDefaults":
      return `Use ${layouts.find(({ id }) => id === action.layoutId)?.name ?? "an unavailable Layout"} as the Active view`;
    case "clearTemporaryState":
      return "Clear temporary audience output";
  }
};

const secondsDrafts = (
  actions: readonly LifecycleActionDto[],
): Readonly<Record<number, string>> =>
  Object.fromEntries(
    actions.flatMap((action, index) =>
      action.kind === "waitForDuration"
        ? [[index, String(action.durationMs / 1_000)] as const]
        : [],
    ),
  );

export const LifecycleActionEditor = ({
  actions,
  components,
  disabled,
  layouts,
  onChange,
  onPreview,
  phase,
  resources,
}: {
  readonly actions: readonly LifecycleActionDto[];
  readonly components: readonly ComponentDto[];
  readonly disabled: boolean;
  readonly layouts: readonly LayoutDto[];
  readonly onChange: (actions: readonly LifecycleActionDto[]) => Promise<void>;
  readonly onPreview: () => void;
  readonly phase: "enter" | "exit";
  readonly resources: readonly ResourceDto[];
}) => {
  const media = resources.filter(
    ({ category }) => category === "video" || category === "audio",
  );
  const [addingLayout, setAddingLayout] = useState(false);
  const [pendingLayoutId, setPendingLayoutId] = useState("");
  const [durationDrafts, setDurationDrafts] = useState(() =>
    secondsDrafts(actions),
  );
  const [saveError, setSaveError] = useState<string>();
  const timing = useMemo(
    () => calculateLifecycleTiming({ actions, components, layouts }),
    [actions, components, layouts],
  );
  const save = (next: readonly LifecycleActionDto[]): void => {
    setSaveError(undefined);
    void onChange(next).catch(() =>
      setSaveError(
        "Showflow could not save these actions. Review the affected action and try again.",
      ),
    );
  };
  const replace = (index: number, action: LifecycleActionDto): void =>
    save(
      actions.map((candidate, position) =>
        position === index ? action : candidate,
      ),
    );
  const move = (index: number, destination: number): void => {
    const next = [...actions];
    const [action] = next.splice(index, 1);
    if (action === undefined) return;
    next.splice(destination, 0, action);
    save(next);
  };
  const mediaHelpId = `${phase}-media-action-help`;
  const timingDestination = phase === "enter" ? "Active" : "Cleanup";

  return (
    <div className={styles.actionEditor}>
      <p className={styles.dependencyCopy}>
        {phase === "enter"
          ? "Run these production actions in order before the Segment becomes Active. Active then waits for you."
          : "Run these production actions in order before inferred Cleanup."}
      </p>
      <Button
        disabled={disabled || addingLayout}
        onClick={onPreview}
        size="small"
        variant="ghost"
      >
        Preview {phase === "enter" ? "Enter" : "Exit"}
      </Button>
      {actions.length === 0 ? (
        <p className={styles.emptyFields}>
          No {phase === "enter" ? "Enter" : "Exit"} actions yet.
        </p>
      ) : (
        <ol className={styles.actionList}>
          {actions.map((action, index) => {
            const actionTiming = timing.actions[index];
            const durationDraft =
              action.kind === "waitForDuration"
                ? (durationDrafts[index] ?? String(action.durationMs / 1_000))
                : undefined;
            const parsedDurationMs =
              durationDraft === undefined
                ? undefined
                : Number(durationDraft) * 1_000;
            const durationError =
              action.kind === "waitForDuration" &&
              (durationDraft === "" ||
                parsedDurationMs === undefined ||
                !Number.isInteger(parsedDurationMs) ||
                parsedDurationMs <= 0)
                ? `Action ${index + 1} hold duration must be greater than zero seconds.`
                : undefined;
            return (
              <li className={styles.actionCard} key={`${index}-${action.kind}`}>
                <p className={styles.actionInstruction}>
                  <span>{index + 1}</span>
                  {instructionCopy(action, layouts, resources)}
                </p>
                {action.kind === "activateLayout" ? (
                  <Select
                    disabled={disabled || layouts.length === 0}
                    label={`Action ${index + 1} Layout`}
                    onChange={(event) =>
                      replace(index, {
                        kind: "activateLayout",
                        layoutId: event.currentTarget.value,
                      })
                    }
                    options={layouts.map((layout) => ({
                      label: layout.name,
                      value: layout.id,
                    }))}
                    value={action.layoutId}
                  />
                ) : action.kind === "startMedia" ||
                  action.kind === "stopMedia" ? (
                  <Select
                    disabled={disabled || media.length === 0}
                    label={`Action ${index + 1} Media Resource`}
                    onChange={(event) =>
                      replace(index, {
                        kind: action.kind,
                        resourceId: event.currentTarget.value,
                      })
                    }
                    options={media.map((resource) => ({
                      label: resource.displayName,
                      value: resource.id,
                    }))}
                    value={action.resourceId}
                  />
                ) : action.kind === "waitForDuration" ? (
                  <TextInput
                    disabled={disabled}
                    {...(durationError === undefined
                      ? {}
                      : { error: durationError })}
                    helpText="Seconds; enter a value greater than zero. Showflow stores exact milliseconds."
                    label={`Action ${index + 1} hold duration (seconds)`}
                    min={0.001}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setDurationDrafts((current) => ({
                        ...current,
                        [index]: value,
                      }));
                      const durationMs = Number(value) * 1_000;
                      if (
                        value !== "" &&
                        Number.isInteger(durationMs) &&
                        durationMs > 0
                      ) {
                        replace(index, { kind: action.kind, durationMs });
                      }
                    }}
                    required
                    step={0.001}
                    type="number"
                    value={durationDraft ?? ""}
                  />
                ) : null}
                {action.kind === "waitForAnimationCompletion" &&
                actionTiming !== undefined ? (
                  <div className={styles.actionTimingDetail}>
                    <p>
                      {actionTiming.durationMs === null
                        ? "Effective animation wait cannot be calculated."
                        : `Effective animation wait: ${formatSeconds(actionTiming.durationMs)}, including placement delay.`}
                    </p>
                    {actionTiming.warning === undefined ? null : (
                      <p className={styles.timingWarning} role="status">
                        {actionTiming.warning}
                      </p>
                    )}
                  </div>
                ) : null}
                <div className={styles.actionButtons}>
                  <Button
                    aria-label="Move earlier"
                    disabled={disabled || index === 0}
                    onClick={() => move(index, index - 1)}
                    size="small"
                    variant="ghost"
                  >
                    Earlier
                  </Button>
                  <Button
                    aria-label="Move later"
                    disabled={disabled || index === actions.length - 1}
                    onClick={() => move(index, index + 1)}
                    size="small"
                    variant="ghost"
                  >
                    Later
                  </Button>
                  <Button
                    aria-label="Remove action"
                    disabled={disabled}
                    onClick={() =>
                      save(actions.filter((_, position) => position !== index))
                    }
                    size="small"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {addingLayout ? (
        <section
          aria-label="Configure Show Layout action"
          className={styles.pendingAction}
        >
          <Select
            autoFocus
            disabled={disabled}
            helpText="Select a Layout to add the action."
            label="Layout for new Show Layout action"
            onChange={(event) => {
              const layoutId = event.currentTarget.value;
              setPendingLayoutId(layoutId);
              if (layoutId === "") return;
              save([...actions, { kind: "activateLayout", layoutId }]);
              setAddingLayout(false);
              setPendingLayoutId("");
            }}
            options={layouts.map((layout) => ({
              label: layout.name,
              value: layout.id,
            }))}
            placeholder="Choose a Layout"
            required
            value={pendingLayoutId}
          />
          <div className={styles.actionButtons}>
            <Button
              disabled={disabled}
              onClick={() => {
                setAddingLayout(false);
                setPendingLayoutId("");
              }}
              size="small"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </section>
      ) : null}

      <div className={styles.actionAddButtons}>
        <Button
          disabled={disabled || layouts.length === 0 || addingLayout}
          onClick={() => {
            setPendingLayoutId("");
            setAddingLayout(true);
          }}
          size="small"
        >
          Show Layout
        </Button>
        <Button
          disabled={disabled}
          onClick={() =>
            save([...actions, { kind: "waitForAnimationCompletion" }])
          }
          size="small"
        >
          Wait for animation
        </Button>
        <Button
          disabled={disabled}
          onClick={() =>
            save([...actions, { kind: "waitForDuration", durationMs: 3_000 }])
          }
          size="small"
        >
          Hold for
        </Button>
        <Button
          aria-describedby={media.length === 0 ? mediaHelpId : undefined}
          disabled={disabled || media.length === 0}
          onClick={() => {
            const resource = media[0];
            if (resource !== undefined)
              save([
                ...actions,
                { kind: "startMedia", resourceId: resource.id },
              ]);
          }}
          size="small"
        >
          Start media
        </Button>
        <Button
          aria-describedby={media.length === 0 ? mediaHelpId : undefined}
          disabled={disabled || media.length === 0}
          onClick={() => {
            const resource = media[0];
            if (resource !== undefined)
              save([
                ...actions,
                { kind: "stopMedia", resourceId: resource.id },
              ]);
          }}
          size="small"
        >
          Stop media
        </Button>
      </div>
      <p className={styles.dependencyCopy} id={mediaHelpId}>
        {media.length === 0
          ? "Start media and Stop media need an imported audio or video Resource. Video must also be shown in a compatible Layout."
          : "Start media and Stop media target an imported audio or video Resource. Video must be shown in a compatible Layout before it starts."}
      </p>

      <section
        aria-label={`${phase === "enter" ? "Enter" : "Exit"} timing`}
        className={styles.phaseTiming}
      >
        <strong>
          {timing.totalDurationMs === null
            ? `Exact time before ${timingDestination} is not available.`
            : phase === "enter"
              ? `Calculated time before Active: ${formatSeconds(timing.totalDurationMs)}.`
              : `Calculated Exit time before Cleanup: ${formatSeconds(timing.totalDurationMs)}.`}
        </strong>
        {timing.indeterminateActionIndex === null ? null : (
          <p>
            Action {timing.indeterminateActionIndex + 1} prevents an exact
            total. Review its timing guidance above.
          </p>
        )}
        {phase === "exit" ? (
          <p>
            Finishing Exit proceeds to inferred Cleanup. Cleanup clears
            temporary audience output.
          </p>
        ) : (
          <p>
            This calculated phase time is separate from the Segment expected
            duration estimate.
          </p>
        )}
      </section>
      {saveError === undefined ? null : (
        <p className={styles.error} role="alert">
          {saveError}
        </p>
      )}
    </div>
  );
};
