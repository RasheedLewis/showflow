import type { StudioDto, StudioResult } from "@showflow/contracts";

export const studiosQueryKey = ["studios"] as const;
export const studioQueryKey = (studioId: string) =>
  ["studios", studioId] as const;

export const loadStudios = async (): Promise<readonly StudioDto[]> => {
  const result = await window.showflow.studios.list();

  if (!result.ok) throw new Error(result.error.message);

  return result.data;
};

export const loadStudio = async (studioId: string): Promise<StudioDto> => {
  let result: StudioResult;

  try {
    result = await window.showflow.studios.get({ studioId });
  } catch {
    throw new Error(
      "Showflow could not load this Studio. Your saved work was not changed. Try again.",
    );
  }

  if (!result.ok) throw new Error(result.error.message);

  return result.data;
};
