import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import type { ShowflowDesktopApi } from "@showflow/contracts";

import {
  DEFAULT_STUDIO_ID,
  SECOND_STUDIO_ID,
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
    page.getByRole("heading", { level: 1, name: "Public Sphere" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Create your first Show" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Design a reusable production once, then create new Episodes from it.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Shows" })).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "Search Shows" }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "New Show" })).toBeDisabled();

  const studioHomeAccessibility = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze();
  expect(studioHomeAccessibility.violations).toEqual([]);

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

test("creates another Studio and switches back while persisting selection", async ({
  page,
}) => {
  await page
    .getByRole("textbox", { name: "Studio name" })
    .fill("Public Sphere");
  await page.getByRole("button", { name: "Create Studio" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Public Sphere" }),
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: "Switch Studio. Current Studio: Public Sphere",
    })
    .click();
  await expect(page.getByText("Current Studio")).toBeVisible();
  await expect(page.getByText("Other Studios", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "No other Studios" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("menuitem", { name: "Studio settings Coming later" }),
  ).toBeDisabled();

  const openMenuAccessibility = await new AxeBuilder({ page })
    .include('[role="menu"]')
    .disableRules(["color-contrast"])
    .analyze();
  expect(openMenuAccessibility.violations).toEqual([]);

  await page.getByRole("menuitem", { name: "Create Studio" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "Create a Studio" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Studio name" }).fill("Field Notes");
  await page.getByRole("button", { name: "Create Studio" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/#/studio/${SECOND_STUDIO_ID}$`, "u"),
  );

  await page
    .getByRole("button", {
      name: "Switch Studio. Current Studio: Field Notes",
    })
    .click();
  await page.getByRole("menuitem", { name: "Public Sphere" }).click();

  await expect(page).toHaveURL(
    new RegExp(`/#/studio/${DEFAULT_STUDIO_ID}$`, "u"),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Public Sphere" }),
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
