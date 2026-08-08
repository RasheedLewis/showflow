import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { _electron as electron, expect, test } from "@playwright/test";
import type { ShowflowDesktopApi } from "@showflow/contracts";

import { getPackagedExecutablePath } from "../../scripts/support/packaged-executable.mjs";

type StartupWindow = Window & { readonly showflow: ShowflowDesktopApi };

test("reopens a persisted Studio and loads the complete Studio switcher", async () => {
  const userDataDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "showflow-startup-e2e-"),
  );
  const launchOptions = {
    args: [`--user-data-dir=${userDataDirectory}`],
    executablePath: getPackagedExecutablePath(),
  };

  try {
    const firstApplication = await electron.launch(launchOptions);
    try {
      const firstPage = await firstApplication.firstWindow();
      const setupResult = await firstPage.evaluate(async () => {
        const api = (window as unknown as StartupWindow).showflow;
        const firstStudio = await api.studios.create({ name: "Public Sphere" });
        const secondStudio = await api.studios.create({ name: "Field Notes" });
        if (!firstStudio.ok || !secondStudio.ok) return { ok: false } as const;
        const route = `/studio/${firstStudio.data.id}`;
        const settings = await api.app.updateNavigation({
          lastRoute: route,
          lastStudioId: firstStudio.data.id,
        });
        return {
          ok: settings.ok,
          firstStudioId: firstStudio.data.id,
          secondStudioId: secondStudio.data.id,
        } as const;
      });
      expect(setupResult.ok).toBe(true);
    } finally {
      await firstApplication.close();
    }

    const secondApplication = await electron.launch(launchOptions);
    try {
      const secondPage = await secondApplication.firstWindow();
      await expect(
        secondPage.getByRole("heading", { level: 1, name: "Shows" }),
      ).toBeVisible();
      await secondPage
        .getByRole("button", {
          name: "Switch Studio. Current Studio: Public Sphere",
        })
        .click();
      await expect(
        secondPage.getByRole("menuitem", { name: "Field Notes" }),
      ).toBeVisible();
    } finally {
      await secondApplication.close();
    }
  } finally {
    await fs.rm(userDataDirectory, { force: true, recursive: true });
  }
});
