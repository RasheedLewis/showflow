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
