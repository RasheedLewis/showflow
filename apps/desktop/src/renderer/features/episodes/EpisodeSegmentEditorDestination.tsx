import {
  ApplicationShell,
  Badge,
  Button,
  InspectorSection,
  NotesPanel,
  SaveStateIndicator,
  ScopeLabel,
  Skeleton,
  StatusBadge,
  TextInput,
} from "@showflow/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getDesignShowSegmentRoute,
  getEpisodeSegmentRoute,
  getProduceEpisodeRoute,
} from "../../app-routes.mts";
import { ParentNavigation } from "../navigation/ParentNavigation";
import {
  createNavigationFocusState,
  createNavigationOriginState,
} from "../navigation/navigation-origin.mts";
import { usePersistedNavigation } from "../navigation/usePersistedNavigation";
import { StudioSwitcher } from "../studios/StudioSwitcher";
import { loadStudio, studioQueryKey } from "../studios/studio-queries";
import { EpisodeSegmentFieldControl } from "./EpisodeSegmentFieldControl";
import { episodeQueryKey, loadEpisode } from "./episode-queries";
import styles from "./episode-segment-editor.module.css";
import { useEpisodeSegmentContent } from "./useEpisodeSegmentContent";

const durationParts = (
  durationMs: number | null,
): { readonly minutes: string; readonly seconds: string } =>
  durationMs === null
    ? { minutes: "", seconds: "" }
    : {
        minutes: String(Math.floor(durationMs / 60_000)),
        seconds: String(Math.floor((durationMs % 60_000) / 1_000)),
      };

