import type { StudioDto } from "@showflow/contracts";

export const studiosQueryKey = ["studios"] as const;

export const loadStudios = async (): Promise<readonly StudioDto[]> => {
  const result = await window.showflow.studios.list();

  if (!result.ok) throw new Error(result.error.message);

  return result.data;
};
