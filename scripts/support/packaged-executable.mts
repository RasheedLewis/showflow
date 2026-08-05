import fs from "node:fs";
import path from "node:path";

export const getPackagedExecutablePath = (): string => {
  const packageDirectory = getPackageDirectory();
  const executablePath = resolvePackagedExecutablePath(packageDirectory);

  if (!fs.existsSync(executablePath)) {
    throw new Error(
      `The packaged Showflow executable is missing at ${executablePath}. Run pnpm build first.`,
    );
  }

  return executablePath;
};

export const getPackagedResourcesPath = (): string => {
  const packageDirectory = getPackageDirectory();
  const resourcesPath = resolvePackagedResourcesPath(packageDirectory);

  if (!fs.existsSync(resourcesPath)) {
    throw new Error(
      `The packaged Showflow resources are missing at ${resourcesPath}. Run pnpm build first.`,
    );
  }

  return resourcesPath;
};

const getPackageDirectory = (): string =>
  path.resolve(
    import.meta.dirname,
    "../../apps/desktop/out",
    `Showflow-${process.platform}-${process.arch}`,
  );

const resolvePackagedExecutablePath = (packageDirectory: string): string => {
  switch (process.platform) {
    case "darwin":
      return path.join(
        packageDirectory,
        "Showflow.app/Contents/MacOS/showflow",
      );
    case "linux":
      return path.join(packageDirectory, "showflow");
    case "win32":
      return path.join(packageDirectory, "showflow.exe");
    default:
      return throwUnsupportedPlatform();
  }
};

const resolvePackagedResourcesPath = (packageDirectory: string): string => {
  switch (process.platform) {
    case "darwin":
      return path.join(packageDirectory, "Showflow.app/Contents/Resources");
    case "linux":
    case "win32":
      return path.join(packageDirectory, "resources");
    default:
      return throwUnsupportedPlatform();
  }
};

const throwUnsupportedPlatform = (): never => {
  throw new Error(
    `Showflow does not define an Electron smoke target for ${process.platform}.`,
  );
};
