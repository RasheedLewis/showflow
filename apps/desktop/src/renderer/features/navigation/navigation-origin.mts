import { matchPath } from "react-router-dom";

import {
  DESIGN_SHOW_ROUTE,
  EPISODE_SEGMENT_ROUTE,
  getDesignShowSectionRoute,
  isDesignShowSection,
} from "../../app-routes.mts";

export interface NavigationOrigin {
  readonly focusId?: string;
  readonly label: string;
  readonly returnTo: string;
}

export interface NavigationOriginState {
  readonly navigationOrigin: NavigationOrigin;
}

export const createNavigationOriginState = (
  navigationOrigin: NavigationOrigin,
): NavigationOriginState => ({ navigationOrigin });

export interface NavigationFocusState {
  readonly navigationFocusId: string;
}

const isNavigationFocusId = (value: unknown): value is string =>
  typeof value === "string" &&
  value.startsWith("navigation-origin-") &&
  /^[a-zA-Z0-9:_-]+$/u.test(value);

export const createNavigationFocusState = (
  navigationFocusId: string,
): NavigationFocusState => ({ navigationFocusId });

export const resolveNavigationFocusId = (
  state: unknown,
): string | undefined => {
  if (typeof state !== "object" || state === null) return undefined;
  if (!("navigationFocusId" in state)) return undefined;
  return isNavigationFocusId(state.navigationFocusId)
    ? state.navigationFocusId
    : undefined;
};

const getRequestedReturnTo = (state: unknown): string | undefined => {
  if (typeof state !== "object" || state === null) return undefined;
  if (!("navigationOrigin" in state)) return undefined;
  const navigationOrigin = state.navigationOrigin;
  if (typeof navigationOrigin !== "object" || navigationOrigin === null) {
    return undefined;
  }
  if (!("returnTo" in navigationOrigin)) return undefined;
  return typeof navigationOrigin.returnTo === "string"
    ? navigationOrigin.returnTo
    : undefined;
};

const getRequestedFocusId = (state: unknown): string | undefined => {
  if (typeof state !== "object" || state === null) return undefined;
  if (!("navigationOrigin" in state)) return undefined;
  const navigationOrigin = state.navigationOrigin;
  if (typeof navigationOrigin !== "object" || navigationOrigin === null) {
    return undefined;
  }
  if (!("focusId" in navigationOrigin)) return undefined;
  return isNavigationFocusId(navigationOrigin.focusId)
    ? navigationOrigin.focusId
    : undefined;
};

export const resolveShowSegmentOrigin = (
  state: unknown,
  studioId: string,
  showId: string,
): NavigationOrigin => {
  const returnTo = getRequestedReturnTo(state);
  const focusId = getRequestedFocusId(state);
  if (returnTo !== undefined) {
    const designMatch = matchPath(
      { end: true, path: DESIGN_SHOW_ROUTE },
      returnTo,
    );
    if (
      designMatch?.params.studioId === studioId &&
      designMatch.params.showId === showId &&
      isDesignShowSection(designMatch.params.designSection)
    ) {
      return {
        ...(focusId === undefined ? {} : { focusId }),
        label:
          designMatch.params.designSection === "blueprint"
            ? "Blueprint"
            : designMatch.params.designSection === "segments"
              ? "Segments"
              : "Layouts",
        returnTo,
      };
    }

    const episodeSegmentMatch = matchPath(
      { end: true, path: EPISODE_SEGMENT_ROUTE },
      returnTo,
    );
    if (
      episodeSegmentMatch?.params.studioId === studioId &&
      episodeSegmentMatch.params.showId === showId
    ) {
      return {
        ...(focusId === undefined ? {} : { focusId }),
        label: "Episode Segment",
        returnTo,
      };
    }
  }

  return {
    label: "Segments",
    returnTo: getDesignShowSectionRoute(studioId, showId, "segments"),
  };
};
