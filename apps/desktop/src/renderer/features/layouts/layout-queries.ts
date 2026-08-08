import type { LayoutCatalogItemDto, LayoutDto } from "@showflow/contracts";

export const layoutCatalogQueryKey = (studioId: string, showId: string) =>
  ["layouts", studioId, showId] as const;
export const layoutQueryKey = (
  studioId: string,
  showId: string,
  layoutId: string,
) => ["layout", studioId, showId, layoutId] as const;

export const loadLayoutCatalog = async (
  studioId: string,
  showId: string,
): Promise<readonly LayoutCatalogItemDto[]> => {
  const result = await window.showflow.layouts.list({ studioId, showId });
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
};

export const loadLayout = async (
  studioId: string,
  showId: string,
  layoutId: string,
): Promise<LayoutDto> => {
  const result = await window.showflow.layouts.get({
    studioId,
    showId,
    layoutId,
  });
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
};
