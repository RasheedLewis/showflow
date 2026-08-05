import { expect, test } from "@playwright/test";
import type { ShowflowDesktopApi } from "@showflow/contracts";

import {
  DEFAULT_RUNTIME_INFO_RESULT,
  installMockDesktopApi,
} from "../support/mock-desktop-api.ts";

type BrowserShowflowWindow = Window & {
  readonly showflow: ShowflowDesktopApi;
};

test.beforeEach(async ({ page }) => {
  await installMockDesktopApi(page);
});

test("the development screen renders with the typed mock desktop API", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Showflow" }),
  ).toBeVisible();
  await expect(page.getByText("Showflow is ready.")).toBeVisible();

  const mockState = await page.evaluate(async () => {
    const showflow = (window as unknown as BrowserShowflowWindow).showflow;

    return {
      apiVersion: showflow.apiVersion,
      runtimeInfo: await showflow.app.getRuntimeInfo(),
    };
  });

  expect(mockState).toEqual({
    apiVersion: DEFAULT_RUNTIME_INFO_RESULT.data.desktopApiVersion,
    runtimeInfo: DEFAULT_RUNTIME_INFO_RESULT,
  });
});
