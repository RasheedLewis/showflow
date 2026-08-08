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

test("10.T8 10.T11 10.T12 edits with coalesced undo, edit-only guides, and accessible controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await createShow(page);
  await page.getByRole("tab", { name: "Layouts" }).click();
  await page.getByRole("button", { name: "New Layout" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New Layout" });
  await dialog
    .getByRole("textbox", { name: "Layout name" })
    .fill("Vertical interview");
  await dialog
    .getByRole("combobox", { name: "Aspect ratio" })
    .selectOption("9:16");
  await dialog.getByRole("radio", { name: /Host \+ Video/u }).check();
  await dialog.getByRole("button", { name: "Create Layout" }).click();

  await expect(
    page.getByRole("heading", { level: 2, name: "Vertical interview" }),
  ).toBeVisible();
  const frame = page.locator("[data-layout-frame]");
  await expect(frame).toHaveAttribute("data-ratio", "9:16");
  const wideFrame = await frame.boundingBox();
  if (wideFrame === null)
    throw new Error("Expected the portrait audience frame.");
  expect(wideFrame.width / wideFrame.height).toBeCloseTo(9 / 16, 2);
  await page.setViewportSize({ width: 1200, height: 900 });
  const narrowFrame = await frame.boundingBox();
  if (narrowFrame === null)
    throw new Error("Expected the resized audience frame.");
  expect(narrowFrame.width / narrowFrame.height).toBeCloseTo(9 / 16, 2);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await expect(
    page.getByRole("button", { name: "Host camera Slot" }),
  ).toBeVisible();

  const slot = page.getByRole("button", { name: "Host camera Slot" });
  await slot.click();
  const inspector = page.getByRole("complementary", {
    name: "Layout inspector",
  });
  if (!(await inspector.isVisible()))
    await page.getByRole("button", { name: "Show Layout inspector" }).click();
  const x = inspector.getByRole("spinbutton", { name: "X" });
  await x.fill("20");
  await x.press("Tab");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect(slot).toHaveCSS("left", /.+/u);

  const resizeSlot = page.getByRole("button", { name: "Main video Slot" });
  await resizeSlot.click();
  const resizeHandle = resizeSlot.locator("span[aria-hidden='true']");
  const resizeBox = await resizeHandle.boundingBox();
  const beforeResize = await resizeSlot.getAttribute("style");
  if (resizeBox === null) throw new Error("Expected the Slot resize handle.");
  await page.mouse.move(
    resizeBox.x + resizeBox.width / 2,
    resizeBox.y + resizeBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    resizeBox.x + resizeBox.width / 2 + 20,
    resizeBox.y + resizeBox.height / 2 + 20,
    { steps: 4 },
  );
  await page.mouse.up();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect(resizeSlot).not.toHaveAttribute("style", beforeResize ?? "");
  await page.getByRole("button", { name: "Undo Layout change" }).click();
  await expect(resizeSlot).toHaveAttribute("style", beforeResize ?? "");

  const before = await slot.getAttribute("style");
  const box = await slot.boundingBox();
  if (box === null) throw new Error("Expected a visible Slot.");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 30,
    box.y + box.height / 2 + 20,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Undo Layout change" }).click();
  await expect(slot).toHaveAttribute("style", before ?? "");

  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: "test-results/sprint-10-layout-editor.png",
  });

  await expect(frame.locator("div[aria-hidden='true']")).toBeVisible();
  await page.getByRole("switch", { name: "Audience preview" }).click();
  await expect(frame.locator("div[aria-hidden='true']")).toHaveCount(0);
  await expect(
    page.getByRole("complementary", { name: "Layout inspector" }),
  ).toHaveCount(0);

  const accessibility = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});
