import fs from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..");
const TOKEN_FILE = path.join(REPOSITORY_ROOT, "packages/ui/src/tokens.css");

type StringRecord = Record<string, string>;

interface PackageManifest {
  readonly dependencies?: StringRecord;
  readonly exports?: StringRecord;
}

const readManifest = (filePath: string): PackageManifest =>
  JSON.parse(fs.readFileSync(filePath, "utf8")) as PackageManifest;

const parseTokens = (source: string): Map<string, string> => {
  const tokens = new Map<string, string>();
  const declaration = /(--sf-[a-z0-9-]+):\s*([^;]+);/gu;

  for (const match of source.matchAll(declaration)) {
    const name = match[1];
    const value = match[2];

    if (!name || !value) {
      continue;
    }

    if (tokens.has(name)) {
      throw new Error(`Duplicate design token: ${name}`);
    }

    tokens.set(name, value.replace(/\s+/gu, " ").trim());
  }

  return tokens;
};

const expectTokenGroup = (
  tokens: ReadonlyMap<string, string>,
  expected: StringRecord,
): void => {
  for (const [name, value] of Object.entries(expected)) {
    expect(tokens.get(name), name).toBe(value);
  }
};

describe("initial design token contract", () => {
  const source = fs.readFileSync(TOKEN_FILE, "utf8");
  const tokens = parseTokens(source);

  test("defines the canonical dark color foundation", () => {
    expect(source.match(/:root\s*\{/gu)).toHaveLength(1);
    expect(source).toContain("color-scheme: dark;");
    expect(source).not.toMatch(/prefers-color-scheme|data-theme/iu);

    expectTokenGroup(tokens, {
      "--sf-bg-canvas": "#0d0f10",
      "--sf-bg-base": "#111315",
      "--sf-bg-panel": "#171a1d",
      "--sf-bg-card": "#1b1f22",
      "--sf-bg-card-hover": "#21262a",
      "--sf-bg-elevated": "#252b30",
      "--sf-bg-input": "#131619",
      "--sf-bg-scrim": "rgba(0, 0, 0, 0.62)",
      "--sf-text-primary": "#f4f3ef",
      "--sf-text-secondary": "#b9bdc1",
      "--sf-text-tertiary": "#81878d",
      "--sf-text-disabled": "#5f656b",
      "--sf-text-inverse": "#111315",
      "--sf-accent": "#d6b24a",
      "--sf-accent-hover": "#e1c15e",
      "--sf-accent-pressed": "#c49d36",
      "--sf-accent-muted": "rgba(214, 178, 74, 0.14)",
      "--sf-accent-border": "rgba(214, 178, 74, 0.62)",
      "--sf-accent-focus": "rgba(214, 178, 74, 0.38)",
    });
  });

  test("defines the canonical borders and semantic state colors", () => {
    expectTokenGroup(tokens, {
      "--sf-border-subtle": "rgba(255, 255, 255, 0.06)",
      "--sf-border-default": "rgba(255, 255, 255, 0.1)",
      "--sf-border-strong": "rgba(255, 255, 255, 0.18)",
      "--sf-divider": "rgba(255, 255, 255, 0.08)",
      "--sf-grid-line": "rgba(255, 255, 255, 0.045)",
      "--sf-success": "#62b589",
      "--sf-success-muted": "rgba(98, 181, 137, 0.14)",
      "--sf-warning": "#d9a441",
      "--sf-warning-muted": "rgba(217, 164, 65, 0.14)",
      "--sf-error": "#d96a6a",
      "--sf-error-muted": "rgba(217, 106, 106, 0.14)",
      "--sf-info": "#6f9fd8",
      "--sf-info-muted": "rgba(111, 159, 216, 0.14)",
      "--sf-inactive": "#72787e",
      "--sf-inactive-muted": "rgba(114, 120, 126, 0.12)",
    });
  });

  test("loads Geist and defines its semantic font stacks", () => {
    expect(source).toContain('@import "@fontsource-variable/geist/wght.css";');
    expect(source).toContain(
      '@import "@fontsource-variable/geist-mono/wght.css";',
    );
    expect(tokens.get("--sf-font-sans")).toMatch(
      /^"Geist Variable", "Geist", "Geist Sans", system-ui,/u,
    );
    expect(tokens.get("--sf-font-mono")).toMatch(
      /^"Geist Mono Variable", "Geist Mono", ui-monospace,/u,
    );
    expect(source).toMatch(
      /:where\(\.sf-duration, \.sf-timecode, \.sf-measurement, \.sf-shortcut\)\s*\{\s*font-family: var\(--sf-font-mono\);\s*\}/u,
    );
    expect(source).not.toContain(".sf-font-mono");
  });

  test("defines comfortable spacing, shape, and motion", () => {
    expectTokenGroup(tokens, {
      "--sf-space-1": "4px",
      "--sf-space-2": "8px",
      "--sf-space-3": "12px",
      "--sf-space-4": "16px",
      "--sf-space-5": "20px",
      "--sf-space-6": "24px",
      "--sf-space-8": "32px",
      "--sf-space-10": "40px",
      "--sf-space-12": "48px",
      "--sf-space-16": "64px",
      "--sf-space-20": "80px",
      "--sf-radius-sm": "6px",
      "--sf-radius-md": "8px",
      "--sf-radius-lg": "12px",
      "--sf-radius-xl": "16px",
      "--sf-radius-round": "999px",
      "--sf-motion-instant": "80ms",
      "--sf-motion-fast": "140ms",
      "--sf-motion-standard": "220ms",
      "--sf-motion-slow": "320ms",
      "--sf-motion-emphasis": "420ms",
      "--sf-ease-standard": "cubic-bezier(0.2, 0, 0, 1)",
      "--sf-ease-enter": "cubic-bezier(0, 0, 0.2, 1)",
      "--sf-ease-exit": "cubic-bezier(0.4, 0, 1, 1)",
    });
  });

  test("exports the stylesheet and consumes it through the UI package", () => {
    const uiManifest = readManifest(
      path.join(REPOSITORY_ROOT, "packages/ui/package.json"),
    );
    const desktopManifest = readManifest(
      path.join(REPOSITORY_ROOT, "apps/desktop/package.json"),
    );
    const rendererEntry = fs.readFileSync(
      path.join(REPOSITORY_ROOT, "apps/desktop/src/renderer/renderer.tsx"),
      "utf8",
    );
    const rendererStyles = fs.readFileSync(
      path.join(REPOSITORY_ROOT, "apps/desktop/src/renderer/styles.css"),
      "utf8",
    );

    expect(uiManifest.exports).toMatchObject({
      "./tokens.css": "./src/tokens.css",
    });
    expect(uiManifest.dependencies).toMatchObject({
      "@fontsource-variable/geist": "5.3.0",
      "@fontsource-variable/geist-mono": "5.3.0",
    });
    expect(desktopManifest.dependencies).toMatchObject({
      "@showflow/ui": "workspace:*",
    });
    expect(rendererEntry).toContain('import "@showflow/ui/tokens.css";');
    expect(rendererStyles).not.toMatch(/#[\da-f]{3,8}|rgba?\(/iu);
    expect(rendererStyles).not.toContain("--foundation-");
  });
});
