export const componentQueryKey = (studioId: string, showId: string) =>
  ["components", studioId, showId] as const;

export const loadComponents = async (studioId: string, showId: string) => {
  const result = await window.showflow.components.list({ studioId, showId });
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
};
