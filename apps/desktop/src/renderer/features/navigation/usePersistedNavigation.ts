import { useEffect, useRef, useState } from "react";

interface PersistedNavigationOptions {
  readonly route: string | undefined;
  readonly studioId: string | undefined;
}

const navigationErrorMessage =
  "Showflow could not remember this location. Your saved work was not changed. Try navigating again.";

export const usePersistedNavigation = ({
  route,
  studioId,
}: PersistedNavigationOptions): string | undefined => {
  const lastAttemptedRoute = useRef<string | undefined>(undefined);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (
      route === undefined ||
      studioId === undefined ||
      lastAttemptedRoute.current === route
    ) {
      return undefined;
    }

    lastAttemptedRoute.current = route;

    void window.showflow.app
      .updateNavigation({ lastRoute: route, lastStudioId: studioId })
      .then((result) => {
        if (lastAttemptedRoute.current !== route) return;
        if (result.ok) {
          setError(undefined);
          return;
        }

        lastAttemptedRoute.current = undefined;
        setError(navigationErrorMessage);
      })
      .catch(() => {
        if (lastAttemptedRoute.current !== route) return;
        lastAttemptedRoute.current = undefined;
        setError(navigationErrorMessage);
      });
    return undefined;
  }, [route, studioId]);

  return error;
};