export const EpisodeSegmentEditorDestination = () => {
  const navigate = useNavigate();
  const { studioId, showId, episodeId, episodeSegmentId } = useParams<{
    studioId: string;
    showId: string;
    episodeId: string;
    episodeSegmentId: string;
  }>();
  const [selectionError, setSelectionError] = useState<string>();
  const [navigationPending, setNavigationPending] = useState(false);
  const routeIsComplete =
    studioId !== undefined &&
    showId !== undefined &&
    episodeId !== undefined &&
    episodeSegmentId !== undefined;
  const studioQuery = useQuery({
    enabled: studioId !== undefined,
    queryFn: () => loadStudio(studioId ?? ""),
    queryKey: studioQueryKey(studioId ?? "incomplete"),
    retry: false,
  });
  const episodeQuery = useQuery({
    enabled: routeIsComplete,
    queryFn: () => loadEpisode(studioId ?? "", showId ?? "", episodeId ?? ""),
    queryKey: episodeQueryKey(
      studioId ?? "incomplete",
      showId ?? "incomplete",
      episodeId ?? "incomplete",
    ),
    retry: false,
  });
  const storyboard = episodeQuery.data;
  const orderedItems = [...(storyboard?.items ?? [])].sort(
    (left, right) =>
      left.episodeSegment.position - right.episodeSegment.position,
  );
  const itemIndex = orderedItems.findIndex(
    ({ episodeSegment }) => episodeSegment.id === episodeSegmentId,
  );
  const item = orderedItems[itemIndex];
  const content = useEpisodeSegmentContent(storyboard, item);
  const route =
    routeIsComplete && item !== undefined
      ? getEpisodeSegmentRoute(
          studioId,
          showId,
          episodeId,
          item.episodeSegment.id,
        )
      : undefined;
  const navigationError = usePersistedNavigation({ route, studioId });

  const go = async (target: string, state?: unknown): Promise<void> => {
    setNavigationPending(true);
    try {
      await content.flush();
      navigate(target, { state });
    } finally {
      setNavigationPending(false);
    }
  };
  const previous = orderedItems[itemIndex - 1];
  const next = orderedItems[itemIndex + 1];
  const fieldIssue = (key: string): string | undefined =>
    item?.validationIssues.find(({ fieldKey }) => fieldKey === key)?.message;
  const focusContentField = (key: string): void => {
    const focus = (): boolean => {
      const field = document.getElementById(`episode-field-${key}`);
      field?.focus();
      return field !== null;
    };

    if (focus()) return;

    document
      .querySelector<HTMLButtonElement>(
        'button[aria-label="Open Episode content"]',
      )
      ?.click();
    window.setTimeout(focus, 0);
  };
  const draft = content.draft;
  const duration = durationParts(draft?.expectedDurationOverrideMs ?? null);
  const updateDuration = (minutes: string, seconds: string): void => {
    if (draft === undefined) return;
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
    content.update({
      ...draft,
      expectedDurationOverrideMs:
        minutes === "" && seconds === ""
          ? null
          : (parsedMinutes * 60 + parsedSeconds) * 1_000,
    });
  };
  const returnRoute =
    studioId !== undefined && showId !== undefined && episodeId !== undefined
      ? getProduceEpisodeRoute(studioId, showId, episodeId)
      : "/";
  const disabled = navigationPending;
  const error =
    selectionError ??
    navigationError ??
    content.error ??
    (episodeQuery.error instanceof Error
      ? episodeQuery.error.message
      : undefined);
  const resourceContext = routeIsComplete
    ? {
        scope: "episode" as const,
        studioId,
        showId,
        episodeId,
      }
    : undefined;

  const catalog =
    item === undefined ||
    draft === undefined ||
    resourceContext === undefined ? null : (
      <div className={styles.contentPanel}>
        <header className={styles.panelHeader}>
          <p className={styles.eyebrow}>Episode content</p>
          <h2>Content fields</h2>
          <p>Required fields are marked and update readiness as they save.</p>
        </header>
        {item.dataFields.length === 0 ? (
          <p className={styles.emptyCopy}>
            This Show Segment does not define Episode content fields yet.
          </p>
        ) : (
          <div className={styles.fields}>
            {item.dataFields.map((field) => (
              <EpisodeSegmentFieldControl
                draft={draft}
                field={field}
                {...(fieldIssue(field.key) === undefined
                  ? {}
                  : { issue: fieldIssue(field.key) })}
                key={field.id}
                onUpdate={content.update}
                resourceContext={resourceContext}
              />
            ))}
          </div>
        )}
      </div>
    );
  const inspector =
    item === undefined || draft === undefined ? null : (
      <div className={styles.inspector}>
        <InspectorSection
          description="Current Episode state and limited local overrides."
          heading="Segment summary"
        >
          <div className={styles.statusRow}>
            <StatusBadge status={item.readiness} />
            <span>{item.validationIssueCount} issues</span>
          </div>
          <p className={styles.sourceCopy}>
            Source Show Segment: <strong>{item.sourceSegment.name}</strong>
          </p>
          <Button
            id={`navigation-origin-show-segment-${item.episodeSegment.id}`}
            onClick={() =>
              void go(
                getDesignShowSegmentRoute(
                  storyboard?.show.studioId ?? "",
                  item.sourceSegment.showId,
                  item.sourceSegment.id,
                ),
                createNavigationOriginState({
                  focusId: `navigation-origin-show-segment-${item.episodeSegment.id}`,
                  label: "Episode Segment",
                  returnTo: route ?? returnRoute,
                }),
              )
            }
            size="small"
            variant="ghost"
          >
            View Show Segment
          </Button>
        </InspectorSection>
        <InspectorSection
          description="Used in the estimated Episode runtime."
          heading="Expected duration"
        >
          <div className={styles.durationControls}>
            <TextInput
              label="Minutes"
              min={0}
              onChange={(event) =>
                updateDuration(event.currentTarget.value, duration.seconds)
              }
              step={1}
              type="number"
              value={duration.minutes}
            />
            <TextInput
              label="Seconds"
              max={59}
              min={0}
              onChange={(event) =>
                updateDuration(duration.minutes, event.currentTarget.value)
              }
              step={1}
              type="number"
              value={duration.seconds}
            />
          </div>
          <div className={styles.sourceRow}>
            <Badge tone="neutral">Show default</Badge>
            {draft.expectedDurationOverrideMs === null ? null : (
              <>
                <Badge tone="accent">Episode override</Badge>
                <Button
                  onClick={() =>
                    content.update({
                      ...draft,
                      expectedDurationOverrideMs: null,
                    })
                  }
                  size="small"
                  variant="ghost"
                >
                  Reset to Show default
                </Button>
              </>
            )}
          </div>
        </InspectorSection>
        <InspectorSection
          description="Choose an issue to move focus to its content field."
          heading="Validation"
        >
          {item.validationIssues.length === 0 ? (
            <p className={styles.readyCopy}>All required content is ready.</p>
          ) : (
            <ul className={styles.issueList}>
              {item.validationIssues.map((issue) => (
                <li key={`${issue.code}-${issue.fieldKey}`}>
                  <button
                    onClick={() => focusContentField(issue.fieldKey)}
                    type="button"
                  >
                    {issue.message}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </InspectorSection>
      </div>
    );
  const notes =
    item === undefined || draft === undefined ? null : (
      <NotesPanel
        actions={
          draft.notes === item.sourceNotesTemplate ? (
            <Badge tone="neutral">Show default</Badge>
          ) : (
            <div className={styles.sourceRow}>
              <Badge tone="accent">Episode override</Badge>
              <Button
                onClick={() =>
                  content.update({ ...draft, notes: item.sourceNotesTemplate })
                }
                size="small"
                variant="ghost"
              >
                Reset to Show default
              </Button>
            </div>
          )
        }
        heading="Episode notes"
        onChange={(event) =>
          content.update({ ...draft, notes: event.currentTarget.value })
        }
        placeholder="Add speaking prompts and production reminders."
        prompt="These notes belong only to this Episode Segment."
        value={draft.notes}
      />
    );

  return (
    <ApplicationShell
      catalog={catalog}
      catalogLabel="Episode content"
      defaultCatalogOpen
      inspector={inspector}
      inspectorLabel="Episode Segment inspector"
      notes={notes}
      notesLabel="Episode Segment notes area"
      parentNavigation={
        <ParentNavigation
          accessibleLabel="Back to Episode Storyboard"
          disabled={navigationPending}
          label="Storyboard"
          onClick={(event) => {
            event.preventDefault();
            void go(
              returnRoute,
              createNavigationFocusState(
                `navigation-origin-episode-${item?.episodeSegment.id ?? "missing"}`,
              ),
            );
          }}
          to={returnRoute}
        />
      }
      saveState={<SaveStateIndicator state={content.saveState} />}
      scope={<ScopeLabel scope="episode-segment" />}
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
      title={item?.sourceSegment.name ?? "Episode Segment"}
    >
      <div className={styles.workspace}>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        {episodeQuery.isPending || studioQuery.isPending ? (
          <Skeleton label="Loading Episode Segment" />
        ) : item === undefined ? (
          <section className={styles.unavailable}>
            <p className={styles.eyebrow}>Episode Segment unavailable</p>
            <h2>Showflow could not open this Segment</h2>
            <p>Return to the Storyboard and choose an available Segment.</p>
          </section>
        ) : (
          <>
            <header className={styles.editorHeader}>
              <div>
                <p className={styles.eyebrow}>Episode Segment</p>
                <h2>{item.sourceSegment.name}</h2>
                <p>
                  Source Show Segment:{" "}
                  <strong>{item.sourceSegment.name}</strong>
                </p>
              </div>
              <StatusBadge status={item.readiness} />
            </header>
            <section
              aria-label="Audience canvas placeholder"
              className={styles.canvasStage}
            >
              <div className={styles.audienceFrame}>
                <p className={styles.frameLabel}>Audience preview</p>
                <strong>Episode content is ready for a Layout.</strong>
                <span>
                  The current Active Layout will render here when Layouts arrive
                  in Sprint 10.
                </span>
              </div>
            </section>
            <nav
              aria-label="Episode Segment navigation"
              className={styles.navigation}
            >
              <Button
                aria-label={
                  previous === undefined
                    ? "Previous Segment"
                    : `Previous Segment: ${previous.sourceSegment.name}`
                }
                disabled={disabled || previous === undefined}
                onClick={() =>
                  previous === undefined || storyboard === undefined
                    ? undefined
                    : void go(
                        getEpisodeSegmentRoute(
                          storyboard.show.studioId,
                          storyboard.show.id,
                          storyboard.episode.id,
                          previous.episodeSegment.id,
                        ),
                      )
                }
              >
                Previous Segment
              </Button>
              <span className={styles.sequencePosition}>
                Segment {itemIndex + 1} of {orderedItems.length}
              </span>
              <Button
                aria-label={
                  next === undefined
                    ? "Next Segment"
                    : `Next Segment: ${next.sourceSegment.name}`
                }
                disabled={disabled || next === undefined}
                onClick={() =>
                  next === undefined || storyboard === undefined
                    ? undefined
                    : void go(
                        getEpisodeSegmentRoute(
                          storyboard.show.studioId,
                          storyboard.show.id,
                          storyboard.episode.id,
                          next.episodeSegment.id,
                        ),
                      )
                }
              >
                Next Segment
              </Button>
            </nav>
          </>
        )}
      </div>
    </ApplicationShell>
  );
};
