export const APPLICATION_FOUNDATION_ROUTE = "/development/foundation";
export const STUDIO_CREATION_ROUTE = "/studio/new";
export const STUDIO_HOME_ROUTE = "/studio/:studioId";
export const SHOW_CREATION_ROUTE = "/studio/:studioId/show/new";
export const DESIGN_SHOW_ROUTE = "/studio/:studioId/show/:showId/design";

export const getStudioHomeRoute = (studioId: string): string =>
  `/studio/${studioId}`;

export const getShowCreationRoute = (studioId: string): string =>
  `/studio/${studioId}/show/new`;

export const getDesignShowRoute = (studioId: string, showId: string): string =>
  `/studio/${studioId}/show/${showId}/design`;
