import { ApplicationShell, Button, Skeleton } from "@showflow/ui";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { Navigate, matchPath } from "react-router-dom";

import { GetShowDesignRequestSchema } from "@showflow/contracts";

import {
  DESIGN_SHOW_ROUTE,
  DESIGN_SHOW_ROOT_ROUTE,
  SHOW_DETAIL_ROUTE,
  getDesignShowRoute,
  getStudioHomeRoute,
  isDesignShowSection,
  STUDIO_CREATION_ROUTE,
} from "../../app-routes.mts";
import { showDesignQueryKey } from "../shows/show-queries";
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

const resolveDurableRoute = async (
  lastRoute: string,
  selectedStudioId: string,
  queryClient: QueryClient,
): Promise<string> => {
  const studioHomeRoute = getStudioHomeRoute(selectedStudioId);
  if (lastRoute === studioHomeRoute) return studioHomeRoute;

  const designRouteMatch = matchPath(
    { end: true, path: DESIGN_SHOW_ROUTE },
    lastRoute,
  );
  const legacyDesignRouteMatch = matchPath(
    { end: true, path: DESIGN_SHOW_ROOT_ROUTE },
    lastRoute,
  );
  const showRouteMatch =
    designRouteMatch ??
    legacyDesignRouteMatch ??
    matchPath({ end: true, path: SHOW_DETAIL_ROUTE }, lastRoute);
  const request = GetShowDesignRequestSchema.safeParse({
    showId: showRouteMatch?.params.showId,
    studioId: showRouteMatch?.params.studioId,
  });
  if (!request.success || request.data.studioId !== selectedStudioId) {
    return studioHomeRoute;
  }
  if (
    designRouteMatch !== null &&
    !isDesignShowSection(designRouteMatch.params.designSection)
  ) {
    return studioHomeRoute;
  }

  const result = await window.showflow.shows.getDesign(request.data);
  if (!result.ok) {
    if (result.error.code === "NOT_FOUND") return studioHomeRoute;
    throw new Error(result.error.message);
  }
  if (result.data.show.archivedAt !== null) return studioHomeRoute;

  queryClient.setQueryData(
    showDesignQueryKey(request.data.studioId, request.data.showId),
    result.data,
  );
  return legacyDesignRouteMatch === null
    ? lastRoute
    : getDesignShowRoute(request.data.studioId, request.data.showId);
};

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
  const route = await resolveDurableRoute(
    settingsResult.data.lastRoute,
    selectedStudio.id,
    queryClient,
  );

  if (
    settingsResult.data.lastStudioId !== selectedStudio.id ||
    settingsResult.data.lastRoute !== route
  ) {
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
