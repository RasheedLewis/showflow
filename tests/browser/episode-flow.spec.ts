import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { installMockDesktopApi } from "../support/mock-desktop-api.ts";

const createShowWithBlueprint = async (page: Page): Promise<void> => {
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

  for (const [index, name] of ["Opening", "Interview"].entries()) {
    await page
      .getByRole("button", {
        exact: true,
        name: index === 0 ? "Add First Segment" : "Add Segment",
      })
      .last()
      .click();
    const picker = page.getByRole("dialog", { name: "Add Segment" });
    await picker.getByRole("textbox", { name: /Segment name/u }).fill(name);
    await picker.getByRole("button", { name: "Create and Add" }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await page.getByRole("button", { name: "Return to Blueprint" }).click();
  }
};

const storyboardNames = async (page: Page): Promise<string[]> =>
  page
    .getByRole("list", { name: "Episode Storyboard" })
    .getByRole("listitem")
    .getByRole("heading", { level: 3 })
    .allTextContents();

test("6.T13 creates Studio → Show → Blueprint → Episode and reorders it", async ({
  page,
}) => {
  await createShowWithBlueprint(page);

  const match = page.url().match(/#(\/studio\/[^/]+\/show\/[^/]+)/u);
  if (match?.[1] === undefined) {
    throw new Error("Expected the Design Show route to identify the Show.");
  }
  await page.goto(`/#${match[1]}`);
  await page
    .getByRole("button", { name: "Create New Episode" })
    .first()
    .click();
  await page.getByRole("textbox", { name: "Episode title" }).fill("Episode 24");
  await page.getByLabel("Episode number (optional)").fill("24");
  await page.getByLabel("Planned date (optional)").fill("2026-08-21");
  await page.getByRole("button", { name: "Create Episode" }).click();

  await expect(
    page.getByText("Changes apply only to this Episode.").first(),
  ).toBeVisible();
  await expect(
    page.getByText("Artist Interviews", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => storyboardNames(page))
    .toEqual(["Opening", "Interview"]);
  const accessibility = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page
    .getByRole("list", { name: "Episode Storyboard" })
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Interview" }) })
    .hover();
  await page
    .getByRole("button", { name: "More actions for Interview" })
    .click();
  await page.getByRole("menuitem", { name: "Move earlier" }).click();
  await expect
    .poll(() => storyboardNames(page))
    .toEqual(["Interview", "Opening"]);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.screenshot({
    fullPage: true,
    path: "/private/tmp/showflow-sprint-6-produce-episode.png",
  });
  await page.getByRole("button", { name: "Back to Show Detail" }).click();
  await page.getByRole("button", { name: "Back to Shows" }).click();
  await expect(page.getByText("1 Episode", { exact: true })).toBeVisible();
});
