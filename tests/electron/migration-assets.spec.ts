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
});
