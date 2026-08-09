import type {
  LayoutDto,
  LifecycleActionDto,
  ResourceDto,
} from "@showflow/contracts";
import { Button, Select } from "@showflow/ui";

import styles from "./segment-editor.module.css";

type EditableActionKind =
  "activateLayout" | "waitForAnimationCompletion" | "startMedia" | "stopMedia";

const ACTION_OPTIONS = [
  { label: "Show a Layout", value: "activateLayout" },
  {
    label: "Wait for the animation to finish",
    value: "waitForAnimationCompletion",
  },
  { label: "Start media", value: "startMedia" },
  { label: "Stop media", value: "stopMedia" },
] as const;

const createAction = (
  kind: EditableActionKind,
  layouts: readonly LayoutDto[],
  media: readonly ResourceDto[],
): LifecycleActionDto | undefined => {
  switch (kind) {
    case "activateLayout":
      return layouts[0] === undefined
        ? undefined
        : { kind, layoutId: layouts[0].id };
    case "startMedia":
    case "stopMedia":
      return media[0] === undefined
        ? undefined
        : { kind, resourceId: media[0].id };
    case "waitForAnimationCompletion":
      return { kind };
  }
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
      return "Clear temporary production state";
  }
};

export const LifecycleActionEditor = ({
  actions,
  disabled,
  layouts,
  onChange,
  onPreview,
  phase,
  resources,
}: {
  readonly actions: readonly LifecycleActionDto[];
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
  const save = (next: readonly LifecycleActionDto[]): void => {
    void onChange(next).catch(() => undefined);
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

  return (
    <div className={styles.actionEditor}>
      <p className={styles.dependencyCopy}>
        {phase === "enter"
          ? "Run these production actions in order before the Segment becomes Active."
          : "Run these production actions in order before automatic Cleanup."}
      </p>
      <Button
        disabled={disabled}
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
          {actions.map((action, index) => (
            <li className={styles.actionCard} key={`${index}-${action.kind}`}>
              <p className={styles.actionInstruction}>
                <span>{index + 1}</span>
                {instructionCopy(action, layouts, resources)}
              </p>
              <Select
                disabled={disabled}
                label={`Action ${index + 1}`}
                onChange={(event) => {
                  const next = createAction(
                    event.currentTarget.value as EditableActionKind,
                    layouts,
                    media,
                  );
                  if (next !== undefined) replace(index, next);
                }}
                options={ACTION_OPTIONS}
                value={
                  ACTION_OPTIONS.some(({ value }) => value === action.kind)
                    ? action.kind
                    : "waitForAnimationCompletion"
                }
              />
              {action.kind === "activateLayout" ? (
                <Select
                  disabled={disabled || layouts.length === 0}
                  label="Layout"
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
                  label="Media Resource"
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
              ) : null}
              <div className={styles.actionButtons}>
                <Button
                  disabled={disabled || index === 0}
                  onClick={() => move(index, index - 1)}
                  size="small"
                  variant="ghost"
                >
                  Move earlier
                </Button>
                <Button
                  disabled={disabled || index === actions.length - 1}
                  onClick={() => move(index, index + 1)}
                  size="small"
                  variant="ghost"
                >
                  Move later
                </Button>
                <Button
                  disabled={disabled}
                  onClick={() =>
                    save(actions.filter((_, position) => position !== index))
                  }
                  size="small"
                  variant="ghost"
                >
                  Remove action
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className={styles.actionAddButtons}>
        <Button
          disabled={disabled || layouts.length === 0}
          onClick={() => {
            const action = createAction("activateLayout", layouts, media);
            if (action !== undefined) save([...actions, action]);
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
          disabled={disabled || media.length === 0}
          onClick={() => {
            const action = createAction("startMedia", layouts, media);
            if (action !== undefined) save([...actions, action]);
          }}
          size="small"
        >
          Start media
        </Button>
        <Button
          disabled={disabled || media.length === 0}
          onClick={() => {
            const action = createAction("stopMedia", layouts, media);
            if (action !== undefined) save([...actions, action]);
          }}
          size="small"
        >
          Stop media
        </Button>
      </div>
    </div>
  );
};
