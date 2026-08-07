import type {
  EpisodeStoryboardDto,
  EpisodeSummaryDto,
} from "@showflow/contracts";

export const episodeQueryKey = (
  studioId: string,
  showId: string,
  episodeId: string,
) => ["episode", studioId, showId, episodeId] as const;

export const episodeListQueryKey = (studioId: string, showId: string) =>
  ["episodes", studioId, showId] as const;

export const loadEpisode = async (
  studioId: string,
  showId: string,
  episodeId: string,
): Promise<EpisodeStoryboardDto> => {
  const result = await window.showflow.episodes.get({
    episodeId,
    showId,
    studioId,
  });
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
};

export const loadEpisodes = async (
  studioId: string,
  showId: string,
): Promise<readonly EpisodeSummaryDto[]> => {
  const result = await window.showflow.episodes.list({ showId, studioId });
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
};
