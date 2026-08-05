import assert from "node:assert/strict";
import fs from "node:fs";
import { builtinModules } from "node:module";
import path from "node:path";
import test from "node:test";

import ts from "typescript";

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..");
const PACKAGES_ROOT = path.join(REPOSITORY_ROOT, "packages");
const DESKTOP_SOURCE_ROOT = path.join(
  REPOSITORY_ROOT,
  "apps",
  "desktop",
  "src",
);

const PACKAGE_NAMES = [
  "application",
  "contracts",
  "domain",
  "execution-contracts",
  "persistence",
  "resources",
  "test-fixtures",
  "ui",
] as const;

type PackageName = (typeof PACKAGE_NAMES)[number];
type SourceLayer = PackageName | "desktop-main" | "desktop-preload" | "renderer";

interface PackageManifest {
  readonly name: string;
  readonly exports?: Readonly<Record<string, string>>;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
}

const ALLOWED_INTERNAL_IMPORTS: Readonly<
  Record<SourceLayer, ReadonlySet<PackageName>>
> = {
  domain: new Set(),
  application: new Set(["domain"]),
  contracts: new Set(["domain"]),
  persistence: new Set(["application", "domain"]),
  resources: new Set(["application", "domain"]),
  "execution-contracts": new Set(["domain"]),
  ui: new Set(["contracts", "domain"]),
  "test-fixtures": new Set([
    "application",
    "contracts",
    "domain",
    "execution-contracts",
  ]),
  "desktop-main": new Set([
    "application",
    "contracts",
    "domain",
    "execution-contracts",
    "persistence",
    "resources",
  ]),
  "desktop-preload": new Set(["contracts"]),
  renderer: new Set(["contracts", "domain", "execution-contracts", "ui"]),
};

const NODE_BUILTINS = new Set(
  builtinModules.flatMap((moduleName) => [moduleName, `node:${moduleName}`]),
);
const PURE_LAYERS = new Set<SourceLayer>([
  "application",
  "contracts",
  "domain",
  "execution-contracts",
  "resources",
  "test-fixtures",
]);
const SOURCE_EXTENSION = /\.(?:cts|mts|ts|tsx)$/u;
const TEST_FILE = /\.(?:spec|test)\.(?:cts|mts|ts|tsx)$/u;

const readManifest = (packageName: PackageName): PackageManifest =>
  JSON.parse(
    fs.readFileSync(
      path.join(PACKAGES_ROOT, packageName, "package.json"),
      "utf8",
    ),
  ) as PackageManifest;

const getSourceFiles = (directory: string): string[] => {
  const files: string[] = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...getSourceFiles(entryPath));
    } else if (
      SOURCE_EXTENSION.test(entry.name) &&
      !TEST_FILE.test(entry.name)
    ) {
      files.push(entryPath);
    }
  }

  return files.sort();
};

const getImportSpecifiers = (filePath: string): string[] => {
  const sourceText = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const specifiers: string[] = [];

  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      specifiers.push(node.moduleReference.expression.text);
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length > 0 &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      specifiers.push(node.arguments[0].text);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return specifiers;
};

const getShowflowPackageName = (specifier: string): PackageName | undefined => {
  if (!specifier.startsWith("@showflow/")) {
    return undefined;
  }

  const packageName = specifier.slice("@showflow/".length).split("/")[0];

  return PACKAGE_NAMES.find((candidate) => candidate === packageName);
};

const isReactImport = (specifier: string): boolean =>
  specifier === "react" ||
  specifier === "react-dom" ||
  specifier.startsWith("react/") ||
  specifier.startsWith("react-dom/");

const isSqliteImport = (specifier: string): boolean =>
  specifier.toLowerCase().includes("sqlite");

const getForbiddenExternalReason = (
  layer: SourceLayer,
  specifier: string,
): string | undefined => {
  if (layer === "renderer") {
    if (specifier === "electron") {
      return "renderer code must not import Electron";
    }

    if (NODE_BUILTINS.has(specifier)) {
      return "renderer code must not import Node APIs";
    }
  }

  if (layer === "desktop-preload" && NODE_BUILTINS.has(specifier)) {
    return "preload must not expose or depend on Node APIs";
  }

  if (PURE_LAYERS.has(layer)) {
    if (specifier === "electron") {
      return `${layer} must remain independent of Electron`;
    }

    if (NODE_BUILTINS.has(specifier)) {
      return `${layer} must remain independent of Node APIs`;
    }

    if (isReactImport(specifier)) {
      return `${layer} must remain independent of React`;
    }

    if (isSqliteImport(specifier)) {
      return `${layer} must remain independent of SQLite adapters`;
    }
  }

  if (layer === "persistence" && (specifier === "electron" || isReactImport(specifier))) {
    return "persistence must remain independent of Electron and React";
  }

  if (layer === "ui" && (specifier === "electron" || NODE_BUILTINS.has(specifier))) {
    return "shared UI must remain independent of Electron and Node APIs";
  }

  if (
    layer === "execution-contracts" &&
    (specifier === "obs-websocket-js" || specifier.startsWith("@obs/"))
  ) {
    return "execution contracts must remain engine-neutral";
  }

  return undefined;
};

