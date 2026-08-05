import path from "node:path";

import { defineConfig } from "@playwright/test";

const browserBaseUrl = "http://127.0.0.1:4173";
const desktopDirectory = path.join(import.meta.dirname, "apps/desktop");
const isContinuousIntegration = process.env["CI"] !== undefined;

export default defineConfig({
  expect: {
    timeout: 5_000,
  },
  forbidOnly: isContinuousIntegration,
  fullyParallel: true,
  outputDir: "test-results/playwright",
  projects: [
    {
      name: "browser",
      testMatch: "browser/**/*.spec.ts",
      use: {
        browserName: "chromium",
        viewport: { height: 720, width: 1280 },
      },
    },
    {
      name: "electron",
      testMatch: "electron/**/*.spec.ts",
    },
  ],
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  retries: isContinuousIntegration ? 2 : 0,
  testDir: "tests",
  timeout: 30_000,
  use: {
    baseURL: browserBaseUrl,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command:
      "pnpm exec vite --config vite.renderer.config.mts --host 127.0.0.1 --port 4173 --strictPort",
    cwd: desktopDirectory,
    reuseExistingServer: !isContinuousIntegration,
    timeout: 30_000,
    url: browserBaseUrl,
  },
  ...(isContinuousIntegration ? { workers: 1 } : {}),
});
