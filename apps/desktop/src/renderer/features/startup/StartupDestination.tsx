import { ApplicationShell, Button, Skeleton } from "@showflow/ui";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { Navigate } from "react-router-dom";

import {
  getStudioHomeRoute,
  STUDIO_CREATION_ROUTE,
} from "../../app-routes.mts";
import {
  loadStudios,
  studioQueryKey,
  studiosQueryKey,
} from "../studios/studio-queries";
import styles from "../studios/studio-pages.module.css";

const startupQueryKey = ["startup-destination"] as const;

interface StartupDestinationResult {
  readonly route: string;
}

const resolveStartupDestination = async (
  queryClient: QueryClient,
): Promise<StartupDestinationResult> => {
  const [settingsResult, studios] = await Promise.all([
    window.showflow.app.getApplicationSettings(),
    queryClient.fetchQuery({ queryFn: loadStudios, queryKey: studiosQueryKey }),
  ]);
  if (!settingsResult.ok) throw new Error(settingsResult.error.message);
  if (studios.length === 0) return { route: STUDIO_CREATION_ROUTE };

  const selectedStudio =
    studios.find((studio) => studio.id === settingsResult.data.lastStudioId) ??
    studios[0];
  if (selectedStudio === undefined) return { route: STUDIO_CREATION_ROUTE };
  const route = getStudioHomeRoute(selectedStudio.id);

  if (settingsResult.data.lastStudioId !== selectedStudio.id) {
    const updateResult = await window.showflow.app.updateNavigation({
      lastRoute: route,
      lastStudioId: selectedStudio.id,
    });
    if (!updateResult.ok) throw new Error(updateResult.error.message);
  }

  queryClient.setQueryData(studioQueryKey(selectedStudio.id), selectedStudio);

  return { route };
};

export const StartupDestination = () => {
  const queryClient = useQueryClient();
  const startupQuery = useQuery({
    queryFn: () => resolveStartupDestination(queryClient),
    queryKey: startupQueryKey,
    retry: false,
  });

  if (startupQuery.data !== undefined) {
    return <Navigate replace to={startupQuery.data.route} />;
  }

  return (
    <ApplicationShell
      breadcrumb={<span>Startup</span>}
      primaryAction={<span />}
      studioSwitcher={
        <Button disabled size="small" variant="ghost">
          Studio
        </Button>
      }
      title="Opening Showflow"
    >
      <div className={styles.workspace}>
        {startupQuery.isError ? (
          <section
            aria-labelledby="startup-error-heading"
            className={styles.card}
          >
            <p className={styles.eyebrow}>Startup interrupted</p>
            <h2 className={styles.heading} id="startup-error-heading">
              Showflow could not open your Studios
            </h2>
            <p className={styles.message} role="alert">
              {startupQuery.error instanceof Error
                ? startupQuery.error.message
                : "Your saved work was not changed. Try again."}
            </p>
            <Button onClick={() => void startupQuery.refetch()}>
              Retry opening Showflow
            </Button>
          </section>
        ) : (
          <section aria-label="Opening Showflow" className={styles.card}>
            <Skeleton label="Loading Studios" />
            <Skeleton label="Restoring Studio selection" />
          </section>
        )}
      </div>
    </ApplicationShell>
  );
};
