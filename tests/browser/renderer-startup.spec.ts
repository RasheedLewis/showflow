import { expect, test } from "@playwright/test";
import type { ShowflowDesktopApi } from "@showflow/contracts";

import {
  DEFAULT_RUNTIME_INFO_RESULT,
  installMockDesktopApi,
} from "../support/mock-desktop-api.ts";

type BrowserShowflowWindow = Window & {
  readonly showflow: ShowflowDesktopApi;
};

test.beforeEach(async ({ page }) => {
  await installMockDesktopApi(page);
});

test("the development screen renders with the typed mock desktop API", async ({
  page,
}) => {
  await page.goto("/");

  const appBar = page.getByRole("banner", { name: "Showflow application" });

  await expect(appBar.getByText("Showflow", { exact: true })).toBeVisible();
  await expect(appBar.getByText("Desktop foundation")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Showflow is ready." }),
  ).toBeVisible();

  const mockState = await page.evaluate(async () => {
    const showflow = (window as unknown as BrowserShowflowWindow).showflow;

    return {
      apiVersion: showflow.apiVersion,
      runtimeInfo: await showflow.app.getRuntimeInfo(),
      settingsAfterUpdate: await showflow.app.updateNavigation({
        lastRoute: "/studio/new",
        lastStudioId: null,
      }),
      settingsAfterReload: await showflow.app.getApplicationSettings(),
    };
  });

  expect(mockState).toEqual({
    apiVersion: DEFAULT_RUNTIME_INFO_RESULT.data.desktopApiVersion,
    runtimeInfo: DEFAULT_RUNTIME_INFO_RESULT,
    settingsAfterUpdate: {
      ok: true,
      data: {
        lastRoute: "/studio/new",
        lastStudioId: null,
        windowPreferences: null,
      },
    },
    settingsAfterReload: {
      ok: true,
      data: {
        lastRoute: "/studio/new",
        lastStudioId: null,
        windowPreferences: null,
      },
    },
  });

  const visualFoundation = await page.evaluate(() => {
    const rootStyles = getComputedStyle(document.documentElement);
    const bodyStyles = getComputedStyle(document.body);
    const panel = document.querySelector<HTMLElement>(".status-panel");
    const appBar = document.querySelector<HTMLElement>(
      'header[aria-label="Showflow application"]',
    );
    const heading = document.querySelector<HTMLElement>("#showflow-heading");
    const statusDetail = document.querySelector<HTMLElement>(".status-detail");

    if (!appBar || !heading || !panel || !statusDetail) {
      throw new Error("The Showflow application shell is incomplete.");
    }

    const appBarStyles = getComputedStyle(appBar);
    const duration = document.createElement("span");

    duration.className = "sf-duration";
    duration.textContent = "01:30";
    document.body.append(duration);

    const durationStyles = getComputedStyle(duration);
    const durationTypography = {
      fontFamily: durationStyles.fontFamily,
      fontSize: durationStyles.fontSize,
      fontVariantNumeric: durationStyles.fontVariantNumeric,
      fontWeight: durationStyles.fontWeight,
      lineHeight: durationStyles.lineHeight,
    };

    duration.remove();

    return {
      accent: rootStyles.getPropertyValue("--sf-accent").trim(),
      appBarBackground: appBarStyles.backgroundColor,
      appBarHeight: appBarStyles.height,
      background: bodyStyles.backgroundColor,
      durationTypography,
      fontFamily: bodyStyles.fontFamily,
      headingTypography: {
        fontSize: getComputedStyle(heading).fontSize,
        fontWeight: getComputedStyle(heading).fontWeight,
        lineHeight: getComputedStyle(heading).lineHeight,
      },
      panelBackground: getComputedStyle(panel).backgroundColor,
      statusDetailTypography: {
        fontSize: getComputedStyle(statusDetail).fontSize,
        fontWeight: getComputedStyle(statusDetail).fontWeight,
        lineHeight: getComputedStyle(statusDetail).lineHeight,
      },
      text: bodyStyles.color,
    };
  });

  expect(visualFoundation).toMatchObject({
    accent: "#d6b24a",
    appBarBackground: "rgb(17, 19, 21)",
    appBarHeight: "64px",
    background: "rgb(13, 15, 16)",
    durationTypography: {
      fontSize: "16px",
      fontVariantNumeric: "tabular-nums",
      fontWeight: "500",
      lineHeight: "20px",
    },
    headingTypography: {
      fontSize: "32px",
      fontWeight: "600",
      lineHeight: "40px",
    },
    panelBackground: "rgb(23, 26, 29)",
    statusDetailTypography: {
      fontSize: "16px",
      fontWeight: "400",
      lineHeight: "24px",
    },
    text: "rgb(244, 243, 239)",
  });
  expect(visualFoundation.fontFamily).toMatch(
    /^"Geist Variable", Geist, "Geist Sans"/u,
  );
  expect(visualFoundation.fontFamily).toContain("system-ui");
  expect(visualFoundation.durationTypography.fontFamily).toMatch(
    /^"Geist Mono Variable", "Geist Mono"/u,
  );

  const loadedFonts = await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('400 16px "Geist Variable"', "Showflow"),
      document.fonts.load('500 16px "Geist Mono Variable"', "01:30"),
    ]);

    return {
      mono: document.fonts.check('500 16px "Geist Mono Variable"', "01:30"),
      sans: document.fonts.check('400 16px "Geist Variable"', "Showflow"),
    };
  });

  expect(loadedFonts).toEqual({ mono: true, sans: true });
});

