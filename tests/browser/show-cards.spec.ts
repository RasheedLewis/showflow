import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import type { ShowflowDesktopApi } from "@showflow/contracts";

import {
  DEFAULT_STUDIO_ID,
  installMockDesktopApi,
} from "../support/mock-desktop-api.ts";

declare global {
  interface Window {
    readonly showflow: ShowflowDesktopApi;
  }
}

const openStudioHome = async (page: Page) => {
  await page.evaluate((studioId) => {
    window.location.hash = `/studio/${studioId}`;
  }, DEFAULT_STUDIO_ID);
};

const openShowActions = async (page: Page, showName: string) => {
  await page.getByRole("article", { name: showName }).hover();
  await page.getByRole("button", { name: `Actions for ${showName}` }).click();
};

test("manages persisted Show cards with confirmation for deletion", async ({
  page,
}) => {
  await installMockDesktopApi(page);
  await page.goto("/#/studio/new");
  await page
    .getByRole("textbox", { name: "Studio name" })
    .fill("Public Sphere");
  await page.getByRole("button", { name: "Create Studio" }).click();
  await page.getByRole("button", { name: "New Show" }).click();
  await page
    .getByRole("textbox", { name: "Show name" })
    .fill("Artist Interviews");
  await page
    .getByRole("textbox", { name: "Description" })
    .fill("Weekly artist interviews.");
  await page.getByRole("button", { name: "Create Show" }).click();
  await openStudioHome(page);

  await expect(
    page.getByRole("button", { name: "Artist Interviews", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Weekly artist interviews.")).toBeVisible();
  await expect(page.getByText("0 Episodes")).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Artist Interviews thumbnail placeholder" }),
  ).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze();
  expect(accessibility.violations).toEqual([]);

  await openShowActions(page, "Artist Interviews");
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page
    .getByRole("textbox", { name: "Show name" })
    .fill("Artist Conversations");
  await page.getByRole("button", { name: "Rename Show" }).click();
  await expect(
    page.getByRole("button", { name: "Artist Conversations", exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Artist Conversations", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Artist Conversations" }),
  ).toBeVisible();
  await openStudioHome(page);
  await openShowActions(page, "Artist Conversations");
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await expect(
    page.getByRole("heading", { name: "Create your first Show" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "New Show" }).click();
  await page.getByRole("textbox", { name: "Show name" }).fill("Delete Me");
  await page.getByRole("button", { name: "Create Show" }).click();
  await openStudioHome(page);
  await openShowActions(page, "Delete Me");
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(
    page.getByRole("dialog", { name: "Delete Delete Me?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(
    page.getByRole("button", { name: "Delete Me", exact: true }),
  ).toBeVisible();
  await openShowActions(page, "Delete Me");
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete Show" }).click();
  await expect(
    page.getByRole("heading", { name: "Create your first Show" }),
  ).toBeVisible();
});
