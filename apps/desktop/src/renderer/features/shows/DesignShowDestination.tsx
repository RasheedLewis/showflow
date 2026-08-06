import { ApplicationShell, Button, EmptyState, Skeleton } from "@showflow/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getStudioHomeRoute } from "../../app-routes.mts";
import { StudioSwitcher } from "../studios/StudioSwitcher";
import { loadStudio, studioQueryKey } from "../studios/studio-queries";
import studioStyles from "../studios/studio-pages.module.css";
import { loadShowDesign, showDesignQueryKey } from "./show-queries";

export const DesignShowDestination = () => {
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
  const designQuery = useQuery({
    enabled: routeIsComplete,
    queryFn: () => loadShowDesign(studioId ?? "", showId ?? ""),
    queryKey: showDesignQueryKey(
      studioId ?? "incomplete",
      showId ?? "incomplete",
    ),
    retry: false,
  });
  const studio = studioQuery.data;
  const design = designQuery.data;
  const isPending = studioQuery.isPending || designQuery.isPending;
  const isError =
    !routeIsComplete || studioQuery.isError || designQuery.isError;

  return (
    <ApplicationShell
      breadcrumb={<span>Design Show / Blueprint</span>}
      primaryAction={
        <Button disabled leadingIcon="plus" variant="primary">
          Add Segment
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
      title={design?.show.name ?? "Design Show"}
    >
      <div className={studioStyles.homeWorkspace}>
        {selectionError ? (
          <p className={studioStyles.switcherError} role="alert">
            {selectionError}
          </p>
        ) : null}
        {isPending ? (
          <section
            aria-label="Loading Design Show"
            className={studioStyles.card}
          >
            <Skeleton label="Loading Show Blueprint" />
          </section>
        ) : isError ? (
          <section className={studioStyles.card}>
            <p className={studioStyles.eyebrow}>Show unavailable</p>
            <h2 className={studioStyles.heading}>
              Showflow could not open Design Show
            </h2>
            <p className={studioStyles.message} role="alert">
              {designQuery.error instanceof Error
                ? designQuery.error.message
                : "Return to Studio Home and choose an available Show."}
            </p>
            {studioId === undefined ? null : (
              <Button onClick={() => navigate(getStudioHomeRoute(studioId))}>
                Return to Studio Home
              </Button>
            )}
          </section>
        ) : (
          <>
            <header className={studioStyles.designHeader}>
              <div className={studioStyles.homeIntro}>
                <p className={studioStyles.eyebrow}>Show Blueprint</p>
                <h2 className={studioStyles.heading}>Blueprint</h2>
                <p className={studioStyles.description}>
                  Changes here become the default Storyboard for future
                  Episodes.
                </p>
              </div>
            </header>
            <section
              aria-label="Show Blueprint"
              className={studioStyles.blueprintWorkspace}
            >
              <EmptyState
                action={
                  <Button disabled leadingIcon="plus" variant="primary">
                    Add First Segment
                  </Button>
                }
                description="Add reusable Segments to define the default Storyboard for future Episodes."
                heading="Design your Show’s default Storyboard"
                icon="plus"
              />
              <p className={studioStyles.availability}>
                Segment creation arrives in the next Sprint.
              </p>
            </section>
          </>
        )}
      </div>
    </ApplicationShell>
  );
};
