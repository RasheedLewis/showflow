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

test("the gallery exercises hover, focus, disabled, and error visuals", async ({
  page,
}) => {
  const buttonExample = page.getByRole("article", {
    name: "Button component example",
  });
  const primaryButton = buttonExample.getByRole("button", {
    name: "Add Segment",
  });

  await primaryButton.hover();
  await expect(primaryButton).toHaveCSS(
    "background-color",
    "rgb(225, 193, 94)",
  );

  const textInputExample = page.getByRole("article", {
    name: "TextInput component example",
  });
  const defaultInput = textInputExample.getByRole("textbox", {
    exact: true,
    name: "Segment name",
  });

  await defaultInput.hover();
  await expect(defaultInput).toHaveCSS(
    "border-top-color",
    "rgba(255, 255, 255, 0.18)",
  );

  const objectCardExample = page.getByRole("article", {
    name: "ObjectCard component example",
  });
  const defaultObjectCard = objectCardExample.getByRole("article", {
    name: "Opening",
  });

  await defaultObjectCard.hover();
  await expect(defaultObjectCard).toHaveCSS(
    "background-color",
    "rgb(33, 38, 42)",
  );

  const tooltipTrigger = page.getByRole("button", {
    exact: true,
    name: "Search",
  });
  await tooltipTrigger.hover();
  await expect(
    page.getByRole("tooltip", { name: "Search the Segment Catalog" }),
  ).toBeVisible();

  const menuTrigger = page.getByRole("button", { name: "Segment actions" });
  await menuTrigger.click();
  const destructiveMenuItem = page.getByRole("menuitem", {
    name: "Remove Segment",
  });
  await destructiveMenuItem.hover();
  await expect(destructiveMenuItem).toHaveAttribute("data-highlighted");
  await expect(destructiveMenuItem).toHaveCSS(
    "background-color",
    "rgb(33, 38, 42)",
  );
  await page.keyboard.press("Escape");

  const focusSamples = page.locator('[data-gallery-focus="true"]');
  await expect(focusSamples).toHaveCount(5);
  for (const focusSample of await focusSamples.all()) {
    await expect(focusSample).toHaveCSS("outline-width", "2px");
  }

  await expect(
    buttonExample.getByRole("button", { exact: true, name: "Disabled" }),
  ).toBeDisabled();
  await expect(
    page
      .getByRole("article", { name: "IconButton component example" })
      .getByRole("button", { name: "Remove Segment" }),
  ).toBeDisabled();
  await expect(
    textInputExample.getByRole("textbox", { name: "Disabled field" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: "Disabled notes" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("combobox", { name: "Disabled Layout" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("checkbox", { name: "Locked by Show default" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("switch", { name: "Disabled guide" }),
  ).toBeDisabled();
  await expect(page.getByRole("tab", { name: "Resources" })).toBeDisabled();
  await expect(
    objectCardExample.getByRole("article", { name: "Disabled" }),
  ).toHaveAttribute("aria-disabled", "true");

  for (const invalidField of [
    page.getByRole("textbox", { name: "Invalid Segment name" }),
    page.getByRole("textbox", { name: "Recovery note" }),
    page.getByRole("combobox", { name: "Invalid Layout" }),
  ]) {
    await expect(invalidField).toHaveAttribute("aria-invalid", "true");
    await expect(invalidField).toHaveCSS(
      "border-top-color",
      "rgb(217, 106, 106)",
    );
  }
  await expect(
    objectCardExample.getByRole("article", { name: "Invalid" }),
  ).toHaveAttribute("data-invalid", "true");
  await expect(
    page
      .getByRole("article", { name: "SaveStateIndicator component example" })
      .getByText("Could not save"),
  ).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: "ValidationItem component example" })
      .getByText("Blocking issue", { exact: true }),
  ).toBeVisible();
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
