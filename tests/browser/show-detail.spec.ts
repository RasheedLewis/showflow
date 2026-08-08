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

test("opens Show Detail with the required semantic hierarchy", async ({
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

  await page.evaluate((studioId) => {
    window.location.hash = `/studio/${studioId}`;
  }, DEFAULT_STUDIO_ID);
  await page
    .getByRole("button", { name: "Artist Interviews", exact: true })
    .click();

  await expect(page).toHaveURL(
    new RegExp(`/#/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}$`, "u"),
  );
  await expect(
    page.getByRole("heading", { level: 2, name: "Create New Episode" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Design Show" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Recent Episodes" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "No Episodes yet" }),
  ).toBeVisible();

  const hierarchyIsCorrect = await page.locator("main").evaluate((main) => {
    const headings = [...main.querySelectorAll("h2")].map((heading) =>
      heading.textContent?.trim(),
    );
    return (
      headings.indexOf("Create New Episode") <
        headings.indexOf("Design Show") &&
      headings.indexOf("Design Show") < headings.indexOf("Recent Episodes")
    );
  });
  expect(hierarchyIsCorrect).toBe(true);

  const accessibility = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze();
  expect(accessibility.violations).toEqual([]);

  await page.getByRole("button", { name: "Open Design Show" }).click();
  await expect(page).toHaveURL(
    new RegExp(
      `/#/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/design/blueprint$`,
      "u",
    ),
  );
});
