export const APPLICATION_FOUNDATION_ROUTE = "/development/foundation";
export const STUDIO_CREATION_ROUTE = "/studio/new";
export const STUDIO_HOME_ROUTE = "/studio/:studioId";
export const SHOW_CREATION_ROUTE = "/studio/:studioId/show/new";
export const SHOW_DETAIL_ROUTE = "/studio/:studioId/show/:showId";
export const DESIGN_SHOW_ROOT_ROUTE = "/studio/:studioId/show/:showId/design";
export const DESIGN_SHOW_ROUTE =
  "/studio/:studioId/show/:showId/design/:designSection";
export const DESIGN_SHOW_SEGMENT_ROUTE =
  "/studio/:studioId/show/:showId/design/segments/:segmentId";
export const EPISODE_CREATION_ROUTE =
  "/studio/:studioId/show/:showId/episodes/new";
export const PRODUCE_EPISODE_ROUTE =
  "/studio/:studioId/show/:showId/episodes/:episodeId";
export const EPISODE_SEGMENT_ROUTE =
  "/studio/:studioId/show/:showId/episodes/:episodeId/segments/:episodeSegmentId";

export const getStudioHomeRoute = (studioId: string): string =>
  `/studio/${studioId}`;

export const getShowCreationRoute = (studioId: string): string =>
  `/studio/${studioId}/show/new`;

export const getShowDetailRoute = (studioId: string, showId: string): string =>
  `/studio/${studioId}/show/${showId}`;

export type DesignShowSection = "blueprint" | "segments" | "layouts";

export const isDesignShowSection = (
  value: string | undefined,
): value is DesignShowSection =>
  value === "blueprint" || value === "segments" || value === "layouts";

export const getDesignShowSectionRoute = (
  studioId: string,
  showId: string,
  section: DesignShowSection,
): string => `/studio/${studioId}/show/${showId}/design/${section}`;

export const getDesignShowRoute = (studioId: string, showId: string): string =>
  getDesignShowSectionRoute(studioId, showId, "blueprint");

export const getDesignShowSegmentRoute = (
  studioId: string,
  showId: string,
  segmentId: string,
): string => `/studio/${studioId}/show/${showId}/design/segments/${segmentId}`;

export const getEpisodeCreationRoute = (
  studioId: string,
  showId: string,
): string => `/studio/${studioId}/show/${showId}/episodes/new`;

export const getProduceEpisodeRoute = (
  studioId: string,
  showId: string,
  episodeId: string,
): string => `/studio/${studioId}/show/${showId}/episodes/${episodeId}`;

export const getEpisodeSegmentRoute = (
  studioId: string,
  showId: string,
  episodeId: string,
  episodeSegmentId: string,
): string =>
  `/studio/${studioId}/show/${showId}/episodes/${episodeId}/segments/${episodeSegmentId}`;
