import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  COMPONENT_GALLERY_ROUTE,
  GALLERY_COMPONENTS,
} from "../../apps/desktop/src/renderer/development/component-gallery-contract.mts";
import { installMockDesktopApi } from "../support/mock-desktop-api.ts";

test.beforeEach(async ({ page }) => {
  await installMockDesktopApi(page);
  await page.goto(`/#${COMPONENT_GALLERY_ROUTE}`);
});

test("the internal route renders every component and required gallery state", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Component development gallery",
    }),
  ).toBeVisible();

  const renderedComponents = await page
    .locator("[data-component]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-component")),
    );

  expect(new Set(renderedComponents)).toEqual(new Set(GALLERY_COMPONENTS));
  await expect(page.locator('[data-gallery-focus="true"]').first()).toHaveCSS(
    "outline-width",
    "2px",
  );
  await expect(
    page.getByRole("textbox", { name: "Invalid Segment name" }),
  ).toHaveAttribute("aria-invalid", "true");

  const longLabel = page.getByRole("button", {
    name: "Add the selected reusable Segment to this Episode Storyboard",
  });
  await expect(longLabel).toBeVisible();
  expect(
    await longLabel.evaluate((element) => element.scrollWidth),
  ).toBeLessThanOrEqual(
    await longLabel.evaluate((element) => element.clientWidth),
  );

  const safeAreas = page.getByRole("switch", { name: "Safe areas" });
  await expect(safeAreas).toHaveAttribute("aria-checked", "true");
  await safeAreas.click();
  await expect(safeAreas).toHaveAttribute("aria-checked", "false");

  const menuTrigger = page.getByRole("button", { name: "Segment actions" });
  await menuTrigger.focus();
  await menuTrigger.press("Enter");
  await expect(
    page.getByRole("menu", { name: "Segment actions" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menuTrigger).toBeFocused();
});

test("the component gallery has no serious Axe violations", async ({
  page,
}) => {
  const results = await new AxeBuilder({ page }).analyze();
  const seriousViolations = results.violations
    .filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    )
    .map((violation) => ({
      help: violation.help,
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    }));

  expect(seriousViolations).toEqual([]);
});
