import { defineConfig } from "vitest/config";

export default defineConfig({
  root: import.meta.dirname,
  test: {
    coverage: {
      exclude: ["**/*.d.ts", "**/*.test.*", "**/*.spec.*", "**/index.ts"],
      include: [
        "packages/*/src/**/*.{ts,tsx,mts}",
        "apps/desktop/src/{main,preload}/**/*.{ts,tsx,mts}",
      ],
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage/unit",
    },
    environment: "node",
    include: [
      "scripts/ci-workflows.test.mts",
      "scripts/decision-templates.test.mts",
      "scripts/design-tokens.test.mts",
      "packages/**/*.{test,spec}.{ts,tsx,mts}",
      "apps/desktop/src/{main,preload}/**/*.{test,spec}.{ts,tsx,mts}",
    ],
  },
});
