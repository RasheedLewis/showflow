import type { ShowDesignDto } from "@showflow/contracts";

export const showDesignQueryKey = (studioId: string, showId: string) =>
  ["show-design", studioId, showId] as const;

export const loadShowDesign = async (
  studioId: string,
  showId: string,
): Promise<ShowDesignDto> => {
  const result = await window.showflow.shows.getDesign({ studioId, showId });
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
};
