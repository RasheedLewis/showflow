import fs from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..");
const TOKEN_FILE = path.join(REPOSITORY_ROOT, "packages/ui/src/tokens.css");

type StringRecord = Record<string, string>;

interface PackageManifest {
  readonly dependencies?: StringRecord;
  readonly devDependencies?: StringRecord;
  readonly exports?: StringRecord;
}

const readManifest = (filePath: string): PackageManifest =>
  JSON.parse(fs.readFileSync(filePath, "utf8")) as PackageManifest;

const parseTokens = (source: string): Map<string, string> => {
  const tokens = new Map<string, string>();
  const declaration = /(--sf-[a-z0-9-]+):\s*([^;]+);/gu;
  const rootStart = source.search(/:root\s*\{/u);
  const rootEnd = source.indexOf("}", rootStart);

  if (rootStart < 0 || rootEnd < 0) {
    throw new Error("The canonical :root token registry is missing.");
  }

  const rootSource = source.slice(rootStart, rootEnd);

  for (const match of rootSource.matchAll(declaration)) {
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

describe("semantic design token contract", () => {
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
    expect(source).toMatch(
      /:where\(\.sf-duration, \.sf-timecode\)\s*\{\s*font-size: var\(--sf-font-size-timecode\);\s*font-weight: var\(--sf-font-weight-timecode\);\s*line-height: var\(--sf-line-height-timecode\);\s*\}/u,
    );
    expect(source).not.toContain(".sf-font-mono");
  });

  test("defines the complete typography role scale", () => {
    expectTokenGroup(tokens, {
      "--sf-font-weight-regular": "400",
      "--sf-font-weight-medium": "500",
      "--sf-font-weight-semibold": "600",
      "--sf-font-weight-bold": "700",
      "--sf-font-size-display-xl": "48px",
      "--sf-line-height-display-xl": "56px",
      "--sf-font-weight-display-xl": "var(--sf-font-weight-semibold)",
      "--sf-font-size-display-lg": "40px",
      "--sf-line-height-display-lg": "48px",
      "--sf-font-weight-display-lg": "var(--sf-font-weight-semibold)",
      "--sf-font-size-heading-xl": "32px",
      "--sf-line-height-heading-xl": "40px",
      "--sf-font-weight-heading-xl": "var(--sf-font-weight-semibold)",
      "--sf-font-size-heading-lg": "28px",
      "--sf-line-height-heading-lg": "36px",
      "--sf-font-weight-heading-lg": "var(--sf-font-weight-semibold)",
      "--sf-font-size-heading-md": "24px",
      "--sf-line-height-heading-md": "32px",
      "--sf-font-weight-heading-md": "var(--sf-font-weight-semibold)",
      "--sf-font-size-heading-sm": "20px",
      "--sf-line-height-heading-sm": "28px",
      "--sf-font-weight-heading-sm": "var(--sf-font-weight-semibold)",
      "--sf-font-size-body-lg": "18px",
      "--sf-line-height-body-lg": "28px",
      "--sf-font-weight-body-lg": "var(--sf-font-weight-regular)",
      "--sf-font-size-body-md": "16px",
      "--sf-line-height-body-md": "24px",
      "--sf-font-weight-body-md": "var(--sf-font-weight-regular)",
      "--sf-font-size-body-sm": "14px",
      "--sf-line-height-body-sm": "20px",
      "--sf-font-weight-body-sm": "var(--sf-font-weight-regular)",
      "--sf-font-size-label-md": "14px",
      "--sf-line-height-label-md": "20px",
      "--sf-font-weight-label-md": "var(--sf-font-weight-medium)",
      "--sf-font-size-label-sm": "12px",
      "--sf-line-height-label-sm": "16px",
      "--sf-font-weight-label-sm": "var(--sf-font-weight-semibold)",
      "--sf-letter-spacing-label-sm": "0.08em",
      "--sf-font-size-timecode": "16px",
      "--sf-line-height-timecode": "20px",
      "--sf-font-weight-timecode": "var(--sf-font-weight-medium)",
    });
  });

  test("defines comfortable spacing, radius, and border geometry", () => {
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
      "--sf-border-width-default": "1px",
      "--sf-focus-ring-width": "2px",
      "--sf-focus-ring-offset": "2px",
      "--sf-control-height-sm": "36px",
      "--sf-control-height-md": "44px",
      "--sf-control-height-lg": "52px",
      "--sf-control-padding-sm": "12px",
      "--sf-control-padding-md": "16px",
      "--sf-control-padding-lg": "20px",
      "--sf-target-size-min": "44px",
      "--sf-status-height": "24px",
      "--sf-menu-item-height": "40px",
      "--sf-menu-min-width": "200px",
      "--sf-dialog-width-sm": "480px",
      "--sf-dialog-width-md": "600px",
      "--sf-drawer-width": "360px",
      "--sf-storyboard-card-width-min": "300px",
      "--sf-storyboard-card-width-max": "360px",
      "--sf-storyboard-card-metadata-min-height": "88px",
      "--sf-notes-min-height": "160px",
      "--sf-notes-readable-width": "720px",
      "--sf-shell-top-bar-height": "64px",
      "--sf-shell-catalog-width": "300px",
      "--sf-shell-inspector-width": "340px",
      "--sf-shell-notes-height-min": "180px",
      "--sf-shell-notes-height-max": "260px",
    });
  });

  test("defines elevation, motion, stacking, and breakpoint tokens", () => {
    expectTokenGroup(tokens, {
      "--sf-elevation-none": "none",
      "--sf-elevation-1": "0 1px 2px rgba(0, 0, 0, 0.24)",
      "--sf-elevation-2": "0 8px 24px rgba(0, 0, 0, 0.28)",
      "--sf-elevation-3": "0 20px 48px rgba(0, 0, 0, 0.38)",
      "--sf-motion-instant": "80ms",
      "--sf-motion-fast": "140ms",
      "--sf-motion-standard": "220ms",
      "--sf-motion-slow": "320ms",
      "--sf-motion-emphasis": "420ms",
      "--sf-motion-reduced": "1ms",
      "--sf-ease-standard": "cubic-bezier(0.2, 0, 0, 1)",
      "--sf-ease-enter": "cubic-bezier(0, 0, 0.2, 1)",
      "--sf-ease-exit": "cubic-bezier(0.4, 0, 1, 1)",
      "--sf-z-base": "0",
      "--sf-z-sticky": "100",
      "--sf-z-dropdown": "200",
      "--sf-z-scrim": "300",
      "--sf-z-drawer": "400",
      "--sf-z-dialog": "500",
      "--sf-z-toast": "600",
      "--sf-z-tooltip": "700",
      "--sf-breakpoint-desktop-comfortable": "1280px",
    });
  });

  test("exports the stylesheet and consumes it through the UI package", () => {
    const uiManifest = readManifest(
      path.join(REPOSITORY_ROOT, "packages/ui/package.json"),
    );
    const desktopManifest = readManifest(
      path.join(REPOSITORY_ROOT, "apps/desktop/package.json"),
    );
    const rootManifest = readManifest(
      path.join(REPOSITORY_ROOT, "package.json"),
    );
    const rendererEntry = fs.readFileSync(
      path.join(REPOSITORY_ROOT, "apps/desktop/src/renderer/renderer.tsx"),
      "utf8",
    );
    const rendererStyles = fs.readFileSync(
      path.join(REPOSITORY_ROOT, "apps/desktop/src/renderer/styles.css"),
      "utf8",
    );
    const foundationStyles = fs.readFileSync(
      path.join(REPOSITORY_ROOT, "packages/ui/src/foundations.module.css"),
      "utf8",
    );
    const productionStyles = fs.readFileSync(
      path.join(REPOSITORY_ROOT, "packages/ui/src/production.module.css"),
      "utf8",
    );
    const shellStyles = fs.readFileSync(
      path.join(
        REPOSITORY_ROOT,
        "packages/ui/src/application-shell.module.css",
      ),
      "utf8",
    );
    const galleryStyles = fs.readFileSync(
      path.join(
        REPOSITORY_ROOT,
        "apps/desktop/src/renderer/development/component-gallery.module.css",
      ),
      "utf8",
    );

    expect(uiManifest.exports).toMatchObject({
      "./tokens.css": "./src/tokens.css",
    });
    expect(uiManifest.dependencies).toMatchObject({
      "@fontsource-variable/geist": "5.3.0",
      "@fontsource-variable/geist-mono": "5.3.0",
      "@radix-ui/react-dialog": "1.1.23",
      "@radix-ui/react-dropdown-menu": "2.1.24",
      "@radix-ui/react-tabs": "1.1.21",
      "@radix-ui/react-tooltip": "1.2.16",
      "lucide-react": "1.28.0",
    });
    expect(desktopManifest.dependencies).toMatchObject({
      "@showflow/ui": "workspace:*",
      "react-router-dom": "7.18.2",
    });
    expect(rootManifest.devDependencies).toMatchObject({
      "@axe-core/playwright": "4.12.1",
    });
    expect(rendererEntry).toContain('import "@showflow/ui/tokens.css";');
    expect(rendererStyles).not.toMatch(/#[\da-f]{3,8}|rgba?\(/iu);
    expect(foundationStyles).not.toMatch(/#[\da-f]{3,8}|rgba?\(/iu);
    expect(productionStyles).not.toMatch(/#[\da-f]{3,8}|rgba?\(/iu);
    expect(shellStyles).not.toMatch(/#[\da-f]{3,8}|rgba?\(/iu);
    expect(galleryStyles).not.toMatch(/#[\da-f]{3,8}|rgba?\(/iu);
    expect(rendererStyles).not.toContain("--foundation-");
    expect(foundationStyles).not.toContain("--foundation-");
    expect(productionStyles).not.toContain("--foundation-");
    expect(shellStyles).not.toContain("--foundation-");
    expect(galleryStyles).not.toContain("--foundation-");

    const tokenReferences = [
      ...source.matchAll(/var\((--sf-[a-z0-9-]+)\)/gu),
      ...rendererStyles.matchAll(/var\((--sf-[a-z0-9-]+)\)/gu),
      ...foundationStyles.matchAll(/var\((--sf-[a-z0-9-]+)\)/gu),
      ...productionStyles.matchAll(/var\((--sf-[a-z0-9-]+)\)/gu),
      ...shellStyles.matchAll(/var\((--sf-[a-z0-9-]+)\)/gu),
      ...galleryStyles.matchAll(/var\((--sf-[a-z0-9-]+)\)/gu),
    ].map((match) => match[1]);

    for (const tokenName of tokenReferences) {
      expect(tokens.has(tokenName ?? ""), tokenName).toBe(true);
    }

    expect(rendererStyles).not.toMatch(
      /(?:font-size|font-weight|line-height|letter-spacing):\s*(?:\d|clamp\()/gu,
    );
  });

  test("centralizes the reduced-motion fallback without losing completion events", () => {
    const rendererStyles = fs.readFileSync(
      path.join(REPOSITORY_ROOT, "apps/desktop/src/renderer/styles.css"),
      "utf8",
    );
    const foundationStyles = fs.readFileSync(
      path.join(REPOSITORY_ROOT, "packages/ui/src/foundations.module.css"),
      "utf8",
    );
    const productionStyles = fs.readFileSync(
      path.join(REPOSITORY_ROOT, "packages/ui/src/production.module.css"),
      "utf8",
    );
    const shellStyles = fs.readFileSync(
      path.join(
        REPOSITORY_ROOT,
        "packages/ui/src/application-shell.module.css",
      ),
      "utf8",
    );

    expect(source).toContain("@media (prefers-reduced-motion: reduce)");
    expect(source).toContain("--sf-motion-reduced: 1ms");
    for (const duration of [
      "instant",
      "fast",
      "standard",
      "slow",
      "emphasis",
    ]) {
      expect(source).toContain(
        `--sf-motion-${duration}: var(--sf-motion-reduced)`,
      );
    }
    expect(source).toContain("scroll-behavior: auto !important");
    expect(rendererStyles).not.toContain(
      "@media (prefers-reduced-motion: reduce)",
    );

    expect(foundationStyles).toContain(
      "transition-duration: var(--sf-motion-reduced)",
    );
    expect(foundationStyles).toContain("transform: none");
    expect(foundationStyles).toContain("animation: none");
    expect(productionStyles).toContain(
      "transition-duration: var(--sf-motion-reduced)",
    );
    expect(productionStyles).toContain("transform: none");
    expect(shellStyles).toContain(
      "transition-duration: var(--sf-motion-reduced)",
    );
    expect(shellStyles).toContain("transition-property: opacity");
  });

  test("keeps foundational visual states semantic and icon imports isolated", () => {
    const foundationStyles = fs.readFileSync(
      path.join(REPOSITORY_ROOT, "packages/ui/src/foundations.module.css"),
      "utf8",
    );
    const productionStyles = fs.readFileSync(
      path.join(REPOSITORY_ROOT, "packages/ui/src/production.module.css"),
      "utf8",
    );
    const shellStyles = fs.readFileSync(
      path.join(
        REPOSITORY_ROOT,
        "packages/ui/src/application-shell.module.css",
      ),
      "utf8",
    );
    const uiSourceDirectory = path.join(REPOSITORY_ROOT, "packages/ui/src");
    const directIconImports = fs
      .readdirSync(uiSourceDirectory)
      .filter((fileName) => fileName.endsWith(".tsx"))
      .filter((fileName) =>
        fs
          .readFileSync(path.join(uiSourceDirectory, fileName), "utf8")
          .includes('from "lucide-react"'),
      );

    expect(foundationStyles).toContain(":hover:not(:disabled)");
    expect(foundationStyles).toContain(":focus-visible");
    expect(foundationStyles).toContain(
      "max(var(--sf-control-height-sm), var(--sf-target-size-min))",
    );
    expect(foundationStyles).toContain(
      "max(var(--sf-menu-item-height), var(--sf-target-size-min))",
    );
    expect(foundationStyles).toContain("min-width: var(--sf-target-size-min)");
    expect(foundationStyles).toContain(":disabled");
    expect(foundationStyles).toContain(".inputError");
    expect(foundationStyles).toContain('[data-state="active"]');
    expect(foundationStyles).toContain("[data-highlighted]");
    expect(productionStyles).toContain(':hover:not([aria-disabled="true"])');
    expect(productionStyles).toContain(":focus-within");
    expect(productionStyles).toContain('[data-selected="true"]');
    expect(productionStyles).toContain('[data-dragging="true"]');
    expect(productionStyles).toContain('[data-invalid="true"]');
    expect(productionStyles).toContain('[data-archived="true"]');
    expect(productionStyles).toContain('[data-current="true"]');
    expect(shellStyles).toContain("height: var(--sf-shell-top-bar-height)");
    expect(shellStyles).toContain("height: 100vh");
    expect(shellStyles).toContain("@media (max-width: 1279px)");
    expect(shellStyles).not.toContain("@media (max-width: 1023px)");
    expect(shellStyles).toContain("grid-area: main");
    expect(shellStyles).toContain("grid-area: notes");
    expect(shellStyles).toContain(".skipLink:focus-visible");
    expect(shellStyles).toContain(".panelScrim:focus-visible");
    expect(directIconImports).toEqual(["icon.tsx"]);
  });
});
