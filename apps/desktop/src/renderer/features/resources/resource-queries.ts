import type { ResourceContext, ResourceDto } from "@showflow/contracts";

export const resourceQueryKey = (context: ResourceContext) =>
  [
    "resources",
    context.scope,
    context.studioId,
    context.scope === "studio" ? null : context.showId,
    context.scope === "episode" ? context.episodeId : null,
  ] as const;

export const loadResources = async (
  context: ResourceContext,
): Promise<readonly ResourceDto[]> => {
  const result = await window.showflow.resources.list({ context });
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
};
