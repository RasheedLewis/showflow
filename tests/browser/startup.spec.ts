import { expect, test } from "@playwright/test";
import type { ShowflowDesktopApi } from "@showflow/contracts";

import {
  createMockDesktopApi,
  DEFAULT_SHOW_ID,
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

test("restores a valid persisted Show route", async ({ page }) => {
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
  await page.getByRole("button", { name: "Create Show" }).click();
  await page.evaluate(
    async ({ showId, studioId }) => {
      await window.showflow.app.updateNavigation({
        lastRoute: `/studio/${studioId}/show/${showId}`,
        lastStudioId: studioId,
      });
      window.location.hash = "/";
    },
    { showId: DEFAULT_SHOW_ID, studioId: DEFAULT_STUDIO_ID },
  );

  await expect(
    page.getByRole("heading", { level: 1, name: "Artist Interviews" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Create New Episode" }),
  ).toBeVisible();
});

test("recovers a missing persisted Show route to Studio Home", async ({
  page,
}) => {
  await installMockDesktopApi(page);
  await page.goto("/#/studio/new");
  await page
    .getByRole("textbox", { name: "Studio name" })
    .fill("Public Sphere");
  await page.getByRole("button", { name: "Create Studio" }).click();
  await page.evaluate(
    async ({ showId, studioId }) => {
      await window.showflow.app.updateNavigation({
        lastRoute: `/studio/${studioId}/show/${showId}/design`,
        lastStudioId: studioId,
      });
      window.location.hash = "/";
    },
    { showId: DEFAULT_SHOW_ID, studioId: DEFAULT_STUDIO_ID },
  );

  await expect(
    page.getByRole("heading", { level: 1, name: "Public Sphere" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Create your first Show" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () => window.showflow.app.getApplicationSettings()),
    )
    .toMatchObject({
      ok: true,
      data: {
        lastRoute: `/studio/${DEFAULT_STUDIO_ID}`,
        lastStudioId: DEFAULT_STUDIO_ID,
      },
    });
});
