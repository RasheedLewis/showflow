import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { ShowflowDesktopApi } from "@showflow/contracts";

import {
  DEFAULT_STUDIO_ID,
  installMockDesktopApi,
  SECOND_STUDIO_ID,
} from "../support/mock-desktop-api.ts";

declare global {
  interface Window {
    readonly showflow: ShowflowDesktopApi;
  }
}

test("filters Show names only within the current Studio", async ({ page }) => {
  await installMockDesktopApi(page);
  await page.goto("/");
  await page.evaluate(
    async ({ currentStudioId, otherStudioId }) => {
      await window.showflow.studios.create({ name: "Public Sphere" });
      await window.showflow.studios.create({ name: "Field Notes" });
      await window.showflow.shows.create({
        name: "Artist Interviews",
        studioId: currentStudioId,
      });
      await window.showflow.shows.create({
        name: "Weekly Commentary",
        studioId: currentStudioId,
      });
      await window.showflow.shows.create({
        name: "Field Interviews",
        studioId: otherStudioId,
      });
      window.location.hash = `/studio/${currentStudioId}`;
    },
    {
      currentStudioId: DEFAULT_STUDIO_ID,
      otherStudioId: SECOND_STUDIO_ID,
    },
  );

  const search = page.getByRole("searchbox", { name: "Search Shows" });
  await expect(search).toBeEnabled();
  await search.fill("INTERVIEW");
  await expect(
    page.getByRole("button", { name: "Artist Interviews", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Weekly Commentary", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Field Interviews", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("1 Show found");

  await search.fill("missing");
  await expect(page.getByRole("status")).toHaveText("0 Shows found");
  await expect(
    page.getByRole("heading", { name: "No Shows found" }),
  ).toBeVisible();
  await expect(
    page.getByText(/No Shows in Public Sphere match/u),
  ).toBeVisible();

  const accessibility = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze();
  expect(accessibility.violations).toEqual([]);

  await page.getByRole("button", { name: "Clear Search" }).click();
  await expect(search).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Weekly Commentary", exact: true }),
  ).toBeVisible();
});
