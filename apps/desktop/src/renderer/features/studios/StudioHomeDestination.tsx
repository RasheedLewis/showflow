import {
  ApplicationShell,
  Button,
  EmptyState,
  Skeleton,
  TextInput,
} from "@showflow/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { StudioSwitcher } from "./StudioSwitcher";
import { loadStudio, studioQueryKey } from "./studio-queries";
import styles from "./studio-pages.module.css";
import { getShowCreationRoute } from "../../app-routes.mts";

const incompleteStudioRouteMessage =
  "This Studio route is incomplete. Return to Studio setup.";

export const StudioHomeDestination = () => {
  const navigate = useNavigate();
  const { studioId } = useParams<{ studioId: string }>();
  const studioQuery = useQuery({
    queryFn: () => {
      if (studioId === undefined) throw new Error(incompleteStudioRouteMessage);

      return loadStudio(studioId);
    },
    queryKey: studioQueryKey(studioId ?? "incomplete"),
    retry: false,
  });
  const [selectionError, setSelectionError] = useState<string>();
  const studio = studioQuery.data;
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
        {studioQuery.isPending ? (
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
                  helpText="Create a Show to start searching."
                  label="Search Shows"
                  placeholder="Search Shows"
                  type="search"
                />
              </div>
            </header>
            <section aria-label="Shows" className={styles.showGrid}>
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
            </section>
          </>
        )}
      </div>
    </ApplicationShell>
  );
};
