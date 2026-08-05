import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { _electron as electron, expect, test } from "@playwright/test";
import type { ShowflowDesktopApi } from "@showflow/contracts";

import { getPackagedExecutablePath } from "../../scripts/support/packaged-executable.mjs";

type SettingsWindow = Window & {
  readonly showflow: ShowflowDesktopApi;
};

const STUDIO_ID = "8d9df01f-2584-4b9a-ad13-a96d673918e9";
const LAST_ROUTE = `/studio/${STUDIO_ID}/show/new`;

test("persists and reloads the last route through the desktop API", async () => {
  const userDataDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "showflow-settings-e2e-"),
  );
  const launchOptions = {
    args: [`--user-data-dir=${userDataDirectory}`],
    executablePath: getPackagedExecutablePath(),
  };

  try {
    const firstApplication = await electron.launch(launchOptions);
    try {
      const firstPage = await firstApplication.firstWindow();
      const firstResult = await firstPage.evaluate(
        async ({ lastRoute, lastStudioId }) =>
          (window as unknown as SettingsWindow).showflow.app.updateNavigation({
            lastRoute,
            lastStudioId,
          }),
        { lastRoute: LAST_ROUTE, lastStudioId: STUDIO_ID },
      );

      expect(firstResult).toMatchObject({
        ok: true,
        data: { lastRoute: LAST_ROUTE, lastStudioId: STUDIO_ID },
      });
    } finally {
      await firstApplication.close();
    }

    const secondApplication = await electron.launch(launchOptions);
    try {
      const secondPage = await secondApplication.firstWindow();
      const reloadedResult = await secondPage.evaluate(() =>
        (
          window as unknown as SettingsWindow
        ).showflow.app.getApplicationSettings(),
      );

      expect(reloadedResult).toMatchObject({
        ok: true,
        data: { lastRoute: LAST_ROUTE, lastStudioId: STUDIO_ID },
      });
    } finally {
      await secondApplication.close();
    }
  } finally {
    await fs.rm(userDataDirectory, { force: true, recursive: true });
  }
});
