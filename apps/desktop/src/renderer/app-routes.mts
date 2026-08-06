export const APPLICATION_FOUNDATION_ROUTE = "/development/foundation";
export const STUDIO_CREATION_ROUTE = "/studio/new";
export const STUDIO_HOME_ROUTE = "/studio/:studioId";

export const getStudioHomeRoute = (studioId: string): string =>
  `/studio/${studioId}`;
