import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { ShowflowDesktopApi } from "@showflow/contracts";

import {
  DEFAULT_SHOW_ID,
  DEFAULT_STUDIO_ID,
  installMockDesktopApi,
} from "../support/mock-desktop-api.ts";

declare global {
  interface Window {
    readonly showflow: ShowflowDesktopApi;
  }
}

test("creates a blank Show and opens its empty Blueprint", async ({ page }) => {
  await installMockDesktopApi(page);
  await page.goto("/#/studio/new");
  await page
    .getByRole("textbox", { name: "Studio name" })
    .fill("Public Sphere");
  await page.getByRole("button", { name: "Create Studio" }).click();
  await page.getByRole("button", { name: "New Show" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Create Show" }),
  ).toBeVisible();
  await expect(
    page.getByText("You can add a thumbnail later from Show settings."),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Show name" })
    .fill("Artist Interviews");
  await page
    .getByRole("textbox", { name: "Description" })
    .fill("Weekly artist interviews.");
  await page.getByRole("button", { name: "Create Show" }).click();

  await expect(page).toHaveURL(
    new RegExp(
      `/#/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/design/blueprint$`,
      "u",
    ),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Design Show" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Design your Show’s default Storyboard",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Changes become the default for future Episodes.").first(),
  ).toBeVisible();

  const accessibility = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze();
  expect(accessibility.violations).toEqual([]);

  await expect
    .poll(() =>
      page.evaluate(async () => window.showflow.app.getApplicationSettings()),
    )
    .toMatchObject({
      ok: true,
      data: {
        lastRoute: `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/design/blueprint`,
        lastStudioId: DEFAULT_STUDIO_ID,
      },
    });
});
