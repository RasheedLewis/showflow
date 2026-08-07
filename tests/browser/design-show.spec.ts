import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { installMockDesktopApi } from "../support/mock-desktop-api.ts";

const createShow = async (page: Page): Promise<void> => {
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
};

const storyboardNames = async (page: Page): Promise<string[]> =>
  page
    .getByRole("list", { name: "Show Blueprint Storyboard" })
    .getByRole("listitem")
    .getByRole("heading", { level: 3 })
    .allTextContents();

test("builds the first reusable Segment from an empty Blueprint accessibly", async ({
  page,
}) => {
  await createShow(page);

  await expect(
    page.locator("main").getByText("Design Show", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Changes become the default for future Episodes.").first(),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Blueprint" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Segments" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Layouts" })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Design your Show’s default Storyboard",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Add First Segment" }).click();
  const picker = page.getByRole("dialog", { name: "Add Segment" });
  await picker.getByRole("textbox", { name: /Segment name/u }).fill("Opening");
  await picker
    .getByRole("textbox", { name: "Description (optional)" })
    .fill("Welcome the audience.");
  await picker.getByRole("button", { name: "Create and Add" }).click();

  await expect(
    page.getByRole("heading", { level: 2, name: "Opening" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Return to Blueprint" }).click();
  const storyboard = page.getByRole("list", {
    name: "Show Blueprint Storyboard",
  });
  await expect(storyboard).toHaveCount(1);
  await expect(storyboard.getByRole("listitem")).toHaveCount(1);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect(
    storyboard.getByRole("button", { name: "Reorder Opening" }),
  ).toBeVisible();

  const accessibility = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("reorders the Storyboard with keyboard and pointer input", async ({
  page,
}) => {
  await createShow(page);
  for (const name of ["Opening", "Interview"]) {
    await page
      .getByRole("button", {
        name: name === "Opening" ? "Add First Segment" : "Add Segment",
        exact: true,
      })
      .last()
      .click();
    const picker = page.getByRole("dialog", { name: "Add Segment" });
    await picker.getByRole("textbox", { name: /Segment name/u }).fill(name);
    await picker.getByRole("button", { name: "Create and Add" }).click();
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    await page.getByRole("button", { name: "Return to Blueprint" }).click();
  }
  await expect
    .poll(() => storyboardNames(page))
    .toEqual(["Opening", "Interview"]);

  const openingHandle = page.getByRole("button", { name: "Reorder Opening" });
  await openingHandle.focus();
  await openingHandle.press("Space");
  await openingHandle.press("ArrowRight");
  await openingHandle.press("Space");
  await expect
    .poll(() => storyboardNames(page))
    .toEqual(["Interview", "Opening"]);

  const source = await page
    .getByRole("button", { name: "Reorder Opening" })
    .boundingBox();
  const target = await page
    .getByRole("button", { name: "Reorder Interview" })
    .boundingBox();
  if (source === null || target === null) {
    throw new Error("Expected visible Blueprint reorder handles.");
  }
  await page.mouse.move(
    source.x + source.width / 2,
    source.y + source.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    target.x + target.width / 2,
    target.y + target.height / 2,
    {
      steps: 12,
    },
  );
  await page.mouse.up();
  await expect
    .poll(() => storyboardNames(page))
    .toEqual(["Opening", "Interview"]);
});

test("auto-scrolls the Storyboard workspace during a pointer drag", async ({
  page,
}) => {
  await page.setViewportSize({ height: 600, width: 1_280 });
  await createShow(page);
  const names = [
    "Opening",
    "Headlines",
    "Interview",
    "Demonstration",
    "Audience questions",
    "Recap",
    "Closing",
  ];
  for (const [index, name] of names.entries()) {
    await page
      .getByRole("button", {
        name: index === 0 ? "Add First Segment" : "Add Segment",
        exact: true,
      })
      .last()
      .click();
    const picker = page.getByRole("dialog", { name: "Add Segment" });
    await picker.getByRole("textbox", { name: /Segment name/u }).fill(name);
    await picker.getByRole("button", { name: "Create and Add" }).click();
    await page.getByRole("button", { name: "Return to Blueprint" }).click();
  }

  const workspace = page.getByRole("main", { name: "Artist Interviews" });
  await workspace.evaluate((element) => {
    element.scrollTop = 0;
  });
  const source = await page
    .getByRole("button", { name: "Reorder Opening" })
    .boundingBox();
  const workspaceBox = await workspace.boundingBox();
  if (source === null || workspaceBox === null) {
    throw new Error("Expected a scrollable Storyboard and reorder handle.");
  }

  await page.mouse.move(
    source.x + source.width / 2,
    source.y + source.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    workspaceBox.x + workspaceBox.width / 2,
    workspaceBox.y + workspaceBox.height - 4,
    { steps: 12 },
  );
  await expect
    .poll(() => workspace.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await page.mouse.up();
});
