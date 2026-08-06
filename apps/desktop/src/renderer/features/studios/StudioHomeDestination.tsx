import {
  ApplicationShell,
  Button,
  EmptyState,
  Skeleton,
  TextInput,
} from "@showflow/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { StudioSwitcher } from "./StudioSwitcher";
import { loadStudio, studioQueryKey } from "./studio-queries";
import styles from "./studio-pages.module.css";
import { getShowCreationRoute } from "../../app-routes.mts";
import { getShowDetailRoute } from "../../app-routes.mts";
import type { ShowCardDto, ShowDesignDto, ShowDto } from "@showflow/contracts";
import { ShowCard } from "../shows/ShowCard";
import {
  loadStudioShows,
  showDesignQueryKey,
  studioShowsQueryKey,
} from "../shows/show-queries";

const incompleteStudioRouteMessage =
  "This Studio route is incomplete. Return to Studio setup.";

export const StudioHomeDestination = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { studioId } = useParams<{ studioId: string }>();
  const studioQuery = useQuery({
    queryFn: () => {
      if (studioId === undefined) throw new Error(incompleteStudioRouteMessage);

      return loadStudio(studioId);
    },
    queryKey: studioQueryKey(studioId ?? "incomplete"),
    retry: false,
  });
  const showsQuery = useQuery({
    enabled: studioId !== undefined && studioQuery.isSuccess,
    queryFn: () => loadStudioShows(studioId ?? ""),
    queryKey: studioShowsQueryKey(studioId ?? "incomplete"),
    retry: false,
  });
  const [selectionError, setSelectionError] = useState<string>();
  const studio = studioQuery.data;
  const showCards = showsQuery.data ?? [];
  const updateCards = (
    update: (cards: readonly ShowCardDto[]) => readonly ShowCardDto[],
  ): void => {
    if (studioId === undefined) return;
    queryClient.setQueryData<readonly ShowCardDto[]>(
      studioShowsQueryKey(studioId),
      (cards = []) => update(cards),
    );
  };
  const renameShow = async (show: ShowDto, name: string): Promise<void> => {
    const result = await window.showflow.shows.rename({
      studioId: show.studioId,
      showId: show.id,
      name,
    });
    if (!result.ok) throw new Error(result.error.message);
    updateCards((cards) =>
      cards.map((card) =>
        card.show.id === show.id ? { ...card, show: result.data } : card,
      ),
    );
    queryClient.setQueryData<ShowDesignDto>(
      showDesignQueryKey(show.studioId, show.id),
      (design) =>
        design === undefined ? design : { ...design, show: result.data },
    );
  };
  const archiveShow = async (show: ShowDto): Promise<void> => {
    const result = await window.showflow.shows.archive({
      studioId: show.studioId,
      showId: show.id,
    });
    if (!result.ok) throw new Error(result.error.message);
    updateCards((cards) => cards.filter((card) => card.show.id !== show.id));
    queryClient.removeQueries({
      queryKey: showDesignQueryKey(show.studioId, show.id),
    });
  };
  const deleteShow = async (show: ShowDto): Promise<void> => {
    const result = await window.showflow.shows.delete({
      studioId: show.studioId,
      showId: show.id,
    });
    if (!result.ok) throw new Error(result.error.message);
    updateCards((cards) => cards.filter((card) => card.show.id !== show.id));
    queryClient.removeQueries({
      queryKey: showDesignQueryKey(show.studioId, show.id),
    });
  };
  const loadErrorMessage = studioQuery.isError
    ? studioQuery.error instanceof Error
      ? studioQuery.error.message
      : "Showflow could not load this Studio. Your saved work was not changed. Try again."
    : undefined;

  return (
    <ApplicationShell
      breadcrumb={<span>Studio</span>}
      primaryAction={
        studioQuery.isError ? (
          <Button onClick={() => navigate("/studio/new")} variant="primary">
            Return to Studio setup
          </Button>
        ) : studio !== undefined && showCards.length > 0 ? (
          <Button
            leadingIcon="plus"
            onClick={() => navigate(getShowCreationRoute(studio.id))}
            variant="primary"
          >
            New Show
          </Button>
        ) : (
          <span />
        )
      }
      studioSwitcher={
        studio === undefined ? (
          <Button disabled size="small" variant="ghost">
            Studio
          </Button>
        ) : (
          <StudioSwitcher
            currentStudio={studio}
            onSelectionError={setSelectionError}
          />
        )
      }
      title={studio?.name ?? "Studio Home"}
    >
      <div
        className={
          studio === undefined ? styles.workspace : styles.homeWorkspace
        }
      >
        {selectionError ? (
          <p className={styles.switcherError} role="alert">
            {selectionError}
          </p>
        ) : null}
        {studioQuery.isPending ||
        (studioQuery.isSuccess && showsQuery.isPending) ? (
          <section aria-label="Loading Studio" className={styles.card}>
            <Skeleton label="Loading Studio" />
            <Skeleton label="Loading Studio details" />
          </section>
        ) : studioQuery.isError ? (
          <section
            aria-labelledby="studio-error-heading"
            className={styles.card}
          >
            <p className={styles.eyebrow}>Studio unavailable</p>
            <h2 className={styles.heading} id="studio-error-heading">
              Showflow could not open this Studio
            </h2>
            <p className={styles.message} role="alert">
              {loadErrorMessage}
            </p>
          </section>
        ) : showsQuery.isError ? (
          <section
            aria-labelledby="shows-error-heading"
            className={styles.card}
          >
            <p className={styles.eyebrow}>Shows unavailable</p>
            <h2 className={styles.heading} id="shows-error-heading">
              Showflow could not load this Studio’s Shows
            </h2>
            <p className={styles.message} role="alert">
              {showsQuery.error instanceof Error
                ? showsQuery.error.message
                : "Your saved work was not changed. Try again."}
            </p>
            <Button onClick={() => void showsQuery.refetch()}>
              Retry loading Shows
            </Button>
          </section>
        ) : (
          <>
            <header className={styles.homeHeader}>
              <div className={styles.homeIntro}>
                <p className={styles.eyebrow}>Studio Home</p>
                <h2 className={styles.heading}>Shows</h2>
                <p className={styles.description}>
                  Design reusable productions and create new Episodes from them.
                </p>
              </div>
              <div className={styles.showSearch}>
                <TextInput
                  disabled
                  helpText={
                    showCards.length === 0
                      ? "Create a Show to start searching."
                      : "Show search arrives in Sprint 4.8."
                  }
                  label="Search Shows"
                  placeholder="Search Shows"
                  type="search"
                />
              </div>
            </header>
            <section aria-label="Shows" className={styles.showGrid}>
              {showCards.length === 0 ? (
                <EmptyState
                  action={
                    <Button
                      leadingIcon="plus"
                      onClick={() => {
                        if (studio !== undefined)
                          navigate(getShowCreationRoute(studio.id));
                      }}
                      variant="primary"
                    >
                      New Show
                    </Button>
                  }
                  className={styles.emptyShowState}
                  description="Design a reusable production once, then create new Episodes from it."
                  heading="Create your first Show"
                  icon="plus"
                />
              ) : (
                showCards.map((card) => (
                  <ShowCard
                    card={card}
                    key={card.show.id}
                    onArchive={archiveShow}
                    onDelete={deleteShow}
                    onOpen={(show) =>
                      navigate(getShowDetailRoute(show.studioId, show.id))
                    }
                    onRename={renameShow}
                  />
                ))
              )}
            </section>
          </>
        )}
      </div>
    </ApplicationShell>
  );
};
