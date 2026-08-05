import fs from "node:fs";
import path from "node:path";

export const getPackagedExecutablePath = (): string => {
  const packageDirectory = path.resolve(
    import.meta.dirname,
    "../../apps/desktop/out",
    `Showflow-${process.platform}-${process.arch}`,
  );

  let executablePath: string;

  switch (process.platform) {
    case "darwin":
      executablePath = path.join(
        packageDirectory,
        "Showflow.app/Contents/MacOS/showflow",
      );
      break;
    case "linux":
      executablePath = path.join(packageDirectory, "showflow");
      break;
    case "win32":
      executablePath = path.join(packageDirectory, "showflow.exe");
      break;
    default:
      throw new Error(
        `Showflow does not define an Electron smoke target for ${process.platform}.`,
      );
  }

  if (!fs.existsSync(executablePath)) {
    throw new Error(
      `The packaged Showflow executable is missing at ${executablePath}. Run pnpm build first.`,
    );
  }

  return executablePath;
};
