import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { _electron as electron, expect, test } from "@playwright/test";
import type { ShowflowDesktopApi } from "@showflow/contracts";

import { getPackagedExecutablePath } from "../../scripts/support/packaged-executable.mjs";

type RouteRestoreWindow = Window & { readonly showflow: ShowflowDesktopApi };

test("restores a durable Show route and recovers it after deletion", async () => {
  const userDataDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "showflow-route-restore-e2e-"),
  );
  const launchOptions = {
    args: [`--user-data-dir=${userDataDirectory}`],
    executablePath: getPackagedExecutablePath(),
  };

  try {
    const setup = await (async () => {
      const setupApplication = await electron.launch(launchOptions);
      try {
        const setupPage = await setupApplication.firstWindow();
        await expect(
          setupPage.getByRole("heading", {
            level: 2,
            name: "Create your first Studio",
          }),
        ).toBeVisible();
        return setupPage.evaluate(async () => {
          const api = (window as unknown as RouteRestoreWindow).showflow;
          const studio = await api.studios.create({ name: "Public Sphere" });
          if (!studio.ok) return { ok: false } as const;
          const show = await api.shows.create({
            name: "Artist Interviews",
            studioId: studio.data.id,
          });
          if (!show.ok) return { ok: false } as const;
          const route = `/studio/${studio.data.id}/show/${show.data.show.id}`;
          const settings = await api.app.updateNavigation({
            lastRoute: route,
            lastStudioId: studio.data.id,
          });
          return {
            ok: settings.ok,
            showId: show.data.show.id,
            studioId: studio.data.id,
          } as const;
        });
      } finally {
        await setupApplication.close();
      }
    })();
    expect(setup.ok).toBe(true);
    if (!setup.ok) throw new Error("Show setup failed.");
    const { showId, studioId } = setup;

    const restoredApplication = await electron.launch(launchOptions);
    try {
      const restoredPage = await restoredApplication.firstWindow();
      await expect(
        restoredPage.getByRole("heading", {
          level: 1,
          name: "Artist Interviews",
        }),
      ).toBeVisible();
      await expect(
        restoredPage.getByRole("heading", {
          level: 2,
          name: "Create New Episode",
        }),
      ).toBeVisible();
      const deleted = await restoredPage.evaluate(
        async ({ currentShowId, currentStudioId }) => {
          const api = (window as unknown as RouteRestoreWindow).showflow;
          return api.shows.delete({
            showId: currentShowId,
            studioId: currentStudioId,
          });
        },
        { currentShowId: showId, currentStudioId: studioId },
      );
      expect(deleted.ok).toBe(true);
    } finally {
      await restoredApplication.close();
    }

    const recoveredApplication = await electron.launch(launchOptions);
    try {
      const recoveredPage = await recoveredApplication.firstWindow();
      await expect(
        recoveredPage.getByRole("heading", {
          level: 1,
          name: "Public Sphere",
        }),
      ).toBeVisible();
      await expect(
        recoveredPage.getByRole("heading", { level: 2, name: "Shows" }),
      ).toBeVisible();
      await expect
        .poll(() =>
          recoveredPage.evaluate(async () => {
            const api = (window as unknown as RouteRestoreWindow).showflow;
            return api.app.getApplicationSettings();
          }),
        )
        .toMatchObject({
          ok: true,
          data: {
            lastRoute: `/studio/${studioId}`,
            lastStudioId: studioId,
          },
        });
    } finally {
      await recoveredApplication.close();
    }
  } finally {
    await fs.rm(userDataDirectory, { force: true, recursive: true });
  }
});
