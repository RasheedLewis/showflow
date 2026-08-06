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
    const appBar = document.querySelector<HTMLElement>(".app-bar");

    if (!appBar || !panel) {
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
      fontVariantNumeric: durationStyles.fontVariantNumeric,
    };

    duration.remove();

    return {
      accent: rootStyles.getPropertyValue("--sf-accent").trim(),
      appBarBackground: appBarStyles.backgroundColor,
      appBarHeight: appBarStyles.height,
      background: bodyStyles.backgroundColor,
      durationTypography,
      fontFamily: bodyStyles.fontFamily,
      panelBackground: getComputedStyle(panel).backgroundColor,
      text: bodyStyles.color,
    };
  });

  expect(visualFoundation).toMatchObject({
    accent: "#d6b24a",
    appBarBackground: "rgb(17, 19, 21)",
    appBarHeight: "64px",
    background: "rgb(13, 15, 16)",
    durationTypography: {
      fontVariantNumeric: "tabular-nums",
    },
    panelBackground: "rgb(23, 26, 29)",
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