test("the application shell preserves its workspace across desktop widths", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto("/");

  const main = page.getByRole("main", { name: "Showflow is ready." });
  const primaryAction = page.getByRole("button", { name: "Create Studio" });
  const inspector = page.getByRole("complementary", { name: "Inspector" });

  await expect(main).toBeVisible();
  await expect(primaryAction).toBeVisible();
  await expect(inspector).toBeVisible();
  await expect(
    page.getByRole("banner", { name: "Showflow application" }),
  ).toHaveCSS("height", "64px");

  await page.getByRole("button", { name: "Hide Inspector" }).click();
  await expect(inspector).toBeHidden();
  await expect(main).toBeVisible();

  await page.setViewportSize({ height: 760, width: 1000 });
  await expect(main).toBeVisible();
  await expect(primaryAction).toBeVisible();

  const catalogTrigger = page.getByRole("button", {
    name: "Open Workspace navigation",
  });
  await catalogTrigger.click();
  const catalog = page.getByRole("complementary", {
    name: "Workspace navigation",
  });
  await expect(catalog).toBeVisible();
  await expect(catalog).toHaveCSS("position", "fixed");
  await expect(main).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(catalog).toBeHidden();
  await expect(catalogTrigger).toBeFocused();

  await page.getByRole("button", { name: "Show Inspector" }).click();
  await expect(inspector).toBeVisible();
  await expect(inspector).toHaveCSS("position", "fixed");
  await expect(main).toBeVisible();
});

test("keyboard focus remains visible and critical targets meet the minimum size", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto("/");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to workspace" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toHaveCSS("outline-width", "2px");

  await skipLink.press("Enter");
  const main = page.getByRole("main", { name: "Showflow is ready." });
  await expect(main).toBeFocused();
  await expect(main).toHaveCSS("outline-width", "2px");

  const primaryAction = page.getByRole("button", { name: "Create Studio" });
  await primaryAction.focus();
  await expect(primaryAction).toHaveCSS("outline-width", "2px");

  const targets = await Promise.all(
    [
      page.getByRole("button", { name: "Studio switcher" }),
      page.getByRole("button", { name: "Create Studio" }),
      page.getByRole("button", { name: "Application menu" }),
    ].map(async (locator) => locator.boundingBox()),
  );

  for (const target of targets) {
    expect(target).not.toBeNull();
    expect(target?.height).toBeGreaterThanOrEqual(44);
    expect(target?.width).toBeGreaterThanOrEqual(44);
  }
});

test("reduced motion keeps the shell functional while making motion immediate", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const motion = await page.evaluate(() => {
    const rootStyles = getComputedStyle(document.documentElement);
    const foundationalControl = document.querySelector<HTMLElement>("button");
    const skipLink = document.querySelector<HTMLElement>(
      'a[href^="#sf-main-"]',
    );

    if (!foundationalControl || !skipLink) {
      throw new Error("The reduced-motion foundation controls are missing.");
    }

    const controlStyles = getComputedStyle(foundationalControl);

    return {
      durationTokens: [
        "--sf-motion-instant",
        "--sf-motion-fast",
        "--sf-motion-standard",
        "--sf-motion-slow",
        "--sf-motion-emphasis",
      ].map((token) => controlStyles.getPropertyValue(token).trim()),
      mediaMatches: window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches,
      controlTransitionDurations: controlStyles.transitionDuration.split(", "),
      reducedToken: rootStyles.getPropertyValue("--sf-motion-reduced").trim(),
      skipLinkTransitionProperties:
        getComputedStyle(skipLink).transitionProperty.split(", "),
    };
  });

  expect(motion).toEqual({
    durationTokens: ["1ms", "1ms", "1ms", "1ms", "1ms"],
    mediaMatches: true,
    controlTransitionDurations: ["0.001s"],
    reducedToken: "1ms",
    skipLinkTransitionProperties: ["opacity"],
  });

  const inspectorTrigger = page.getByRole("button", { name: "Hide Inspector" });
  await inspectorTrigger.click();
  await expect(
    page.getByRole("complementary", { name: "Inspector" }),
  ).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Show Inspector" }),
  ).toBeFocused();
  await expect(
    page.getByRole("main", { name: "Showflow is ready." }),
  ).toBeVisible();
});
