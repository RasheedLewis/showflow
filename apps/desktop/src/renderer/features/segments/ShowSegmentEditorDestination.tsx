import type { ShowSegmentEditorDto } from "@showflow/contracts";
import {
  ApplicationShell,
  Badge,
  Button,
  IconButton,
  InspectorSection,
  NotesPanel,
  SaveStateIndicator,
  ScopeLabel,
  Skeleton,
  Tabs,
  TextInput,
} from "@showflow/ui";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getDesignShowRoute, getStudioHomeRoute } from "../../app-routes.mts";
import { usePersistedNavigation } from "../navigation/usePersistedNavigation";
import { loadShowDesign, showDesignQueryKey } from "../shows/show-queries";
import { StudioSwitcher } from "../studios/StudioSwitcher";
import { loadStudio, studioQueryKey } from "../studios/studio-queries";
import { SegmentDataFieldEditor } from "./SegmentDataFieldEditor";
import {
  loadSegmentEditor,
  segmentEditorQueryKey,
} from "./segment-editor-queries";
import styles from "./segment-editor.module.css";
import {
  useSegmentEditorMutations,
  type SegmentDetailsDraft,
} from "./useSegmentEditorMutations";

type LifecyclePhase = "prepare" | "enter" | "active" | "exit" | "cleanup";

const PHASE_LABELS: Readonly<Record<LifecyclePhase, string>> = {
  prepare: "Prepare",
  enter: "Enter",
  active: "Active",
  exit: "Exit",
  cleanup: "Cleanup",
};

const detailsOf = (editor: ShowSegmentEditorDto): SegmentDetailsDraft => ({
  expectedDurationMs: editor.expectedDurationMs,
  name: editor.name,
  notesTemplate: editor.notesTemplate,
});

const sameDetails = (
  left: SegmentDetailsDraft,
  right: SegmentDetailsDraft,
): boolean =>
  left.expectedDurationMs === right.expectedDurationMs &&
  left.name === right.name &&
  left.notesTemplate === right.notesTemplate;

const durationParts = (
  durationMs: number | null,
): { readonly minutes: string; readonly seconds: string } =>
  durationMs === null
    ? { minutes: "", seconds: "" }
    : {
        minutes: String(Math.floor(durationMs / 60_000)),
        seconds: String(Math.floor((durationMs % 60_000) / 1_000)),
      };

const useSegmentDetailsDraft = (
  editor: ShowSegmentEditorDto | undefined,
  onSave: (value: SegmentDetailsDraft) => Promise<void>,
) => {
  const [draft, setDraft] = useState<SegmentDetailsDraft | undefined>(
    editor === undefined ? undefined : detailsOf(editor),
  );
  const [duration, setDuration] = useState(() =>
    durationParts(editor?.expectedDurationMs ?? null),
  );
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const draftRef = useRef(draft);
  const savedDetailsRef = useRef(
    editor === undefined ? undefined : detailsOf(editor),
  );
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (editor === undefined) return;
    const next = detailsOf(editor);
    if (
      savedDetailsRef.current !== undefined &&
      sameDetails(savedDetailsRef.current, next)
    ) {
      return;
    }
    savedDetailsRef.current = next;
    draftRef.current = next;
    setDraft(next);
    setDuration(durationParts(editor.expectedDurationMs));
  }, [editor]);

  useEffect(
    () => () => {
      if (timeout.current !== undefined && draftRef.current !== undefined) {
        clearTimeout(timeout.current);
        if (draftRef.current.name.trim().length > 0) {
          void onSaveRef.current(draftRef.current).catch(() => undefined);
        }
      }
    },
    [],
  );

  const schedule = (next: SegmentDetailsDraft): void => {
    draftRef.current = next;
    setDraft(next);
    if (timeout.current !== undefined) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      timeout.current = undefined;
      if (draftRef.current?.name.trim().length) {
        void onSaveRef.current(draftRef.current).catch(() => undefined);
      }
    }, 400);
  };

  const update = (patch: Partial<SegmentDetailsDraft>): void => {
    if (draftRef.current === undefined) return;
    schedule({ ...draftRef.current, ...patch });
  };

  const updateDuration = (minutes: string, seconds: string): void => {
    setDuration({ minutes, seconds });
    const parsedMinutes = minutes === "" ? 0 : Number(minutes);
    const parsedSeconds = seconds === "" ? 0 : Number(seconds);
    if (
      !Number.isInteger(parsedMinutes) ||
      !Number.isInteger(parsedSeconds) ||
      parsedMinutes < 0 ||
      parsedSeconds < 0 ||
      parsedSeconds > 59
    ) {
      return;
    }
    update({
      expectedDurationMs:
        minutes === "" && seconds === ""
          ? null
          : (parsedMinutes * 60 + parsedSeconds) * 1_000,
    });
  };

  return { draft, duration, update, updateDuration };
};

