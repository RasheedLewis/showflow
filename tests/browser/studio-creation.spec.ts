import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

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

test.beforeEach(async ({ page }) => {
  await installMockDesktopApi(page);
  await page.goto("/#/studio/new");
});

test("creates, selects, and opens the first Studio", async ({ page }) => {
  await expect(
    page.getByRole("heading", { level: 2, name: "Create your first Studio" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Studio" })).toHaveCSS(
    "min-height",
    "44px",
  );

  await page
    .getByRole("textbox", { name: "Studio name" })
    .fill("Public Sphere");
  await page.getByRole("button", { name: "Create Studio" }).click();

  await expect(page).toHaveURL(
    new RegExp(`/#/studio/${DEFAULT_STUDIO_ID}$`, "u"),
  );
  await expect(
    page.getByRole("heading", { level: 2, name: "Public Sphere is ready" }),
  ).toBeVisible();

  const persistedSelection = await page.evaluate(async () => {
    return window.showflow.app.getApplicationSettings();
  });
  expect(persistedSelection).toMatchObject({
    ok: true,
    data: {
      lastRoute: `/studio/${DEFAULT_STUDIO_ID}`,
      lastStudioId: DEFAULT_STUDIO_ID,
    },
  });
});

test("validates Studio creation accessibly", async ({ page }) => {
  await page.getByRole("button", { name: "Create Studio" }).click();

  await expect(page.getByText("Enter a Studio name.")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Studio name" }),
  ).toHaveAttribute("aria-invalid", "true");

  const accessibilityScan = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze();
  expect(accessibilityScan.violations).toEqual([]);
});
