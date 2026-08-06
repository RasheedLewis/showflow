import {
  ApplicationShell,
  Button,
  EmptyState,
  IconButton,
  Skeleton,
} from "@showflow/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getDesignShowRoute, getStudioHomeRoute } from "../../app-routes.mts";
import { StudioSwitcher } from "../studios/StudioSwitcher";
import { loadStudio, studioQueryKey } from "../studios/studio-queries";
import { loadShowDesign, showDesignQueryKey } from "./show-queries";
import styles from "./show-detail.module.css";

const formatLastEdited = (value: string): string =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );

export const ShowDetailDestination = () => {
  const navigate = useNavigate();
  const { studioId, showId } = useParams<{
    studioId: string;
    showId: string;
  }>();
  const [selectionError, setSelectionError] = useState<string>();
  const routeIsComplete = studioId !== undefined && showId !== undefined;
  const studioQuery = useQuery({
    enabled: studioId !== undefined,
    queryFn: () => loadStudio(studioId ?? ""),
    queryKey: studioQueryKey(studioId ?? "incomplete"),
    retry: false,
  });
  const detailQuery = useQuery({
    enabled: routeIsComplete,
    queryFn: () => loadShowDesign(studioId ?? "", showId ?? ""),
    queryKey: showDesignQueryKey(
      studioId ?? "incomplete",
      showId ?? "incomplete",
    ),
    retry: false,
  });
  const studio = studioQuery.data;
  const detail = detailQuery.data;
  const isPending = studioQuery.isPending || detailQuery.isPending;
  const isError =
    !routeIsComplete || studioQuery.isError || detailQuery.isError;
  const openDesignShow = (): void => {
    if (studioId !== undefined && showId !== undefined) {
      navigate(getDesignShowRoute(studioId, showId));
    }
  };

  return (
    <ApplicationShell
      breadcrumb={
        studioId === undefined ? (
          <span>Shows</span>
        ) : (
          <Button
            onClick={() => navigate(getStudioHomeRoute(studioId))}
            size="small"
            variant="ghost"
          >
            Back to Shows
          </Button>
        )
      }
      menu={
        <IconButton
          disabled
          icon="more"
          label="Show settings coming later"
          tooltip="Show settings coming later"
        />
      }
      primaryAction={
        <Button disabled leadingIcon="plus" size="small" variant="primary">
          Create New Episode
        </Button>
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
      title={detail?.show.name ?? "Show Detail"}
    >
      <div className={styles.workspace}>
        {selectionError ? (
          <p className={styles.switcherError} role="alert">
            {selectionError}
          </p>
        ) : null}
        {isPending ? (
          <section aria-label="Loading Show Detail" className={styles.card}>
            <Skeleton label="Loading Show" />
            <Skeleton label="Loading Show details" />
          </section>
        ) : isError ? (
          <section
            aria-labelledby="show-detail-error-heading"
            className={styles.card}
          >
            <p className={styles.eyebrow}>Show unavailable</p>
            <h2
              className={styles.sectionHeading}
              id="show-detail-error-heading"
            >
              Showflow could not open this Show
            </h2>
            <p className={styles.error} role="alert">
              {detailQuery.error instanceof Error
                ? detailQuery.error.message
                : "Return to Studio Home and choose an available Show."}
            </p>
            {studioId === undefined ? null : (
              <Button onClick={() => navigate(getStudioHomeRoute(studioId))}>
                Return to Studio Home
              </Button>
            )}
          </section>
        ) : detail === undefined ? null : (
          <>
            <header className={styles.showHeader}>
              <div
                aria-label={`${detail.show.name} thumbnail placeholder`}
                className={styles.thumbnail}
                role="img"
              >
                <span aria-hidden="true">
                  {detail.show.name.slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div className={styles.showSummary}>
                <p className={styles.eyebrow}>Show Detail</p>
                <h2 className={styles.showName}>{detail.show.name}</h2>
                <p className={styles.description}>
                  {detail.show.description ??
                    "Add a description from Show settings later."}
                </p>
              </div>
            </header>

            <section
              aria-labelledby="create-episode-heading"
              className={styles.episodeHero}
            >
              <div className={styles.sectionCopy}>
                <p className={styles.eyebrow}>Start producing</p>
                <h2 className={styles.heroHeading} id="create-episode-heading">
                  Create New Episode
                </h2>
                <p className={styles.description}>
                  This Show does not have a Blueprint yet. You can design the
                  Show first or create a blank Episode when Episode creation is
                  available.
                </p>
              </div>
              <div className={styles.actions}>
                <Button onClick={openDesignShow} size="large">
                  Design Show
                </Button>
                <Button
                  disabled
                  leadingIcon="plus"
                  size="large"
                  variant="primary"
                >
                  Create Blank Episode
                </Button>
              </div>
              <p className={styles.availability}>
                Episode creation arrives in Sprint 6.
              </p>
            </section>

            <section
              aria-labelledby="design-show-heading"
              className={styles.designSection}
            >
              <div className={styles.sectionCopy}>
                <p className={styles.eyebrow}>Reusable production</p>
                <h2 className={styles.sectionHeading} id="design-show-heading">
                  Design Show
                </h2>
                <p className={styles.description}>
                  Build the reusable Storyboard, Segments, and Layouts used by
                  future Episodes.
                </p>
              </div>
              <dl className={styles.metadata}>
                <div>
                  <dt>Blueprint</dt>
                  <dd>
                    {detail.blueprint.placementCount}{" "}
                    {detail.blueprint.placementCount === 1
                      ? "Segment placement"
                      : "Segment placements"}
                  </dd>
                </div>
                <div>
                  <dt>Layouts</dt>
                  <dd>0 Layouts</dd>
                </div>
                <div>
                  <dt>Last edited</dt>
                  <dd>{formatLastEdited(detail.show.updatedAt)}</dd>
                </div>
              </dl>
              <Button onClick={openDesignShow}>Open Design Show</Button>
            </section>

            <section
              aria-labelledby="recent-episodes-heading"
              className={styles.recentSection}
            >
              <div className={styles.sectionCopy}>
                <p className={styles.eyebrow}>Latest work</p>
                <h2
                  className={styles.sectionHeading}
                  id="recent-episodes-heading"
                >
                  Recent Episodes
                </h2>
              </div>
              <EmptyState
                action={
                  <Button disabled leadingIcon="plus" variant="primary">
                    Create New Episode
                  </Button>
                }
                className={styles.episodeEmptyState}
                description="Episodes created from this Show will appear here."
                heading="No Episodes yet"
                icon="plus"
              />
            </section>
          </>
        )}
      </div>
    </ApplicationShell>
  );
};
