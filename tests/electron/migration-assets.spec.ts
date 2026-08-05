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
});
