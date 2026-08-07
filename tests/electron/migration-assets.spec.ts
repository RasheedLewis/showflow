import fs from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { getPackagedResourcesPath } from "../../scripts/support/packaged-executable.mjs";

test("packages the canonical migration directory", async () => {
  const migrationReadme = await fs.readFile(
    path.join(getPackagedResourcesPath(), "migrations", "README.md"),
    "utf8",
  );

  expect(migrationReadme).toContain("Showflow database migrations");
  expect(migrationReadme).toContain("forward-only SQLite schema migrations");
  await expect(
    fs.readFile(
      path.join(
        getPackagedResourcesPath(),
        "migrations",
        "001_application_settings.sql",
      ),
      "utf8",
    ),
  ).resolves.toContain("CREATE TABLE app_settings");
  await expect(
    fs.readFile(
      path.join(
        getPackagedResourcesPath(),
        "migrations",
        "004_show_segments_and_blueprint_placements.sql",
      ),
      "utf8",
    ),
  ).resolves.toContain("CREATE TABLE blueprint_segment_placements");
  await expect(
    fs.readFile(
      path.join(getPackagedResourcesPath(), "migrations", "005_episodes.sql"),
      "utf8",
    ),
  ).resolves.toContain("CREATE TABLE episode_segments");
});

test("packages third-party license notices", async () => {
  const notices = await fs.readFile(
    path.join(getPackagedResourcesPath(), "THIRD_PARTY_NOTICES.md"),
    "utf8",
  );

  expect(notices).toContain("Geist and Geist Mono");
  expect(notices).toContain("SIL OPEN FONT LICENSE Version 1.1");
  expect(notices).toContain("Copyright 2024 The Geist Project Authors");
  expect(notices).toContain("Lucide Icons and Contributors");
  expect(notices).toContain("Radix UI Primitives");
  expect(notices).toContain("Floating UI contributors");
  expect(notices).toContain("@dnd-kit/core");
  expect(notices).toContain("Claudéric Demers");
});
