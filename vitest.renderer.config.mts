import { defineConfig } from "vitest/config";

export default defineConfig({
  root: import.meta.dirname,
  test: {
    coverage: {
      exclude: ["**/*.d.ts", "**/*.test.*", "**/*.spec.*", "**/renderer.tsx"],
      include: [
        "apps/desktop/src/renderer/**/*.{ts,tsx}",
        "packages/ui/src/**/*.{ts,tsx}",
      ],
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage/renderer",
    },
    environment: "jsdom",
    include: [
      "apps/desktop/src/renderer/**/*.{test,spec}.{ts,tsx,mts}",
      "packages/ui/src/**/*.{test,spec}.{ts,tsx,mts}",
    ],
    setupFiles: ["apps/desktop/src/renderer/test/setup.ts"],
  },
});