const getLayerRoot = (layer: SourceLayer): string => {
  if (PACKAGE_NAMES.includes(layer as PackageName)) {
    return path.join(PACKAGES_ROOT, layer, "src");
  }

  const processDirectory =
    layer === "desktop-main"
      ? "main"
      : layer === "desktop-preload"
        ? "preload"
        : "renderer";

  return path.join(DESKTOP_SOURCE_ROOT, processDirectory);
};

const getLayerFiles = (layer: SourceLayer): string[] =>
  getSourceFiles(getLayerRoot(layer));

test("every workspace package exposes an explicit source entry point", () => {
  const violations: string[] = [];

  for (const packageName of PACKAGE_NAMES) {
    const manifest = readManifest(packageName);
    const expectedName = `@showflow/${packageName}`;
    const expectedExport = "./src/index.ts";

    if (manifest.name !== expectedName) {
      violations.push(`${packageName} must be named ${expectedName}`);
    }

    if (manifest.exports?.["."] !== expectedExport) {
      violations.push(`${expectedName} must export ${expectedExport}`);
    }

    if (!fs.existsSync(path.join(PACKAGES_ROOT, packageName, "src", "index.ts"))) {
      violations.push(`${expectedName} is missing src/index.ts`);
    }
  }

  assert.deepEqual(violations, [], violations.join("\n"));
});

test("source imports respect package and Electron process boundaries", () => {
  const violations: string[] = [];
  const layers = [
    ...PACKAGE_NAMES,
    "desktop-main",
    "desktop-preload",
    "renderer",
  ] as const;
  const desktopManifest = JSON.parse(
    fs.readFileSync(
      path.join(REPOSITORY_ROOT, "apps", "desktop", "package.json"),
      "utf8",
    ),
  ) as PackageManifest;

  for (const layer of layers) {
    const layerRoot = getLayerRoot(layer);
    const manifest = PACKAGE_NAMES.includes(layer as PackageName)
      ? readManifest(layer as PackageName)
      : desktopManifest;
    const declaredDependencies = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.optionalDependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ]);

    for (const filePath of getLayerFiles(layer)) {
      const relativeFile = path.relative(REPOSITORY_ROOT, filePath);
      const sourceText = fs.readFileSync(filePath, "utf8");

      if (layer === "renderer" && /\bipcRenderer\b/u.test(sourceText)) {
        violations.push(`${relativeFile}: renderer must not reference ipcRenderer`);
      }

      for (const specifier of getImportSpecifiers(filePath)) {
        if (specifier.startsWith(".")) {
          const target = path.resolve(path.dirname(filePath), specifier);
          const relativeTarget = path.relative(layerRoot, target);

          if (
            relativeTarget === ".." ||
            relativeTarget.startsWith(`..${path.sep}`)
          ) {
            violations.push(
              `${relativeFile}: relative import ${specifier} crosses its ${layer} boundary`,
            );
          }

          continue;
        }

        const internalPackage = getShowflowPackageName(specifier);

        if (internalPackage) {
          if (specifier !== `@showflow/${internalPackage}`) {
            violations.push(
              `${relativeFile}: ${specifier} bypasses the package's public entry point`,
            );
          }

          if (!ALLOWED_INTERNAL_IMPORTS[layer].has(internalPackage)) {
            violations.push(
              `${relativeFile}: ${layer} must not import @showflow/${internalPackage}`,
            );
          }

          if (!declaredDependencies.has(`@showflow/${internalPackage}`)) {
            violations.push(
              `${relativeFile}: @showflow/${internalPackage} is not declared in its package manifest`,
            );
          }

          continue;
        }

        if (specifier.startsWith("@showflow/")) {
          violations.push(`${relativeFile}: ${specifier} is not a known package`);
          continue;
        }

        const forbiddenReason = getForbiddenExternalReason(layer, specifier);
        if (forbiddenReason) {
          violations.push(`${relativeFile}: ${forbiddenReason} (${specifier})`);
        }
      }
    }
  }

  assert.deepEqual(violations, [], violations.join("\n"));
});

test("workspace package dependencies are acyclic and follow the inward graph", () => {
  const graph = new Map<PackageName, PackageName[]>();
  const violations: string[] = [];

  for (const packageName of PACKAGE_NAMES) {
    const manifest = readManifest(packageName);
    const internalDependencies = Object.keys(manifest.dependencies ?? {})
      .map(getShowflowPackageName)
      .filter((dependency): dependency is PackageName => dependency !== undefined);

    graph.set(packageName, internalDependencies);

    for (const dependency of internalDependencies) {
      if (!ALLOWED_INTERNAL_IMPORTS[packageName].has(dependency)) {
        violations.push(
          `@showflow/${packageName} must not depend on @showflow/${dependency}`,
        );
      }
    }
  }

  const visited = new Set<PackageName>();
  const active = new Set<PackageName>();

  const visit = (packageName: PackageName, trail: PackageName[]): void => {
    if (active.has(packageName)) {
      violations.push(
        `workspace dependency cycle: ${[...trail, packageName].join(" -> ")}`,
      );
      return;
    }

    if (visited.has(packageName)) {
      return;
    }

    active.add(packageName);
    for (const dependency of graph.get(packageName) ?? []) {
      visit(dependency, [...trail, packageName]);
    }
    active.delete(packageName);
    visited.add(packageName);
  };

  for (const packageName of PACKAGE_NAMES) {
    visit(packageName, []);
  }

  assert.deepEqual(violations, [], violations.join("\n"));
});
