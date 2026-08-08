import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { _electron as electron, expect, test } from "@playwright/test";
import type { ShowflowDesktopApi } from "@showflow/contracts";

import { getPackagedExecutablePath } from "../../scripts/support/packaged-executable.mjs";

type DesignShowWindow = Window & { readonly showflow: ShowflowDesktopApi };

test("reorders and reloads a persistent Blueprint in packaged Electron", async () => {
  const userDataDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "showflow-design-show-e2e-"),
  );
  const launchOptions = {
    args: [`--user-data-dir=${userDataDirectory}`],
    executablePath: getPackagedExecutablePath(),
  };

  try {
    const firstApplication = await electron.launch(launchOptions);
    try {
      const page = await firstApplication.firstWindow();
      const setup = await page.evaluate(async () => {
        const api = (window as unknown as DesignShowWindow).showflow;
        const studio = await api.studios.create({ name: "Public Sphere" });
        if (!studio.ok) return { ok: false } as const;
        const show = await api.shows.create({
          name: "Artist Interviews",
          studioId: studio.data.id,
        });
        if (!show.ok) return { ok: false } as const;
        const opening = await api.segments.create({
          blueprintId: show.data.blueprint.id,
          name: "Opening",
          showId: show.data.show.id,
          studioId: studio.data.id,
        });
        if (!opening.ok) return { ok: false } as const;
        const interview = await api.segments.create({
          blueprintId: show.data.blueprint.id,
          name: "Interview",
          showId: show.data.show.id,
          studioId: studio.data.id,
        });
        if (!interview.ok) return { ok: false } as const;
        return {
          ok: true,
          route: `/studio/${studio.data.id}/show/${show.data.show.id}/design/blueprint`,
          showId: show.data.show.id,
          studioId: studio.data.id,
        } as const;
      });
      expect(setup.ok).toBe(true);
      if (!setup.ok) throw new Error("Design Show setup failed.");

      await page.evaluate((route) => {
        window.location.hash = route;
      }, setup.route);
      const storyboard = page.getByRole("list", {
        name: "Show Blueprint Storyboard",
      });
      await expect(storyboard.getByRole("listitem")).toHaveCount(2);
      const names = () =>
        storyboard
          .getByRole("listitem")
          .getByRole("heading", { level: 3 })
          .allTextContents();
      await expect.poll(names).toEqual(["Opening", "Interview"]);

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
        { steps: 12 },
      );
      await page.mouse.up();
      await expect.poll(names).toEqual(["Interview", "Opening"]);
      await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    } finally {
      await firstApplication.close();
    }

    const secondApplication = await electron.launch(launchOptions);
    try {
      const page = await secondApplication.firstWindow();
      const storyboard = page.getByRole("list", {
        name: "Show Blueprint Storyboard",
      });
      await expect(storyboard.getByRole("listitem")).toHaveCount(2);
      await expect
        .poll(() =>
          storyboard
            .getByRole("listitem")
            .getByRole("heading", { level: 3 })
            .allTextContents(),
        )
        .toEqual(["Interview", "Opening"]);
    } finally {
      await secondApplication.close();
    }
  } finally {
    await fs.rm(userDataDirectory, { force: true, recursive: true });
  }
});
