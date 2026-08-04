import {
  DESKTOP_API_VERSION,
  GetRuntimeInfoResultSchema,
  type ShowflowDesktopApi,
} from "@showflow/contracts";

export type GetRuntimeInfoTransport = () => Promise<unknown>;

export const createShowflowDesktopApi = (
  getRuntimeInfoTransport: GetRuntimeInfoTransport,
): ShowflowDesktopApi => {
  const appApi = Object.freeze({
    getRuntimeInfo: async () =>
      GetRuntimeInfoResultSchema.parse(await getRuntimeInfoTransport()),
  });

  return Object.freeze({
    apiVersion: DESKTOP_API_VERSION,
    app: appApi,
  });
};
