import {
  ApplicationShell,
  Button,
  EmptyState,
  Skeleton,
  TextInput,
} from "@showflow/ui";
import type { ShowCardDto } from "@showflow/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getDesignShowRoute,
  getProduceEpisodeRoute,
  getShowDetailRoute,
} from "../../app-routes.mts";
import { StudioSwitcher } from "../studios/StudioSwitcher";
import { loadStudio, studioQueryKey } from "../studios/studio-queries";
import {
  loadShowDesign,
  showDesignQueryKey,
  studioShowsQueryKey,
} from "../shows/show-queries";
import { episodeListQueryKey, episodeQueryKey } from "./episode-queries";
import styles from "./episodes.module.css";

export const EpisodeCreationPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { studioId, showId } = useParams<{
    studioId: string;
    showId: string;
  }>();
  const [title, setTitle] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [selectionError, setSelectionError] = useState<string>();
  const routeIsComplete = studioId !== undefined && showId !== undefined;
  const studioQuery = useQuery({
    enabled: studioId !== undefined,
    queryFn: () => loadStudio(studioId ?? ""),
    queryKey: studioQueryKey(studioId ?? "incomplete"),
    retry: false,
  });
  const designQuery = useQuery({
    enabled: routeIsComplete,
    queryFn: () => loadShowDesign(studioId ?? "", showId ?? ""),
    queryKey: showDesignQueryKey(
      studioId ?? "incomplete",
      showId ?? "incomplete",
    ),
    retry: false,
  });
  const design = designQuery.data;
  const blueprintIsEmpty = design?.blueprint.placementCount === 0;

  const createEpisode = async (source: "blueprint" | "blank") => {
    if (studioId === undefined || showId === undefined) return;
    if (title.trim().length === 0) {
      setError("Enter an Episode title.");
      return;
    }
    const parsedNumber = episodeNumber.trim().length
      ? Number(episodeNumber)
      : undefined;
    if (
      parsedNumber !== undefined &&
      (!Number.isInteger(parsedNumber) || parsedNumber < 0)
    ) {
      setError("Episode number must be a whole number of zero or greater.");
      return;
    }
    setError(undefined);
    setIsSaving(true);
    try {
      const result = await window.showflow.episodes.create({
        showId,
        source,
        studioId,
        title: title.trim(),
        ...(parsedNumber === undefined ? {} : { episodeNumber: parsedNumber }),
        ...(plannedDate.length === 0 ? {} : { plannedDate }),
      });
      if (!result.ok) throw new Error(result.error.message);
      queryClient.setQueryData(
        episodeQueryKey(studioId, showId, result.data.episode.id),
        result.data,
      );
      queryClient.setQueryData<readonly ShowCardDto[]>(
        studioShowsQueryKey(studioId),
        (cards) =>
          cards?.map((card) =>
            card.show.id === showId
              ? { ...card, episodeCount: card.episodeCount + 1 }
              : card,
          ),
      );
      await queryClient.invalidateQueries({
        queryKey: episodeListQueryKey(studioId, showId),
      });
      await queryClient.invalidateQueries({
        queryKey: studioShowsQueryKey(studioId),
      });
      navigate(
        getProduceEpisodeRoute(studioId, showId, result.data.episode.id),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Showflow could not create the Episode. Nothing was saved.",
      );
    } finally {
      setIsSaving(false);
    }
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
      primaryAction={null}
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
      title="New Episode"
    >
      <div className={styles.creationWorkspace}>
        {designQuery.isPending || studioQuery.isPending ? (
          <section aria-label="Loading New Episode" className={styles.formCard}>
            <Skeleton label="Loading Episode form" />
          </section>
        ) : design === undefined || !routeIsComplete ? (
          <EmptyState
            action={null}
            description="Return to Show Detail and try again."
            heading="Showflow could not start a new Episode"
          />
        ) : (
          <section
            aria-labelledby="new-episode-heading"
            className={styles.formCard}
          >
            <div className={styles.intro}>
              <p className={styles.eyebrow}>Produce Episode</p>
              <h2 className={styles.heading} id="new-episode-heading">
                Create a new Episode
              </h2>
              <p className={styles.description}>
                {blueprintIsEmpty
                  ? "This Show does not have a Blueprint yet. Add the details, then design the Show or explicitly create a blank Episode."
                  : `Start from ${design.blueprint.placementCount} reusable Segment${design.blueprint.placementCount === 1 ? "" : "s"} in the current Show Blueprint.`}
              </p>
            </div>
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                if (!blueprintIsEmpty) void createEpisode("blueprint");
              }}
            >
              <TextInput
                autoFocus
                label="Episode title"
                maxLength={200}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Week 32"
                required
                value={title}
              />
              <div className={styles.formRow}>
                <TextInput
                  inputMode="numeric"
                  label="Episode number (optional)"
                  min="0"
                  onChange={(event) => setEpisodeNumber(event.target.value)}
                  type="number"
                  value={episodeNumber}
                />
                <TextInput
                  label="Planned date (optional)"
                  onChange={(event) => setPlannedDate(event.target.value)}
                  type="date"
                  value={plannedDate}
                />
              </div>
              {(selectionError ?? error) ? (
                <p className={styles.error} role="alert">
                  {selectionError ?? error}
                </p>
              ) : null}
              <div className={styles.actions}>
                {blueprintIsEmpty ? (
                  <>
                    <Button
                      disabled={isSaving}
                      onClick={() =>
                        navigate(getDesignShowRoute(studioId, showId))
                      }
                    >
                      Design Show
                    </Button>
                    <Button
                      disabled={isSaving}
                      onClick={() => void createEpisode("blank")}
                      variant="primary"
                    >
                      {isSaving ? "Creating Episode…" : "Create Blank Episode"}
                    </Button>
                  </>
                ) : (
                  <Button disabled={isSaving} type="submit" variant="primary">
                    {isSaving ? "Creating Episode…" : "Create Episode"}
                  </Button>
                )}
              </div>
            </form>
          </section>
        )}
      </div>
    </ApplicationShell>
  );
};
