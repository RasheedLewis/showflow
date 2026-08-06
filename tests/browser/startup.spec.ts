import { expect, test } from "@playwright/test";
import type { ShowflowDesktopApi } from "@showflow/contracts";

import {
  createMockDesktopApi,
  DEFAULT_STUDIO_ID,
  installMockDesktopApi,
} from "../support/mock-desktop-api.ts";

declare global {
  interface Window {
    readonly showflow: ShowflowDesktopApi;
  }
}

test("opens the selected persisted Studio and loads every Studio at startup", async ({
  page,
}) => {
  const api = createMockDesktopApi();
  await api.studios.create({ name: "Public Sphere" });
  await api.studios.create({ name: "Field Notes" });
  await api.app.updateNavigation({
    lastRoute: `/studio/${DEFAULT_STUDIO_ID}`,
    lastStudioId: DEFAULT_STUDIO_ID,
  });
  await installMockDesktopApi(page, api);

  await page.goto("/#/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Public Sphere" }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Switch Studio. Current Studio: Public Sphere",
    })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Field Notes" }),
  ).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "No other Studios" }),
  ).not.toBeVisible();
});
