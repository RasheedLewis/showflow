import {
  ApplicationShell,
  Badge,
  Button,
  IconButton,
  SaveStateIndicator,
  ScopeLabel,
  Skeleton,
} from "@showflow/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getProduceEpisodeRoute,
  getEpisodeSegmentRoute,
  getShowDetailRoute,
} from "../../app-routes.mts";
import { usePersistedNavigation } from "../navigation/usePersistedNavigation";
import { SegmentPicker } from "../shows/SegmentPicker";
import { loadShowDesign, showDesignQueryKey } from "../shows/show-queries";
import { StudioSwitcher } from "../studios/StudioSwitcher";
import { loadStudio, studioQueryKey } from "../studios/studio-queries";
import { EpisodeStoryboard } from "./EpisodeStoryboard";
import { episodeQueryKey, loadEpisode } from "./episode-queries";
import styles from "./episodes.module.css";
import { useEpisodeMutations } from "./useEpisodeMutations";

const formatRuntime = (durationMs: number): string => {
  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.floor((durationMs % 60_000) / 1_000);
  return minutes > 0
    ? `${minutes} min${seconds > 0 ? ` ${seconds} sec` : ""}`
    : `${seconds} sec`;
};

export const ProduceEpisodeDestination = () => {
  const navigate = useNavigate();
  const { studioId, showId, episodeId } = useParams<{
    studioId: string;
    showId: string;
    episodeId: string;
  }>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectionError, setSelectionError] = useState<string>();
  const routeIsComplete =
    studioId !== undefined && showId !== undefined && episodeId !== undefined;
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
  const mutations = useEpisodeMutations(storyboard);
  const navigationError = usePersistedNavigation({
    route:
      storyboard === undefined
        ? undefined
        : getProduceEpisodeRoute(
            storyboard.show.studioId,
            storyboard.show.id,
            storyboard.episode.id,
          ),
    studioId: storyboard?.show.studioId,
  });
  const run = (operation: Promise<unknown>): void => {
    void operation.catch(() => undefined);
  };

  return (
    <ApplicationShell
      breadcrumb={
        studioId === undefined || showId === undefined ? (
          <span>Show Detail</span>
        ) : (
          <Button
            onClick={() => navigate(getShowDetailRoute(studioId, showId))}
            size="small"
            variant="ghost"
          >
            Back to Show Detail
          </Button>
        )
      }
      historyActions={
        <>
          <IconButton
            disabled={!mutations.canUndo || mutations.isSaving}
            icon="undo"
            label="Undo Episode change"
            onClick={() => run(mutations.undo())}
            tooltip="Undo"
          />
          <IconButton
            disabled={!mutations.canRedo || mutations.isSaving}
            icon="redo"
            label="Redo Episode change"
            onClick={() => run(mutations.redo())}
            tooltip="Redo"
          />
        </>
      }
      primaryAction={
        <Button
          disabled={storyboard === undefined || mutations.isSaving}
          leadingIcon="plus"
          onClick={() => setPickerOpen(true)}
          variant="primary"
        >
          Add Segment
        </Button>
      }
      saveState={<SaveStateIndicator state={mutations.saveState} />}
      scope={<ScopeLabel scope="episode" />}
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
      title={storyboard?.episode.title ?? "Produce Episode"}
    >
      <div className={styles.workspace}>
        {(selectionError ?? navigationError ?? mutations.error) ? (
          <p className={styles.error} role="alert">
            {selectionError ?? navigationError ?? mutations.error}
          </p>
        ) : null}
        {episodeQuery.isPending || studioQuery.isPending ? (
          <section aria-label="Loading Episode Storyboard">
            <Skeleton label="Loading Episode Storyboard" />
          </section>
        ) : storyboard === undefined ? (
          <section className={styles.formCard}>
            <p className={styles.eyebrow}>Episode unavailable</p>
            <h2 className={styles.heading}>
              Showflow could not open this Episode
            </h2>
            <p className={styles.error} role="alert">
              {episodeQuery.error instanceof Error
                ? episodeQuery.error.message
                : "Return to Show Detail and choose an available Episode."}
            </p>
          </section>
        ) : (
          <>
            <header className={styles.episodeHeader}>
              <div className={styles.intro}>
                <p className={styles.eyebrow}>Produce Episode</p>
                <h2 className={styles.heading}>{storyboard.episode.title}</h2>
                <p className={styles.showContext}>
                  <span>Show</span>
                  <strong>{storyboard.show.name}</strong>
                </p>
                <p className={styles.description}>
                  Changes apply only to this Episode.
                </p>
              </div>
              <Badge
                tone={
                  storyboard.episode.status === "ready" ? "success" : "info"
                }
              >
                {storyboard.episode.status === "ready" ? "Ready" : "Draft"}
              </Badge>
            </header>
            <section aria-label="Episode progress" className={styles.progress}>
              <div>
                <strong>{storyboard.progress.segmentCount}</strong>
                <span>Segments</span>
              </div>
              <div>
                <strong>{storyboard.progress.readyCount}</strong>
                <span>Ready</span>
              </div>
              <div>
                <strong>{storyboard.progress.needsContentCount}</strong>
                <span>Need content</span>
              </div>
              <div>
                <strong>
                  {formatRuntime(storyboard.progress.estimatedRuntimeMs)}
                </strong>
                <span>Estimated runtime</span>
              </div>
            </section>
            <div className={styles.toolbar}>
              <p className={styles.description}>
                Arrange this Episode’s Storyboard from left to right.
              </p>
              <Button leadingIcon="plus" onClick={() => setPickerOpen(true)}>
                Add Segment
              </Button>
            </div>
            <EpisodeStoryboard
              items={storyboard.items}
              onAddFirst={() => setPickerOpen(true)}
              onDuplicate={(id) => run(mutations.duplicate(id))}
              onOpen={(id) =>
                navigate(
                  getEpisodeSegmentRoute(
                    storyboard.show.studioId,
                    storyboard.show.id,
                    storyboard.episode.id,
                    id,
                  ),
                )
              }
              onRemove={(id) => run(mutations.remove(id))}
              onReorder={mutations.reorder}
            />
          </>
        )}
      </div>
      {storyboard === undefined || designQuery.data === undefined ? null : (
        <SegmentPicker
          isSaving={mutations.isSaving}
          mode="episode"
          onAdd={mutations.addExisting}
          onCreate={mutations.createSegment}
          onOpenChange={setPickerOpen}
          open={pickerOpen}
          segments={designQuery.data.segments}
        />
      )}
    </ApplicationShell>
  );
};