const PhaseCanvas = ({
  editor,
  phase,
}: {
  readonly editor: ShowSegmentEditorDto;
  readonly phase: LifecyclePhase;
}) => {
  const actionCount =
    phase === "enter" || phase === "exit"
      ? editor.lifecycle[phase].length
      : undefined;
  return (
    <section className={styles.canvasStage} aria-labelledby="phase-heading">
      <header className={styles.phaseHeader}>
        <div>
          <p className={styles.eyebrow}>Lifecycle phase</p>
          <h2 className={styles.phaseHeading} id="phase-heading">
            {PHASE_LABELS[phase]}
          </h2>
        </div>
        {actionCount === undefined ? null : (
          <Badge tone="neutral">
            {actionCount} {actionCount === 1 ? "action" : "actions"}
          </Badge>
        )}
      </header>
      <div className={styles.audienceFrame}>
        {phase === "active" ? (
          <div className={styles.framePlaceholder}>
            <p className={styles.frameLabel}>Audience preview</p>
            <strong>Choose the default Layout in Sprint 10</strong>
            <span>
              This canvas will render the stable audience view while the Segment
              is Active.
            </span>
          </div>
        ) : phase === "prepare" ? (
          <div className={styles.framePlaceholder}>
            <p className={styles.frameLabel}>Inferred preparation</p>
            <strong>Nothing is shown to the audience.</strong>
            <span>
              Showflow will prepare required fields, Resources, and Layouts as
              they become available.
            </span>
          </div>
        ) : phase === "cleanup" ? (
          <div className={styles.framePlaceholder}>
            <p className={styles.frameLabel}>Inferred cleanup</p>
            <strong>Temporary production state is cleared.</strong>
            <span>
              Showflow will stop temporary media and release Segment state
              automatically.
            </span>
          </div>
        ) : (
          <div className={styles.framePlaceholder}>
            <p className={styles.frameLabel}>{PHASE_LABELS[phase]} sequence</p>
            <strong>
              {actionCount === 0
                ? "No " + PHASE_LABELS[phase] + " actions yet."
                : String(actionCount) +
                  " saved " +
                  PHASE_LABELS[phase] +
                  " " +
                  (actionCount === 1 ? "action." : "actions.")}
            </strong>
            <span>
              The limited production action builder arrives with lifecycle
              preview in Sprint 12.
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

export const ShowSegmentEditorDestination = () => {
  const navigate = useNavigate();
  const { studioId, showId, segmentId } = useParams<{
    studioId: string;
    showId: string;
    segmentId: string;
  }>();
  const [phase, setPhase] = useState<LifecyclePhase>("active");
  const [selectionError, setSelectionError] = useState<string>();
  const routeIsComplete =
    studioId !== undefined && showId !== undefined && segmentId !== undefined;
  const studioQuery = useQuery({
    enabled: studioId !== undefined,
    queryFn: () => loadStudio(studioId ?? ""),
    queryKey: studioQueryKey(studioId ?? "incomplete"),
    retry: false,
  });
  const designQuery = useQuery({
    enabled: studioId !== undefined && showId !== undefined,
    queryFn: () => loadShowDesign(studioId ?? "", showId ?? ""),
    queryKey: showDesignQueryKey(
      studioId ?? "incomplete",
      showId ?? "incomplete",
    ),
    retry: false,
  });
  const editorQuery = useQuery({
    enabled: routeIsComplete,
    queryFn: () =>
      loadSegmentEditor(studioId ?? "", showId ?? "", segmentId ?? ""),
    queryKey: segmentEditorQueryKey(
      studioId ?? "incomplete",
      showId ?? "incomplete",
      segmentId ?? "incomplete",
    ),
    retry: false,
  });
  const editor = editorQuery.data;
  const mutations = useSegmentEditorMutations(editor);
  const details = useSegmentDetailsDraft(editor, mutations.updateDetails);
  const route =
    editor === undefined || studioId === undefined
      ? undefined
      : "/studio/" +
        studioId +
        "/show/" +
        editor.showId +
        "/design/segments/" +
        editor.id;
  const navigationError = usePersistedNavigation({ route, studioId });
  const run = (operation: Promise<unknown>): void => {
    void operation.catch(() => undefined);
  };
  const returnToBlueprint = (): void => {
    if (studioId !== undefined && showId !== undefined) {
      navigate(getDesignShowRoute(studioId, showId));
    }
  };
  const loading =
    studioQuery.isPending || designQuery.isPending || editorQuery.isPending;
  const error =
    selectionError ??
    navigationError ??
    mutations.error ??
    (editorQuery.error instanceof Error
      ? editorQuery.error.message
      : undefined);

  const inspector =
    editor === undefined || details.draft === undefined ? null : (
      <div className={styles.inspector}>
        <InspectorSection
          description="Reusable details for future uses of this Segment."
          heading="Segment"
        >
          <TextInput
            {...(details.draft.name.trim().length === 0
              ? {
                  error:
                    "Give this Segment a name before using it in production.",
                }
              : {})}
            label="Segment name"
            maxLength={200}
            onChange={(event) =>
              details.update({ name: event.currentTarget.value })
            }
            required
            value={details.draft.name}
          />
          <fieldset className={styles.durationFieldset}>
            <legend>Expected duration</legend>
            <div className={styles.durationControls}>
              <TextInput
                className={styles.durationInput}
                label="Minutes"
                min={0}
                onChange={(event) =>
                  details.updateDuration(
                    event.currentTarget.value,
                    details.duration.seconds,
                  )
                }
                step={1}
                type="number"
                value={details.duration.minutes}
              />
              <TextInput
                className={styles.durationInput}
                label="Seconds"
                max={59}
                min={0}
                onChange={(event) =>
                  details.updateDuration(
                    details.duration.minutes,
                    event.currentTarget.value,
                  )
                }
                step={1}
                type="number"
                value={details.duration.seconds}
              />
            </div>
            <p className={styles.fieldHint}>Used as an estimated runtime.</p>
          </fieldset>
        </InspectorSection>
        {phase === "active" ? (
          <>
            <SegmentDataFieldEditor
              fields={editor.dataFields}
              isSaving={mutations.isSaving}
              onCreate={mutations.createField}
              onDelete={mutations.deleteField}
              onReorder={mutations.reorderFields}
              onUpdate={mutations.updateField}
            />
            <InspectorSection
              description="These reusable production controls depend on later MVP foundations."
              heading="Active configuration"
            >
              <dl className={styles.dependencyList}>
                <div>
                  <dt>Default Layout</dt>
                  <dd>Available after Layouts arrive in Sprint 10.</dd>
                </div>
                <div>
                  <dt>Available Layouts</dt>
                  <dd>Available after Layouts arrive in Sprint 10.</dd>
                </div>
                <div>
                  <dt>Host Cues</dt>
                  <dd>Available after Host Cues arrive in Sprint 13.</dd>
                </div>
              </dl>
            </InspectorSection>
          </>
        ) : (
          <InspectorSection
            description={
              phase === "prepare" || phase === "cleanup"
                ? "Showflow infers this technical work from the Segment configuration."
                : "Ordered production actions are stored now; editing arrives with lifecycle preview."
            }
            heading={PHASE_LABELS[phase] + " summary"}
          >
            <p className={styles.dependencyCopy}>
              {phase === "prepare"
                ? "Showflow will validate content and prepare referenced Resources and Layouts."
                : phase === "cleanup"
                  ? "Showflow will clear temporary state and stop temporary media."
                  : String(editor.lifecycle[phase].length) +
                    " saved " +
                    PHASE_LABELS[phase] +
                    " " +
                    (editor.lifecycle[phase].length === 1
                      ? "action. "
                      : "actions. ") +
                    "The action builder arrives in Sprint 12."}
            </p>
          </InspectorSection>
        )}
      </div>
    );

  return (
    <ApplicationShell
      breadcrumb={
        <span>
          {designQuery.data?.show.name ?? "Show"} / {editor?.name ?? "Segment"}
        </span>
      }
      historyActions={
        <>
          <IconButton
            disabled={!mutations.canUndo || mutations.isSaving}
            icon="undo"
            label="Undo Segment change"
            onClick={() => run(mutations.undo())}
            tooltip="Undo"
          />
          <IconButton
            disabled={!mutations.canRedo || mutations.isSaving}
            icon="redo"
            label="Redo Segment change"
            onClick={() => run(mutations.redo())}
            tooltip="Redo"
          />
        </>
      }
      inspector={inspector}
      inspectorLabel="Segment inspector"
      notes={
        details.draft === undefined ? null : (
          <NotesPanel
            className={styles.notesPanel}
            heading="Notes template"
            onChange={(event) =>
              details.update({ notesTemplate: event.currentTarget.value })
            }
            placeholder="Add speaking prompts and reminders for future Episodes."
            prompt="New Episode Segments begin with this plain-text template. Line breaks are preserved."
            role="group"
            value={details.draft.notesTemplate}
          />
        )
      }
      notesLabel="Notes template"
      primaryAction={
        <Button onClick={returnToBlueprint} variant="primary">
          Return to Blueprint
        </Button>
      }
      saveState={<SaveStateIndicator state={mutations.saveState} />}
      scope={<ScopeLabel scope="show-segment" />}
      studioSwitcher={
        studioQuery.data === undefined ? (
          <Button disabled size="small" variant="ghost">
            Studio
          </Button>
        ) : (
          <StudioSwitcher
            currentStudio={studioQuery.data}
            onSelectionError={setSelectionError}
          />
        )
      }
      title={details.draft?.name || editor?.name || "Show Segment"}
    >
      <div className={styles.workspace}>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        {loading ? (
          <section aria-label="Loading Show Segment">
            <Skeleton label="Loading Show Segment editor" />
          </section>
        ) : !routeIsComplete || editorQuery.isError || editor === undefined ? (
          <section className={styles.unavailable}>
            <p className={styles.eyebrow}>Show Segment unavailable</p>
            <h2>Showflow could not open this Segment</h2>
            <p>Return to Design Show and choose an available Segment.</p>
            <Button
              onClick={() => {
                if (studioId !== undefined && showId !== undefined) {
                  navigate(getDesignShowRoute(studioId, showId));
                } else if (studioId !== undefined) {
                  navigate(getStudioHomeRoute(studioId));
                }
              }}
            >
              Return to Design Show
            </Button>
          </section>
        ) : (
          <>
            <header className={styles.editorHeader}>
              <div>
                <p className={styles.eyebrow}>Show Segment</p>
                <p className={styles.scopeDetail}>
                  Changes apply when this Segment is added in the future.
                  Existing Episode instances keep their current configuration
                  unless updated manually.
                </p>
                {editor.description === null ? null : (
                  <p className={styles.scopeDetail}>{editor.description}</p>
                )}
              </div>
              <Badge
                tone={
                  editor.validationIssues.length > 0 ? "warning" : "success"
                }
              >
                {editor.validationIssues.length > 0
                  ? String(editor.validationIssues.length) + " needs attention"
                  : "Definition ready"}
              </Badge>
            </header>
            <Tabs
              items={(
                ["prepare", "enter", "active", "exit", "cleanup"] as const
              ).map((targetPhase) => ({
                content: <PhaseCanvas editor={editor} phase={targetPhase} />,
                label: PHASE_LABELS[targetPhase],
                value: targetPhase,
              }))}
              label="Segment lifecycle"
              onValueChange={(value) => setPhase(value as LifecyclePhase)}
              value={phase}
            />
          </>
        )}
      </div>
    </ApplicationShell>
  );
};
