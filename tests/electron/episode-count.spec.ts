import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { _electron as electron, expect, test } from "@playwright/test";
import type { ShowflowDesktopApi } from "@showflow/contracts";

import { getPackagedExecutablePath } from "../../scripts/support/packaged-executable.mjs";

type EpisodeCountWindow = Window & { readonly showflow: ShowflowDesktopApi };

test("reports a newly created Episode on its packaged Show card", async () => {
  const userDataDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "showflow-episode-count-e2e-"),
  );
  const application = await electron.launch({
    args: [`--user-data-dir=${userDataDirectory}`],
    executablePath: getPackagedExecutablePath(),
  });

  try {
    const page = await application.firstWindow();
    const setup = await page.evaluate(async () => {
      const api = (window as unknown as EpisodeCountWindow).showflow;
      const studio = await api.studios.create({ name: "Public Sphere" });
      if (!studio.ok) return { ok: false } as const;
      const show = await api.shows.create({
        name: "Artist Interviews",
        studioId: studio.data.id,
      });
      if (!show.ok) return { ok: false } as const;
      const episode = await api.episodes.create({
        showId: show.data.show.id,
        source: "blank",
        studioId: studio.data.id,
        title: "Episode 1",
      });
      if (!episode.ok) return { ok: false } as const;
      const cards = await api.shows.list({ studioId: studio.data.id });
      return {
        ok: cards.ok,
        cards: cards.ok ? cards.data : [],
        route: `/studio/${studio.data.id}`,
      } as const;
    });

    expect(setup).toMatchObject({
      ok: true,
      cards: [{ episodeCount: 1 }],
    });
    if (!setup.ok) throw new Error("Episode count setup failed.");
    await page.evaluate((route) => {
      window.location.hash = route;
    }, setup.route);
    await expect(page.getByText("1 Episode", { exact: true })).toBeVisible();
  } finally {
    await application.close();
    await fs.rm(userDataDirectory, { force: true, recursive: true });
  }
});
