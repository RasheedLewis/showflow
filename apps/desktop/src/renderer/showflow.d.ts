import type { ShowflowDesktopApi } from "@showflow/contracts";

declare global {
  interface Window {
    readonly showflow: ShowflowDesktopApi;
  }
}

export {};
